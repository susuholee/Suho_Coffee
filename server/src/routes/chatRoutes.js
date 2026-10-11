const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
router.use(require('../middleware/documentAuth'));
router.get('/knowledge', chatController.getKnowledgeStatus);
router.post('/knowledge/reindex', chatController.reindexKnowledge);
require('../services/knowledgeService').startKnowledgeWorker();

// 세션 목록 조회 및 신규 세션 생성
router.get('/sessions', chatController.getChatSessions);
router.post('/sessions', chatController.createChatSession);

// 세션 상세 조회 및 삭제
router.get('/sessions/:id', chatController.getChatSessionById);
router.delete('/sessions/:id', chatController.deleteChatSession);

// 메시지 전송 및 AI 응답
router.post('/sessions/:id/messages', chatController.sendMessage);

// 상담 종료 및 3단 요약 생성
router.post('/sessions/:id/summarize', chatController.summarizeSession);

router.post('/sessions/:id/close', chatController.summarizeSession);

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({ success: false, message: error.message || '상담을 처리하지 못했습니다.',
    ...(error.code?.startsWith('CHAT_') ? { code: error.code, databaseCode: error.databaseCode } : {}) });
});

module.exports = router;
