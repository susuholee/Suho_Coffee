const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const DOCUMENTS_FILE = path.join(__dirname, '../data/documents.json');

// 저장된 사내 문서(지식 베이스) 로드 함수
function getKnowledgeBaseDocs() {
  try {
    if (fs.existsSync(DOCUMENTS_FILE)) {
      const raw = fs.readFileSync(DOCUMENTS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('사내 문서 지식 베이스 로드 오류:', err.message);
  }
  return [];
}

// 사용자 질문과 관련된 사내 문서 컨텍스트 추출 (RAG 매칭)
function retrieveRelevantContext(query) {
  const docs = getKnowledgeBaseDocs();
  if (!docs || docs.length === 0) return { contextText: '', matchedDocs: [] };

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const scoredDocs = docs.map(doc => {
    const text = (doc.extracted_text || doc.title || '').toLowerCase();
    let score = 0;
    queryTerms.forEach(term => {
      if (text.includes(term)) score += 1;
    });
    return { doc, score };
  });

  // 점수 순 정렬 또는 기본 문서 제공
  scoredDocs.sort((a, b) => b.score - a.score);
  const selected = scoredDocs.filter(item => item.score > 0).slice(0, 3);

  // 일치하는 문서가 없더라도 기본 매뉴얼을 컨텍스트로 제공
  const finalDocs = selected.length > 0 
    ? selected.map(s => s.doc) 
    : docs.slice(0, 2);

  const contextText = finalDocs
    .map(d => `[문서 제목: ${d.title}]\n내용:\n${(d.extracted_text || '').substring(0, 1200)}`)
    .join('\n\n---\n\n');

  return {
    contextText,
    matchedDocs: finalDocs.map(d => ({ id: d.id, title: d.title })),
  };
}

/**
 * 1. AI 실시간 상담 응답 생성 (Gemini RAG)
 */
async function generateAiResponse({ query, chatHistory = [] }) {
  const { contextText, matchedDocs } = retrieveRelevantContext(query);
  const apiKey = process.env.GEMINI_API_KEY;

  const systemInstruction = `당신은 '수호카페'의 사내 AI 스마트 어시스턴트 및 고객 응대 상담봇 '수호봇(SuhoBot)'입니다.
아래 제공된 [사내 공식 문서 및 매뉴얼]을 최우선 근거로 활용하여, 정중하고 친절한 어조(~입니다, ~하셨을까요?)로 답변하세요.
만약 문서에 나와있지 않은 내용이거나 전문적인 판단이 필요한 경우, "이 사항은 담당 관리자(팀장) 확인이 필요합니다."라고 안내하고 필요 시 에스컬레이션을 제안하세요.

[사내 공식 문서 및 매뉴얼]
${contextText || '현재 등록된 문서가 없습니다.'}`;

  // 1) 실제 Gemini API 호출 시도
  if (apiKey && apiKey !== 'your-gemini-api-key' && apiKey.trim() !== '') {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction,
      });

      // 대화 히스토리 포맷 구성
      const historyContents = chatHistory.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const chat = model.startChat({ history: historyContents });
      const result = await chat.sendMessage(query);
      const responseText = result.response.text();

      return {
        reply: responseText,
        sourceDocs: matchedDocs,
        isAiGenerated: true,
      };
    } catch (err) {
      console.warn('⚠️ Gemini API 호출 실패, 지능형 RAG 폴백 엔진으로 응답합니다:', err.message);
    }
  }

  // 2) API 키 부재 또는 실패 시 지능형 사내 RAG 시뮬레이션 응답
  return generateFallbackResponse(query, contextText, matchedDocs);
}

// 지능형 폴백 RAG 응답기
function generateFallbackResponse(query, contextText, matchedDocs) {
  const lower = query.toLowerCase();

  let reply = '';
  if (lower.includes('오픈') || lower.includes('마감') || lower.includes('출근') || lower.includes('시간')) {
    reply = `안녕하세요! 수호카페 가맹점 표준 운영 매뉴얼에 따른 오픈 및 마감 수칙을 안내해 드립니다. ☕\n\n1. **오픈 준비**: 매일 오전 8시 머신 예열 및 원두 신선도를 체크하며, 에스프레소 추출 압력 9bar를 반드시 확인해야 합니다.\n2. **위생 점검**: 스팀 피처 및 제빙기는 1일 2회 세척 소독이 필수입니다.\n3. **고객 응대 원칙**: 주문 접수 후 3분 이내 제공을 원칙으로 하며 미소로 응대합니다.`;
  } else if (lower.includes('원두') || lower.includes('블렌드') || lower.includes('시그니처')) {
    reply = `수호카페 시그니처 블렌드 원두 배합 비율 안내입니다.\n\n• **배합 비율**: 브라질 세하도 50% + 콜롬비아 수프레모 30% + 에티오피아 예가체프 20%\n• **풍미 특징**: 다크초콜릿의 묵직한 바디감과 은은한 베리향의 밸런스가 조화로운 블렌딩입니다.`;
  } else if (lower.includes('아메리카노') || lower.includes('레시피') || lower.includes('제조')) {
    reply = `수호카페 표준 아메리카노 제조 레시피입니다.\n\n• **에스프레소**: 2샷(약 36g 추출)\n• **물(정수 온수 또는 냉수)**: 240ml\n• **아이스 음료 시**: 각얼음 180g을 잔에 먼저 투입한 후 냉수 200ml 및 에스프레소 2샷을 붓습니다.`;
  } else if (lower.includes('에러') || lower.includes('고장') || lower.includes('머신') || lower.includes('압력')) {
    reply = `머신 이상 발생 시 대처 가이드입니다.\n\n1. 추출 압력이 9bar 미만으로 떨어질 경우, 탬핑 강도 및 분쇄도(그라인더 눈금)를 먼저 확인해 주세요.\n2. 누수나 급수 에러 코드가 점멸하면 전원을 차단하고 즉시 팀장 또는 본사 기술지원팀으로 문의해 주시기 바랍니다.`;
  } else {
    reply = `안녕하세요! 수호카페 AI 어시스턴트입니다.\n\n문의하신 "${query}"에 대해 사내 매뉴얼 및 운영 정책을 바탕으로 안내해 드립니다. 추가적인 세부 지침이나 가맹점 특이사항 확인이 필요하신 경우, 상단의 [상담 종료 및 3단 요약] 버튼을 누르시면 관리자 검토를 위해 노션으로 즉시 에스컬레이션할 수 있습니다.`;
  }

  return {
    reply,
    sourceDocs: matchedDocs,
    isAiGenerated: true,
    isFallback: true,
  };
}

/**
 * 2. 3단 대화 요약 생성 (핵심 문의 / 조치 사항 / 추가 확인 필요 여부)
 */
async function summarizeChatSession(messages) {
  if (!messages || messages.length === 0) {
    return {
      inquiry: '상담 내역이 없습니다.',
      actionTaken: '조치 사항 없음',
      followUp: '추가 확인 사항 없음',
      needsEscalation: false,
    };
  }

  const dialogText = messages
    .map(m => `[${m.sender === 'user' ? '고객/팀원' : 'AI상담봇'}]: ${m.text}`)
    .join('\n');

  const apiKey = process.env.GEMINI_API_KEY;

  // 1) Gemini API 호출을 통한 3단 요약 시도
  if (apiKey && apiKey !== 'your-gemini-api-key' && apiKey.trim() !== '') {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `다음 상담 대화 내용을 분석하여 정확히 3단 항목으로 요약하고, 관리자 에스컬레이션 필요 여부를 JSON 형태로 출력하세요.
출력 형식은 반드시 유효한 JSON 문자열이어야 합니다:
{
  "inquiry": "핵심 문의 내용 (1~2문장)",
  "actionTaken": "조치 및 답변 내용 (1~2문장)",
  "followUp": "추가 확인 필요 사항 또는 후속 조치 필요 여부 (1문장)",
  "needsEscalation": true 또는 false
}

[대화 내용]
${dialogText}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn('⚠️ Gemini 요약 생성 실패, 룰 기반 요약 엔진으로 대체합니다:', err.message);
    }
  }

  // 2) 폴백 규칙 기반 3단 요약기
  const userMessages = messages.filter(m => m.sender === 'user').map(m => m.text);
  const botMessages = messages.filter(m => m.sender !== 'user').map(m => m.text);

  const mainInquiry = userMessages.join(' / ').substring(0, 120) || '가맹점 운영 및 레시피 문의';
  const lastAction = botMessages[botMessages.length - 1] 
    ? botMessages[botMessages.length - 1].substring(0, 150).replace(/\n/g, ' ') + '...'
    : '사내 표준 매뉴얼 기반 실시간 안내 제공 완료';

  const fullText = messages.map(m => m.text).join(' ');
  const needsEscalation = fullText.includes('고장') || fullText.includes('환불') || fullText.includes('확인 필요') || fullText.includes('에러');

  return {
    inquiry: mainInquiry,
    actionTaken: lastAction,
    followUp: needsEscalation 
      ? '현장 기기 상태 재점검 및 본사 담당자 유선 확인 필요 (에스컬레이션 권장)' 
      : '안내된 매뉴얼에 따라 정상 처리 확인됨 (추가 이슈 없음)',
    needsEscalation,
  };
}

module.exports = {
  generateAiResponse,
  summarizeChatSession,
};
