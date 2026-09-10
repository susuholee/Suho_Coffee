const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// 미들웨어 설정
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:3000'],
  credentials: true, // 쿠키 전달 허용
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// 라우터 마운트
const authRoutes = require('./src/routes/authRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const workflowRoutes = require('./src/routes/workflowRoutes');
const calendarRoutes = require('./src/routes/calendarRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
require('./src/controllers/documentController').startDocumentWorker();
app.use('/api/chat', chatRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/calendar', calendarRoutes);

// 헬스체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'Suho Cafe Automation Platform Server (Node.js/Express)',
    timestamp: new Date().toISOString(),
  });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '서버 내부 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

// 서버 기동
app.listen(PORT, () => {
  console.log(`[수호카페 백엔드 서버] http://localhost:${PORT} 에서 실행 중입니다.`);
});

module.exports = app;
