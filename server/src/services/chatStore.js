const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { supabase } = require('../config/supabase');
const file = path.join(__dirname, '../data/chat_sessions.json');
function read() { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; }
function write(rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.' + randomUUID() + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(rows, null, 2));
  fs.renameSync(temporary, file);
}
async function query(request) {
  const { data, error } = await request;
  if (error) {
    // Expose only known error codes, never raw DB details or connection credentials.
    const code = String(error.code || '');
    let message = '상담 DB에 연결하지 못했습니다. Supabase 프로젝트 상태와 서버 네트워크를 확인하세요.';
    let category = 'CHAT_DATABASE_UNAVAILABLE';
    if (['42703', '42P01', '42883', 'PGRST200', 'PGRST202', 'PGRST204', 'PGRST205'].includes(code)) {
      category = 'CHAT_SCHEMA_REQUIRED';
      message = '상담 DB 테이블·컬럼 또는 함수 설정이 누락되었습니다. Supabase SQL Editor에서 supabase/migrations/20261011_ai_chat.sql을 적용하세요. 이미 적용했다면 스키마 캐시를 갱신하세요.';
    } else if (['42501', 'PGRST301', 'PGRST302', 'PGRST303'].includes(code)) {
      category = 'CHAT_DATABASE_PERMISSION';
      message = '상담 DB 접근 권한이 없습니다. 서버의 SUPABASE_SERVICE_ROLE_KEY 설정과 AI 상담 SQL의 권한 설정을 확인하세요.';
    } else if (['23502', '23503', '23505', '23514', '22P02'].includes(code)) {
      category = 'CHAT_DATABASE_CONSTRAINT';
      message = '상담 기록을 저장할 수 없습니다. 상담 DB 구조와 사용자 정보의 일치 여부를 확인하세요.';
    }
    const databaseCode = /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(code) ? code : undefined;
    console.warn('[상담 DB]', category, databaseCode || 'UNKNOWN');
    throw Object.assign(new Error(message), { status: 503, code: category, databaseCode });
  }
  return data;
}
function fromRow(row) {
  if (!row) return null;
  const { transcript, processing_token, processing_until, ...session } = row;
  session.messages = transcript || row.messages || [];
  session.summary = row.summary || (row.summary_core ? { inquiry: row.summary_core, actionTaken: row.summary_action || '', followUp: row.summary_followup || '', needsEscalation: row.status === 'escalated' } : null);
  return session;
}
async function list(user) {
  if (supabase) {
    let request = supabase.from('chat_sessions').select('id,user_id,customer_name,title,status,summary,created_at,updated_at').order('updated_at', { ascending: false }).limit(200);
    if (user.role !== 'admin') request = request.eq('user_id', user.id);
    return query(request);
  }
  return read().filter(s => user.role === 'admin' || s.user_id === user.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(({ messages, processing_token, processing_until, ...s }) => s);
}
async function get(id) {
  return fromRow(supabase ? await query(supabase.from('chat_sessions').select('*').eq('id', id).maybeSingle()) : read().find(s => s.id === id));
}
async function create(user, customerName) {
  const time = new Date().toISOString();
  const session = { id: randomUUID(), user_id: user.id, title: '새 상담', customer_name: customerName || user.name, status: 'active', summary: null, created_at: time, updated_at: time,
    messages: [{ id: randomUUID(), sender: 'ai', text: '안녕하세요, 수호봇입니다. 궁금한 내용을 남겨주시면 등록된 매뉴얼과 FAQ를 찾아 안내해 드릴게요.', source_docs: [], created_at: time }] };
  if (supabase) {
    const { messages, ...row } = session;
    await query(supabase.from('chat_sessions').insert({ ...row, transcript: messages }));
  } else { const rows = read(); rows.unshift(session); write(rows); }
  return session;
}
async function acquire(id, token) {
  if (supabase) return query(supabase.rpc('claim_chat_session', { session_id: id, worker_token: token }));
  const rows = read(), row = rows.find(s => s.id === id);
  if (!row || (row.processing_token && new Date(row.processing_until).getTime() > Date.now())) return false;
  Object.assign(row, { processing_token: token, processing_until: new Date(Date.now() + 180000).toISOString() });
  write(rows); return true;
}
async function renew(id, token) {
  if (supabase) return query(supabase.from('chat_sessions').update({ processing_until: new Date(Date.now() + 180000).toISOString() }).eq('id', id).eq('processing_token', token));
  const rows = read(), row = rows.find(s => s.id === id && s.processing_token === token);
  if (row) { row.processing_until = new Date(Date.now() + 180000).toISOString(); write(rows); }
}
async function save(session, token) {
  const updated_at = new Date().toISOString();
  if (supabase) {
    const data = await query(supabase.from('chat_sessions').update({
      title: session.title, status: session.status, transcript: session.messages, summary: session.summary, updated_at,
      summary_core: session.summary?.inquiry || null, summary_action: session.summary?.actionTaken || null, summary_followup: session.summary?.followUp || null,
    }).eq('id', session.id).eq('processing_token', token).select('id').maybeSingle());
    if (!data) throw Object.assign(new Error('상담 처리 시간이 만료되었습니다. 다시 불러와 주세요.'), { status: 409 });
  } else {
    const rows = read(), index = rows.findIndex(s => s.id === session.id && s.processing_token === token);
    if (index < 0) throw Object.assign(new Error('상담 처리 시간이 만료되었습니다.'), { status: 409 });
    rows[index] = { ...rows[index], ...session, updated_at }; write(rows);
  }
  session.updated_at = updated_at;
}
async function release(id, token) {
  if (supabase) return query(supabase.from('chat_sessions').update({ processing_token: null, processing_until: null }).eq('id', id).eq('processing_token', token));
  const rows = read(), row = rows.find(s => s.id === id && s.processing_token === token);
  if (row) { row.processing_token = null; row.processing_until = null; write(rows); }
}
async function remove(id, token) {
  if (supabase) await query(supabase.from('chat_sessions').delete().eq('id', id).eq('processing_token', token));
  else write(read().filter(s => !(s.id === id && s.processing_token === token)));
}
module.exports = { list, get, create, acquire, save, release, renew, remove };
