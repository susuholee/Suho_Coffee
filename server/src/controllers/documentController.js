const path = require('path');
const { randomUUID } = require('crypto');
const { supabase } = require('../config/supabase');
const { validateDocument, MIME_TYPES } = require('../services/fileParser');
const { createDocumentStore } = require('../services/documentStore');
const { createDocumentPipeline } = require('../services/documentPipeline');

function publicDocument(doc, detail = false) {
  const { lease_token, lease_until, storage_path, next_attempt_at, ...safe } = doc;
  safe.has_original = Boolean(storage_path);
  if (!detail) {
    delete safe.extracted_text;
    delete safe.extracted_sections;
    delete safe.summary;
  }
  return safe;
}
function createDocumentController({ store }) {
  async function get(id) {
    const doc = await store.get(id);
    if (!doc) throw Object.assign(new Error('문서를 찾을 수 없습니다.'), { status: 404 });
    return doc;
  }
  return {
    async uploadDocument(req, res, next) {
      let key, persisted = false;
      try {
        if (!req.file) throw Object.assign(new Error('업로드할 파일을 선택해 주세요.'), { status: 400 });
        // Multer decodes multipart filenames as Latin-1; recover valid UTF-8 names.
        const rawName = req.file.originalname;
        const decoded = Buffer.from(rawName, 'latin1').toString('utf8');
        const name = path.basename(/[^\u0000-\u00ff]/.test(rawName) || decoded.includes('\ufffd') ? rawName : decoded);
        const type = await validateDocument(req.file.buffer, name);
        const title = String(req.body.title || name).trim();
        if (!title || title.length > 255 || name.length > 255) throw Object.assign(new Error('문서 제목과 파일명은 255자 이하여야 합니다.'), { status: 400 });
        const id = randomUUID();
        key = id + '.' + type;
        await store.saveOriginal(key, req.file.buffer, type);
        persisted = true;
        const time = new Date().toISOString();
        const doc = await store.insert({
          id, title, file_name: name, file_url: '/api/documents/' + id + '/download', file_type: type,
          file_size: req.file.size, storage_path: key, uploaded_by: req.user?.id || null,
          status: 'queued', extracted_text: null, extracted_sections: [], summary: null, error_message: null,
          attempts: 0, next_attempt_at: time, lease_token: null, lease_until: null,
          created_at: time, updated_at: time, completed_at: null,
        });
        return res.status(202).json({ success: true, message: '업로드가 완료되었습니다. 문서를 분석하고 있어요.', document: publicDocument(doc, true) });
      } catch (error) {
        if (persisted) await store.removeOriginal(key).catch(() => {});
        next(error);
      }
    },
    async getDocuments(req, res, next) {
      try { res.json({ success: true, documents: (await store.list()).map(doc => publicDocument(doc)), mode: store.mode }); }
      catch (error) { next(error); }
    },
    async getDocumentById(req, res, next) {
      try { res.json({ success: true, document: publicDocument(await get(req.params.id), true) }); }
      catch (error) { next(error); }
    },
    async renameDocument(req, res, next) {
      try {
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        if (!title || title.length > 255) throw Object.assign(new Error('문서 제목은 1~255자로 입력해 주세요.'), { status: 400 });
        const existing = await get(req.params.id);
        if (existing.status === 'deleting') throw Object.assign(new Error('삭제 중인 문서는 수정할 수 없습니다.'), { status: 409 });
        const doc = await store.update(existing.id, { title });
        res.json({ success: true, document: publicDocument(doc, true), message: '문서 제목을 수정했습니다.' });
      } catch (error) { next(error); }
    },
    async deleteDocument(req, res, next) {
      try {
        await store.remove(req.params.id);
        res.json({ success: true, message: '문서와 원본 파일을 삭제했습니다.' });
      } catch (error) { next(error); }
    },
    async retryDocument(req, res, next) {
      try {
        const doc = await get(req.params.id);
        if (!doc.storage_path) throw Object.assign(new Error('저장된 원본이 없습니다. 다시 업로드하세요.'), { status: 400 });
        const queued = await store.retry(doc.id);
        res.status(202).json({ success: true, document: publicDocument(queued), message: '문서 분석을 다시 시작합니다.' });
      } catch (error) { next(error); }
    },
    async downloadDocument(req, res, next) {
      try {
        const doc = await get(req.params.id);
        if (!doc.storage_path) throw Object.assign(new Error('저장된 원본이 없습니다. 다시 업로드하세요.'), { status: 404 });
        const url = await store.downloadUrl(doc);
        if (url) return res.redirect(url);
        const buffer = await store.readOriginal(doc);
        res.set('Content-Type', MIME_TYPES[doc.file_type]);
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'private, no-store');
        res.attachment(doc.file_name);
        res.send(buffer);
      } catch (error) { next(error); }
    },
  };
}
const store = createDocumentStore({ supabase });
const pipeline = createDocumentPipeline({ store });
module.exports = {
  ...createDocumentController({ store }),
  createDocumentController,
  startDocumentWorker: () => { if (process.env.DOCUMENT_WORKER_ENABLED !== 'false') pipeline.start(); },
};
