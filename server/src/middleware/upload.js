const multer = require('multer');
const path = require('path');

// 메모리 스토리지 (Supabase Storage 업로드 및 버퍼 파싱용)
const storage = multer.memoryStorage();

// 허용 확장자 (이미지 및 문서: PDF, DOCX, PPTX)
const allowedFileTypes = new Set(['.pdf', '.docx', '.pptx', '.xlsx']);

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 최대 50MB
  },
  fileFilter: (req, file, cb) => {
    if (allowedFileTypes.has(path.extname(file.originalname).toLowerCase())) {
      return cb(null, true);
    }
    cb(Object.assign(new Error('PDF, DOCX, PPTX, XLSX 파일만 지원합니다.'), { status: 400 }));
  },
});

// 이미지 전용 업로드 미들웨어
const uploadImage = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 이미지 최대 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일(JPG, PNG, GIF, WEBP)만 업로드할 수 있습니다.'));
    }
  },
});

module.exports = {
  upload,
  uploadImage,
};
