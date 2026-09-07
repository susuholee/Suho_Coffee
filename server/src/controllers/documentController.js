const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { supabase } = require('../config/supabase');
const { extractTextFromBuffer } = require('../services/fileParser');
const { createNotionDocumentPage } = require('../services/notionService');

const dataFilePath = path.join(__dirname, '../data/documents.json');
const noticesFilePath = path.join(__dirname, '../data/notices.json');

// 디렉토리 생성
if (!fs.existsSync(path.dirname(dataFilePath))) {
  fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
}

// 초기 기본 문서 시드 데이터
const defaultDocuments = [
  {
    id: 'doc_seed_001',
    title: '2026 수호카페 가맹점 표준 운영 매뉴얼',
    file_name: '2026_suho_cafe_manual.pdf',
    file_url: '/uploads/2026_suho_cafe_manual.pdf',
    file_type: 'pdf',
    file_size: 2458000,
    extracted_text: `[수호카페 가맹점 표준 운영 매뉴얼 v2.0]\n\n제1장: 매장 오픈 및 마감 수칙\n1. 오픈 준비: 매일 오전 8시 머신 예열 및 원두 신선도 체크(에스프레소 추출 압력 9bar 확인).\n2. 위생 관리: 스팀 피처 및 제빙기 1일 2회 세척 소독 필수.\n3. 고객 응대: 주문 접수 후 3분 이내 음료 제공을 원칙으로 하며, 밝은 미소로 인사한다.\n\n제2장: 원두 및 레시피 표준\n- 시그니처 블렌드: 브라질 세하도 50% + 콜롬비아 수프레모 30% + 에티오피아 예가체프 20%.\n- 아메리카노: 에스프레소 2샷(36g) + 정수 온수/냉수 240ml.`,
    uploaded_by: 'seed-admin-001',
    uploader_name: '수호카페 최고관리자',
    discord_notified: true,
    notion_notified: false,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];

const loadLocalDocuments = () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('documents.json 로드 실패:', e);
  }
  return [...defaultDocuments];
};

const saveLocalDocuments = (docs) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(docs, null, 2), 'utf8');
  } catch (e) {
    console.error('documents.json 저장 실패:', e);
  }
};

let localDocuments = loadLocalDocuments();
if (!fs.existsSync(dataFilePath)) {
  saveLocalDocuments(localDocuments);
}

const isSupabaseConfigured = () => {
  return (
    process.env.SUPABASE_URL && 
    process.env.SUPABASE_URL !== 'https://your-project.supabase.co' &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
};

/**
 * 문서 업로드 및 텍스트 자동 파싱 (POST /api/documents/upload)
 */
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '업로드할 파일이 전달되지 않았습니다.' });
    }

    const { title, autoNotice, notifyDiscord, notifyNotion } = req.body;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    const fileExt = path.extname(originalName).toLowerCase().replace('.', '');

    console.log(`📥 [파일 수신] ${originalName} (${fileSize} bytes) - 텍스트 추출 시작...`);

    // 1. 파일 버퍼에서 텍스트 자동 추출 (PDF, Word, PPT 등)
    const extractedText = await extractTextFromBuffer(req.file.buffer, originalName, mimeType);

    console.log(`📄 [텍스트 추출 완료] 본문 길이: ${extractedText.length}자`);

    let notionResult = { success: false, pageUrl: null };

    // 2. 노션(Notion) 사내 데이터베이스 페이지 자동 생성
    if (notifyNotion === 'true' || notifyNotion === true || notifyNotion === undefined) {
      notionResult = await createNotionDocumentPage({
        title: title || originalName,
        fileName: originalName,
        fileType: fileExt,
        fileSize: fileSize,
        extractedText,
      });
    }

    // 3. DB 적재 (Supabase 또는 로컬 영속 파일)
    const newDoc = {
      id: 'doc_' + Date.now(),
      title: title || originalName,
      file_name: originalName,
      file_url: `/uploads/${encodeURIComponent(originalName)}`,
      file_type: fileExt,
      file_size: fileSize,
      extracted_text: extractedText,
      uploaded_by: 'current-user',
      uploader_name: '수호카페 구성원',
      notion_notified: notionResult.success,
      notion_page_url: notionResult.pageUrl,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('documents')
        .insert([{
          title: newDoc.title,
          file_name: newDoc.file_name,
          file_url: newDoc.file_url,
          file_type: newDoc.file_type,
          file_size: newDoc.file_size,
          extracted_text: newDoc.extracted_text,
          notion_notified: newDoc.notion_notified,
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({
        success: true,
        message: '문서가 Supabase에 저장되었으며, 노션 페이지가 생성되었습니다.',
        document: data,
        notion: notionResult,
      });
    } else {
      localDocuments.unshift(newDoc);
      saveLocalDocuments(localDocuments);

      return res.status(201).json({
        success: true,
        message: `문서 텍스트(${extractedText.length}자) 추출 완료! 노션 사내 페이지가 자동 연동되었습니다.`,
        document: newDoc,
        notion: notionResult,
      });
    }
  } catch (err) {
    console.error('❌ 문서 업로드 오류:', err);
    return res.status(500).json({ success: false, message: '문서 처리 중 오류가 발생했습니다: ' + err.message });
  }
};

/**
 * 문서 목록 조회 (GET /api/documents)
 */
exports.getDocuments = async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, documents: data });
    } else {
      return res.status(200).json({ success: true, documents: localDocuments });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 특정 문서 상세 조회 (GET /api/documents/:id)
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = localDocuments.find((d) => d.id === id);
    if (!doc) {
      return res.status(404).json({ success: false, message: '문서를 찾을 수 없습니다.' });
    }
    return res.status(200).json({ success: true, document: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
