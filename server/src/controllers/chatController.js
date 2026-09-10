const fs = require('fs');
const path = require('path');
const { generateAiResponse, summarizeChatSession } = require('../services/geminiService');
const { createNotionChatEscalationPage } = require('../services/notionService');

const SESSIONS_FILE = path.join(__dirname, '../data/chat_sessions.json');

// 세션 파일 읽기 헬퍼
function readSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      fs.writeFileSync(SESSIONS_FILE, '[]', 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('세션 파일 읽기 오류:', err.message);
    return [];
  }
}

// 세션 파일 저장 헬퍼
function saveSessions(sessions) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('세션 파일 쓰기 오류:', err.message);
  }
}

/**
 * 1. 전체 세션 목록 조회
 */
exports.getChatSessions = async (req, res, next) => {
  try {
    const sessions = readSessions();
    // 최신순 정렬
    sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. 신규 채팅 세션 생성
 */
exports.createChatSession = async (req, res, next) => {
  try {
    const { title = '신규 AI 상담', customerName = '고객/팀원' } = req.body;
    const sessions = readSessions();

    const newSession = {
      id: `session_${Date.now()}`,
      title,
      customer_name: customerName,
      status: 'active', // 'active' | 'completed'
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [
        {
          id: `msg_${Date.now()}_intro`,
          sender: 'ai',
          text: '안녕하세요! 수호카페 AI 스마트 어시스턴트 수호봇입니다. ☕\n사내 매뉴얼, 원두 레시피, 오픈/마감 수칙 등 궁금한 점을 언제든 편하게 물어보세요!',
          created_at: new Date().toISOString(),
        }
      ],
      summary: null, // { inquiry, actionTaken, followUp, needsEscalation }
      notion_escalation: null, // { success, pageUrl, escalatedAt }
    };

    sessions.unshift(newSession);
    saveSessions(sessions);

    res.status(201).json({
      success: true,
      message: '새로운 상담 세션이 시작되었습니다.',
      session: newSession,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. 특정 세션 단건 상세 조회
 */
exports.getChatSessionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sessions = readSessions();
    const session = sessions.find(s => s.id === id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '해당 세션을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      session,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. 메시지 전송 및 Gemini RAG AI 자동 응답
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '메시지 내용을 입력해주세요.',
      });
    }

    const sessions = readSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '상담 세션을 찾을 수 없습니다.',
      });
    }

    const session = sessions[sessionIndex];

    // 1) 사용자 메시지 기록
    const userMsg = {
      id: `msg_${Date.now()}_user`,
      sender: 'user',
      text: message.trim(),
      created_at: new Date().toISOString(),
    };
    session.messages.push(userMsg);

    // 첫 질문이면 세션 제목 자동 업데이트
    if (session.messages.filter(m => m.sender === 'user').length === 1) {
      session.title = message.trim().slice(0, 25) + (message.length > 25 ? '...' : '');
    }

    // 2) Gemini AI (RAG) 응답 생성
    const aiResult = await generateAiResponse({
      query: message.trim(),
      chatHistory: session.messages,
    });

    const aiMsg = {
      id: `msg_${Date.now()}_ai`,
      sender: 'ai',
      text: aiResult.reply,
      source_docs: aiResult.sourceDocs,
      is_fallback: aiResult.isFallback || false,
      created_at: new Date().toISOString(),
    };
    session.messages.push(aiMsg);
    session.updated_at = new Date().toISOString();

    saveSessions(sessions);

    res.status(200).json({
      success: true,
      userMessage: userMsg,
      aiMessage: aiMsg,
      session,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. 상담 세션 종료 및 3단 대화 요약 생성
 */
exports.summarizeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sessions = readSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '상담 세션을 찾을 수 없습니다.',
      });
    }

    const session = sessions[sessionIndex];
    
    // 3단 대화 요약 수행 (핵심 문의 / 조치 사항 / 추가 확인 필요 여부)
    const summary = await summarizeChatSession(session.messages);
    
    session.status = 'completed';
    session.summary = summary;
    session.updated_at = new Date().toISOString();

    saveSessions(sessions);

    res.status(200).json({
      success: true,
      message: '상담이 종료되고 3단 요약이 생성되었습니다.',
      summary,
      session,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. 3단 요약 결과 노션으로 에스컬레이션 전송
 */
exports.escalateToNotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sessions = readSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
      });
    }

    const session = sessions[sessionIndex];
    if (!session.summary) {
      return res.status(400).json({
        success: false,
        message: '먼저 상담을 종료하고 3단 요약을 생성해주세요.',
      });
    }

    // 노션 에스컬레이션 서비스 호출
    const notionResult = await createNotionChatEscalationPage({
      sessionId: session.id,
      title: session.title,
      inquiry: session.summary.inquiry,
      actionTaken: session.summary.actionTaken,
      followUp: session.summary.followUp,
      needsEscalation: session.summary.needsEscalation,
      createdAt: session.created_at,
    });

    session.notion_escalation = {
      success: notionResult.success,
      pageUrl: notionResult.pageUrl,
      message: notionResult.message,
      escalatedAt: new Date().toISOString(),
    };

    saveSessions(sessions);

    res.status(notionResult.success ? 200 : 502).json({
      success: notionResult.success,
      message: notionResult.message,
      pageUrl: notionResult.pageUrl,
      session,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. 상담 세션 삭제
 */
exports.deleteChatSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    let sessions = readSessions();
    sessions = sessions.filter(s => s.id !== id);
    saveSessions(sessions);

    res.status(200).json({
      success: true,
      message: '세션이 삭제되었습니다.',
    });
  } catch (err) {
    next(err);
  }
};
