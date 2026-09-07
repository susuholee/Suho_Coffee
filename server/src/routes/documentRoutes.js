const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { upload } = require('../middleware/upload');

// 문서 목록 조회
router.get('/', documentController.getDocuments);

// 특정 문서 조회
router.get('/:id', documentController.getDocumentById);

// 문서 업로드 및 텍스트 추출 (Multer single file)
router.post('/upload', upload.single('file'), documentController.uploadDocument);

module.exports = router;
