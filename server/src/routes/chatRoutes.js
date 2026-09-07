const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

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

// 3단 요약 결과 노션 에스컬레이션
router.post('/sessions/:id/escalate', chatController.escalateToNotion);

module.exports = router;
