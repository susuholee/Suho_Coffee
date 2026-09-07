const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');

// 워크플로우 목록 및 신규 등록
router.get('/', workflowController.getWorkflows);
router.post('/', workflowController.createWorkflow);

// 실행 이력 로그 목록 및 초기화
router.get('/logs', workflowController.getExecutionLogs);
router.delete('/logs', workflowController.clearExecutionLogs);

// 상태 토글 및 즉시 실행, 삭제
router.patch('/:id/toggle', workflowController.toggleWorkflow);
router.post('/:id/run', workflowController.runWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

module.exports = router;
