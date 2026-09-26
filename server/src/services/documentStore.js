const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { MIME_TYPES } = require('./fileParser');

function createDocumentStore({ supabase = null, dataDir = path.join(__dirname, '../data'), storageDir = path.join(__dirname, '../../uploads/documents'), bucket = process.env.SUPABASE_DOCUMENT_BUCKET || 'documents', now = () => new Date() } = {}) {
  const dataPath = path.join(dataDir, 'documents.json');
  function read() {
    if (!fs.existsSync(dataPath)) return [];
    const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    if (!Array.isArray(rows)) throw new Error('문서 저장 파일이 올바르지 않습니다.');
    return rows;
  }
  function write(rows) {
    fs.mkdirSync(dataDir, { recursive: true });
    const temp = dataPath + '.' + randomUUID() + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(rows, null, 2), 'utf8');
    fs.renameSync(temp, dataPath);
  }
  async function result(query) {
    const { data, error } = await query;
    if (error) throw new Error('문서 DB 처리 실패: ' + error.message);
    return data;
  }
  function localPath(key) {
    if (!/^[a-f0-9-]{36}\.(pdf|docx|pptx|xlsx)$/.test(key)) throw new Error('원본 파일 경로가 올바르지 않습니다.');
    return path.join(storageDir, key);
  }
  return {
    mode: supabase ? 'supabase' : 'local',
    async list() {
      if (supabase) return result(supabase.from('documents').select('id,title,file_name,file_url,file_type,file_size,status,error_message,attempts,created_at,updated_at,storage_path').order('created_at', { ascending: false }));
      return read().sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async get(id) {
      if (supabase) return result(supabase.from('documents').select('*').eq('id', id).maybeSingle());
      return read().find(row => row.id === id) || null;
    },
    async insert(doc) {
      if (supabase) return result(supabase.from('documents').insert(doc).select().single());
      const rows = read();
      if (rows.some(row => row.id === doc.id)) throw new Error('이미 등록된 문서입니다.');
      rows.unshift(doc); write(rows); return doc;
    },
    async update(id, patch, leaseToken) {
      const changes = { ...patch, updated_at: now().toISOString() };
      if (supabase) {
        let query = supabase.from('documents').update(changes).eq('id', id);
        if (leaseToken) query = query.eq('lease_token', leaseToken);
        const doc = await result(query.select().maybeSingle());
        if (!doc) throw new Error('문서 처리 권한이 만료되었거나 문서가 없습니다.');
        return doc;
      }
      const rows = read();
      const index = rows.findIndex(row => row.id === id && (!leaseToken || row.lease_token === leaseToken));
      if (index < 0) throw new Error('문서 처리 권한이 만료되었거나 문서가 없습니다.');
      rows[index] = { ...rows[index], ...changes }; write(rows); return rows[index];
    },
    async claim() {
      const token = randomUUID();
      if (supabase) {
        const docs = await result(supabase.rpc('claim_document_processing', { worker_token: token }));
        return docs?.[0] || null;
      }
      const time = now().getTime();
      const rows = read();
      const doc = rows.filter(row => row.storage_path && (
        (row.status === 'queued' && new Date(row.next_attempt_at || 0).getTime() <= time) ||
        (['extracting', 'summarizing'].includes(row.status) && new Date(row.lease_until || 0).getTime() <= time)
      )).sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      if (!doc) return null;
      Object.assign(doc, { status: doc.extracted_text ? 'summarizing' : 'extracting', lease_token: token, lease_until: new Date(time + 180000).toISOString(), attempts: (doc.attempts || 0) + 1, updated_at: now().toISOString() });
      write(rows); return doc;
    },
    async retry(id) {
      const patch = { status: 'queued', attempts: 0, error_message: null, next_attempt_at: now().toISOString(), lease_token: null, lease_until: null };
      if (supabase) {
        const doc = await result(supabase.from('documents').update(patch).eq('id', id).eq('status', 'failed').select().maybeSingle());
        if (!doc) throw Object.assign(new Error('실패한 문서만 재시도할 수 있습니다.'), { status: 409 });
        return doc;
      }
      const rows = read();
      const doc = rows.find(row => row.id === id && row.status === 'failed');
      if (!doc) throw Object.assign(new Error('실패한 문서만 재시도할 수 있습니다.'), { status: 409 });
      Object.assign(doc, patch); write(rows); return doc;
    },
    async remove(id) {
      const current = await this.get(id);
      if (!current) throw Object.assign(new Error('문서를 찾을 수 없습니다.'), { status: 404 });
      if (['extracting', 'summarizing'].includes(current.status)) {
        throw Object.assign(new Error('분석 중인 문서는 처리가 끝난 뒤 삭제해 주세요.'), { status: 409 });
      }
      const token = randomUUID();
      const patch = { status: 'deleting', lease_token: token, lease_until: null };
      // Atomically prevent the worker from claiming a queued document during deletion.
      if (supabase) {
        let query = supabase.from('documents').update(patch).eq('id', id);
        query = current.status == null ? query.is('status', null) : query.eq('status', current.status);
        const locked = await result(query.select('id').maybeSingle());
        if (!locked) throw Object.assign(new Error('문서 상태가 변경되었습니다. 새로고침 후 다시 시도하세요.'), { status: 409 });
      } else {
        const rows = read();
        const row = rows.find(item => item.id === id && item.status === current.status);
        if (!row) throw Object.assign(new Error('문서 상태가 변경되었습니다. 다시 시도하세요.'), { status: 409 });
        Object.assign(row, patch); write(rows);
      }
      try {
        if (current.storage_path) await this.removeOriginal(current.storage_path);
      } catch (error) {
        await this.update(id, { status: current.status || 'legacy', lease_token: null }, token);
        throw error;
      }
      // If DB deletion fails, keep 'deleting' so another request can finish cleanup.
      if (supabase) await result(supabase.from('documents').delete().eq('id', id).eq('lease_token', token));
      else write(read().filter(row => !(row.id === id && row.lease_token === token)));
    },
    async saveOriginal(key, buffer, type) {
      if (supabase) {
        await result(supabase.storage.from(bucket).upload(key, buffer, { contentType: MIME_TYPES[type], upsert: false }));
      } else {
        fs.mkdirSync(storageDir, { recursive: true });
        await fs.promises.writeFile(localPath(key), buffer, { flag: 'wx' });
      }
    },
    async removeOriginal(key) {
      if (supabase) await result(supabase.storage.from(bucket).remove([key]));
      else await fs.promises.unlink(localPath(key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    },
    async readOriginal(doc) {
      if (!doc.storage_path) throw Object.assign(new Error('이전 문서에는 저장된 원본이 없습니다. 다시 업로드하세요.'), { status: 404 });
      if (supabase) {
        const blob = await result(supabase.storage.from(bucket).download(doc.storage_path));
        return Buffer.from(await blob.arrayBuffer());
      }
      return fs.promises.readFile(localPath(doc.storage_path));
    },
    async downloadUrl(doc) {
      if (!supabase) return null;
      const data = await result(supabase.storage.from(bucket).createSignedUrl(doc.storage_path, 60, { download: doc.file_name }));
      return data.signedUrl;
    },
  };
}
module.exports = { createDocumentStore };
