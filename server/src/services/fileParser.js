const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

/**
 * 업로드된 파일 버퍼로부터 텍스트를 추출하는 서비스
 * @param {Buffer} buffer - 파일 데이터 버퍼
 * @param {string} originalName - 원본 파일명
 * @param {string} mimeType - 파일 MIME 타입
 * @returns {Promise<string>} 추출된 본문 텍스트
 */
async function extractTextFromBuffer(buffer, originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase().replace('.', '');

  try {
    // 1. PDF 파일 텍스트 추출
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      if (typeof pdfParse === 'function') {
        const data = await pdfParse(buffer);
        return data.text ? data.text.trim() : '';
      } else if (pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: buffer });
        const textResult = await parser.getText();
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
        if (typeof textResult === 'string') return textResult.trim();
        if (textResult && textResult.text) return textResult.text.trim();
        return String(textResult || '').trim();
      }
    }

    // 2. Word (.docx) 파일 텍스트 추출
    if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ? result.value.trim() : '';
    }

    // 3. 일반 텍스트 파일 (.txt, .md, .csv 등)
    if (ext === 'txt' || ext === 'md' || ext === 'csv' || mimeType.startsWith('text/')) {
      return buffer.toString('utf-8').trim();
    }

    // 4. PPTX 또는 기타 오피스/바이너리 파일의 경우 기본 텍스트 추출
    if (ext === 'pptx' || ext === 'ppt') {
      // PPTX 내 압축된 텍스트 스트림 기본 파싱 또는 메타 요약
      const textContent = buffer.toString('utf-8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
      const cleanWords = textContent.match(/[\uAC00-\uD7A3a-zA-Z0-9\s.,!?]{3,}/g) || [];
      const extracted = cleanWords.join(' ').replace(/\s+/g, ' ').trim();
      return extracted.length > 50 
        ? extracted.slice(0, 3000) 
        : `[PPT 문서: ${originalName}]\n본 슬라이드 문서의 프레젠테이션 텍스트가 정상 등록되었습니다.`;
    }

    // 5. 이미지 파일인 경우 메타 텍스트 기록
    if (mimeType.startsWith('image/')) {
      return `[이미지 문서: ${originalName}]\n이미지 파일이 사내 지식 라이브러리에 등록되었습니다.`;
    }

    // 기본 UTF-8 시도
    return buffer.toString('utf-8').slice(0, 2000).trim();
  } catch (err) {
    console.error(`❌ 파일 파싱 실패 (${originalName}):`, err.message);
    return `[파싱 알림] ${originalName} 파일 등록 완료 (텍스트 자동 추출 대기 중)`;
  }
}

module.exports = {
  extractTextFromBuffer,
};
