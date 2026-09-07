const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 회원가입
router.post('/signup', authController.signup);

// 이메일(ID) 중복 확인
router.post('/check-email', authController.checkEmail);

// 로그인 (쿠키 발급)
router.post('/login', authController.login);

// 내 정보 조회 (쿠키 토큰 검증)
router.get('/me', authController.getMe);

// 로그아웃 (쿠키 제거)
router.post('/logout', authController.logout);

// 유저 목록 조회 (관리자/테스트용)
router.get('/users', authController.getUsers);

// 팀장 승인/상태 변경
router.patch('/users/:id/status', authController.updateUserStatus);

module.exports = router;
