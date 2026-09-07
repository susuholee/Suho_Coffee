const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// 일정 목록 및 알림 상태 조회
router.get('/events', calendarController.getEvents);

// 구글 캘린더 실시간 동기화
router.post('/sync', calendarController.syncCalendar);

// 신규 일정 생성 및 삭제
router.post('/events', calendarController.createEvent);
router.delete('/events/:id', calendarController.deleteEvent);

module.exports = router;
