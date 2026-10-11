const { randomUUID } = require('crypto');
const store = require('../services/chatStore');
const { generateAiResponse, summarizeChatSession } = require('../services/geminiService');
const knowledge = require('../services/knowledgeService');

function problem(message, status = 400) { return Object.assign(new Error(message), { status }); }
async function sessionFor(req) {
  const session = await store.get(req.params.id);
  if (!session || (req.user.role !== 'admin' && session.user_id !== req.user.id)) throw problem('상담을 찾을 수 없습니다.', 404);
  return session;
}
async function locked(req, work) {
  await sessionFor(req);
  const token = randomUUID();
  if (!await store.acquire(req.params.id, token)) throw problem('이 상담의 답변 또는 요약을 처리하고 있습니다. 잠시 후 다시 시도하세요.', 409);
  const heartbeat = setInterval(() => { store.renew(req.params.id, token).catch(() => {}); }, 30000);
  try { return await work(await sessionFor(req), token); }
  finally { clearInterval(heartbeat); await store.release(req.params.id, token).catch(() => {}); }
}
exports.getChatSessions = async (req, res, next) => {
  try { res.json({ success: true, sessions: await store.list(req.user) }); } catch (error) { next(error); }
};
exports.createChatSession = async (req, res, next) => {
  try {
    const name = typeof req.body.customerName === 'string' ? req.body.customerName.trim().slice(0, 100) : req.user.name;
    res.status(201).json({ success: true, session: await store.create(req.user, name) });
  } catch (error) { next(error); }
};
exports.getChatSessionById = async (req, res, next) => {
  try { res.json({ success: true, session: await sessionFor(req) }); } catch (error) { next(error); }
};
exports.sendMessage = async (req, res, next) => {
  const streaming = req.body.stream === true;
  let keepalive;
  const emit = (event, data) => { if (!res.destroyed && !res.writableEnded) res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n'); };
  try {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message || message.length > 4000) throw problem('질문은 1~4,000자로 입력하세요.');
    const requestId = req.body.requestId || randomUUID();
    if (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId)) throw problem('메시지 식별자가 올바르지 않습니다.');
    await locked(req, async (session, token) => {
      if (session.status !== 'active') throw problem('종료된 상담입니다. 새 상담을 시작해 주세요.', 409);
      let userMessage = session.messages.find(m => m.id === requestId);
      if (userMessage && (userMessage.sender !== 'user' || userMessage.text !== message)) throw problem('메시지 식별자가 중복되었습니다.', 409);
      if (!userMessage && session.messages.length >= 201) throw problem('이 상담의 대화가 길어졌습니다. 상담을 종료하고 새 상담을 시작해 주세요.', 409);
      if (streaming) {
        res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.flushHeaders();
        keepalive = setInterval(() => { if (!res.destroyed && !res.writableEnded) res.write(': keepalive\n\n'); }, 15000);
      }
      const existing = session.messages.find(m => m.reply_to === requestId && m.sender === 'ai');
      if (existing) {
        const payload = { success: true, session, userMessage, aiMessage: existing };
        if (streaming) emit('done', payload); else res.json(payload);
        return;
      }
      if (!userMessage) {
        userMessage = { id: requestId, sender: 'user', text: message, created_at: new Date().toISOString() };
        session.messages.push(userMessage);
      }
      delete userMessage.error;
      session.summary = null;
      if (session.messages.filter(m => m.sender === 'user').length === 1) session.title = message.slice(0, 60);
      await store.save(session, token);
      if (streaming) emit('user', { session, userMessage });
      try {
        const answer = await generateAiResponse({ query: message, chatHistory: session.messages, onChunk: delta => { if (streaming) emit('delta', { text: delta }); } });
        const aiMessage = { id: randomUUID(), reply_to: requestId, sender: 'ai', text: answer.reply, source_docs: answer.sourceDocs, needs_follow_up: answer.needsFollowUp, created_at: new Date().toISOString() };
        session.messages.push(aiMessage);
        await store.save(session, token);
        const payload = { success: true, userMessage, aiMessage, session };
        if (streaming) emit('done', payload); else res.json(payload);
      } catch (error) {
        userMessage.error = error.message;
        await store.save(session, token);
        throw error;
      }
    });
    if (streaming) res.end();
  } catch (error) {
    if (res.headersSent) { emit('error', { message: error.message }); res.end(); }
    else next(error);
  } finally { clearInterval(keepalive); }
};
exports.summarizeSession = async (req, res, next) => {
  try {
    await locked(req, async (session, token) => {
      if (!session.messages.some(m => m.sender === 'user')) throw problem('대화를 시작한 뒤 요약할 수 있습니다.');
      if (!(session.status !== 'active' && session.summary)) {
        session.summary = await summarizeChatSession(session.messages);
        if (req.body.close !== false) session.status = 'closed';
        await store.save(session, token);
      }
      res.json({ success: true, summary: session.summary, session });
    });
  } catch (error) { next(error); }
};
exports.deleteChatSession = async (req, res, next) => {
  try { await locked(req, async (session, token) => store.remove(session.id, token)); res.json({ success: true }); }
  catch (error) { next(error); }
};
exports.getKnowledgeStatus = async (req, res, next) => {
  try { res.json({ success: true, knowledge: await knowledge.getKnowledgeStatus(), canManage: req.user.role === 'admin' }); }
  catch (error) { next(error); }
};
exports.reindexKnowledge = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw problem('관리자만 문서 지식을 갱신할 수 있습니다.', 403);
    await knowledge.reindexKnowledge();
    res.status(202).json({ success: true, message: '문서 지식 갱신을 예약했습니다.' });
  } catch (error) { next(error); }
};
