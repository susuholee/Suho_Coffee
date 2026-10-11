const axios = require('axios');
const { withGeminiRetry } = require('./geminiRetry');
const { randomUUID } = require('crypto');
const { supabase } = require('../config/supabase');

const embeddingModel = () => process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const unavailable = message => Object.assign(new Error(message), { status: 503 });
function requireDatabase() {
  if (!supabase) throw unavailable('문서 지식 검색을 사용하려면 Supabase 연결이 필요합니다.');
}
async function db(query) {
  const { data, error } = await query;
  if (error) throw unavailable('AI 상담 DB 설정이 필요하거나 연결에 실패했습니다. 20261011_ai_chat.sql 적용 여부를 확인하세요.');
  return data;
}
function providerError(error) {
  const status = error.response?.status || error.status;
  if (Number(status) === 503) return unavailable('AI 서버에 요청이 몰려 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
  if (status === 429) return unavailable('AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도하세요.');
  if (status === 404) return unavailable('설정한 AI 모델을 사용할 수 없습니다. 서버 모델 설정을 확인하세요.');
  if (status === 400 || status === 401 || status === 403) return unavailable('AI API 키 또는 모델 요청 설정을 확인하세요.');
  return unavailable('AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도하세요.');
}
async function embedTexts(texts, taskType) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || /your[-_]/i.test(key)) throw unavailable('Gemini API 키 설정이 필요합니다.');
  const model = embeddingModel();
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw unavailable('임베딩 모델 이름이 올바르지 않습니다.');
  try {
    const { data } = await withGeminiRetry(() => axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, {
      requests: texts.map(text => ({ model: 'models/' + model, content: { parts: [{ text }] }, taskType, outputDimensionality: 768 })),
    }, { headers: { 'x-goog-api-key': key }, timeout: 60000 }));
    if (data.embeddings?.length !== texts.length) throw new Error('Invalid embeddings');
    return data.embeddings.map(({ values }) => {
      if (values?.length !== 768 || !values.every(Number.isFinite)) throw new Error('Invalid vector');
      const norm = Math.hypot(...values);
      if (!norm) throw new Error('Zero vector');
      return values.map(value => value / norm);
    });
  } catch (error) { throw providerError(error); }
}
function chunkDocument(doc) {
  const sections = doc.sections?.length ? doc.sections : [{ kind: 'text', number: 1, text: doc.text }];
  const chunks = [];
  for (const section of sections) {
    const content = section.text || '';
    for (let offset = 0; offset < content.length; offset += 1000) {
      const text = content.slice(offset, offset + 1200).trim();
      if (!text) continue;
      chunks.push({ index: chunks.length, content: text, metadata: { kind: section.kind, number: section.number, name: section.name || null } });
      if (chunks.length > 1500) throw unavailable('문서 조각이 1,500개를 초과합니다. 문서를 나눠 등록하세요.');
      if (offset + 1200 >= content.length) break;
    }
  }
  return chunks;
}
let busy = false, interval, lastWorkerError = null;
async function indexNext() {
  if (busy || !supabase) return;
  busy = true;
  const token = randomUUID();
  let doc, heartbeat;
  try {
    doc = await db(supabase.rpc('claim_knowledge_job', { worker_token: token }));
    if (!doc) return;
    heartbeat = setInterval(() => {
      supabase.from('knowledge_jobs').update({ lock_until: new Date(Date.now() + 180000).toISOString() })
        .eq('document_id', doc.id).eq('lock_token', token).then(() => {}, () => {});
    }, 30000);
    const chunks = chunkDocument(doc);
    if (!chunks.length) throw unavailable('문서에 검색할 본문이 없습니다.');
    for (let offset = 0; offset < chunks.length; offset += 16) {
      const batch = chunks.slice(offset, offset + 16);
      const vectors = await embedTexts(batch.map(chunk => doc.title + '\n' + chunk.content), 'RETRIEVAL_DOCUMENT');
      batch.forEach((chunk, i) => { chunk.embedding = vectors[i]; });
    }
    await db(supabase.rpc('finish_knowledge_job', { doc_id: doc.id, worker_token: token, embedding_model: embeddingModel(), chunks }));
    lastWorkerError = null;
  } catch (error) {
    lastWorkerError = error.message;
    if (doc) await supabase.from('knowledge_jobs').update({ status: 'failed', error_message: error.message, lock_token: null, lock_until: null })
      .eq('document_id', doc.id).eq('lock_token', token);
  } finally { clearInterval(heartbeat); busy = false; }
}
function startKnowledgeWorker() {
  if (interval || !supabase || process.env.KNOWLEDGE_WORKER_ENABLED === 'false') return;
  interval = setInterval(() => { void indexNext(); }, 5000);
  interval.unref?.();
}
async function retrieveKnowledge(query) {
  requireDatabase();
  const [vector] = await embedTexts([query.slice(-5000)], 'RETRIEVAL_QUERY');
  const threshold = Number(process.env.RAG_MIN_SIMILARITY || 0.55);
  return db(supabase.rpc('search_chat_knowledge', {
    query_embedding: vector, embedding_model: embeddingModel(),
    match_threshold: Number.isFinite(threshold) ? Math.min(1, Math.max(0, threshold)) : 0.55, match_count: 6,
  }));
}
async function getKnowledgeStatus() {
  requireDatabase();
  const rows = await db(supabase.from('knowledge_jobs').select('document_id,status,model,error_message,updated_at,documents(title)').order('updated_at', { ascending: false }).limit(1000));
  return { model: embeddingModel(), workerError: lastWorkerError, documents: rows.map(row => ({ ...row, title: row.documents?.title, documents: undefined })) };
}
async function reindexKnowledge() {
  requireDatabase();
  // Update existing jobs only; new/changed documents are enqueued by the DB trigger.
  await db(supabase.from('knowledge_jobs').update({ status: 'queued', error_message: null, lock_token: null, lock_until: null, updated_at: new Date().toISOString() }).neq('status', 'indexing'));
}
module.exports = { retrieveKnowledge, startKnowledgeWorker, getKnowledgeStatus, reindexKnowledge, providerError };
