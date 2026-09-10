const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { upload } = require('../middleware/upload');
const documentAuth = require('../middleware/documentAuth');

router.use(documentAuth);

// 문서 목록 조회
router.get('/', documentController.getDocuments);

// 특정 문서 조회
router.get('/:id', documentController.getDocumentById);
router.get('/:id/download', documentController.downloadDocument);
router.post('/:id/retry', documentController.retryDocument);

// 문서 업로드 및 텍스트 추출 (Multer single file)
router.post('/upload', upload.single('file'), documentController.uploadDocument);

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.code?.startsWith('LIMIT_') ? 400 : error.status || 500;
  const message = error.code === 'LIMIT_FILE_SIZE' ? '파일은 최대 50MB까지 업로드할 수 있습니다.' : error.message;
  res.status(status).json({ success: false, message });
});

module.exports = router;
