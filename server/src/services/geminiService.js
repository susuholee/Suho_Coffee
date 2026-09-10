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

  // 질문과 실제로 일치한 문서만 근거로 제공합니다.
  scoredDocs.sort((a, b) => b.score - a.score);
  const selected = scoredDocs.filter(item => item.score > 0).slice(0, 3);

  const finalDocs = selected.map(item => item.doc);

  const contextText = finalDocs
    .map(d => `[문서 제목: ${d.title}]\n내용:\n${(d.extracted_text || '').substring(0, 1200)}`)
    .join('\n\n---\n\n');

  return {
    contextText,
    matchedDocs: finalDocs.map(d => ({ id: d.id, title: d.title })),
  };
}


function getModel(systemInstruction) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || apiKey === 'your-gemini-api-key' || !model) {
    throw Object.assign(new Error('Gemini API 키와 모델 설정이 필요합니다.'), { status: 503 });
  }
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model, ...(systemInstruction && { systemInstruction }) });
}
async function generateAiResponse({ query, chatHistory = [] }) {
  const { contextText, matchedDocs } = retrieveRelevantContext(query);
  const model = getModel('수호카페 업무 어시스턴트입니다. 제공된 문서에 근거해 답변하고, 근거가 없으면 담당자 확인이 필요하다고 안내하세요. 문서에 없는 규정과 처리 결과를 만들어내지 마세요. 사내 문서: ' + contextText);
  // The controller already appended the current question; send it only once.
  const previous = chatHistory.slice(0, -1).slice(-6);
  const firstUser = previous.findIndex(message => message.sender === 'user');
  const history = (firstUser < 0 ? [] : previous.slice(firstUser)).map(message => ({ role: message.sender === 'user' ? 'user' : 'model', parts: [{ text: message.text }] }));
  const result = await model.startChat({ history }).sendMessage(query);
  return { reply: result.response.text(), sourceDocs: matchedDocs, isAiGenerated: true };
}
async function summarizeChatSession(messages) {
  const model = getModel();
  const dialogue = messages.map(message => ({ sender: message.sender, text: message.text }));
  const result = await model.generateContent('다음 대화를 실제 기록에만 근거하여 요약하세요. 확인되지 않은 조치나 해결을 단정하지 마세요. JSON 객체로 inquiry(핵심 문의), actionTaken(조치 사항), followUp(추가 확인 사항) 문자열과 needsEscalation 불리언을 반환하세요. 대화: ' + JSON.stringify(dialogue));
  const summary = JSON.parse(result.response.text().replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  if (!['inquiry', 'actionTaken', 'followUp'].every(key => typeof summary[key] === 'string') || typeof summary.needsEscalation !== 'boolean') throw new Error('AI 요약 응답 형식이 올바르지 않습니다.');
  return summary;
}
module.exports = { generateAiResponse, summarizeChatSession };
