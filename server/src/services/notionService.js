const axios = require('axios');

/**
 * 업로드된 문서 내용을 기반으로 노션(Notion)에 페이지를 자동 생성합니다.
 * @param {Object} doc - 문서 정보 (title, fileName, fileType, fileSize, extractedText)
 * @returns {Promise<Object>} 노션 생성 결과 (success, pageUrl, message)
 */
async function createNotionDocumentPage(doc) {
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  const titleText = `☕ [수호카페 공지] ${doc.title}`;
  const excerptText = doc.extractedText ? doc.extractedText.slice(0, 1500) : '추출된 텍스트가 없습니다.';

  // 1. 실제 Notion API 키가 설정되어 있는 경우
  if (notionApiKey && notionDatabaseId) {
    try {
      const response = await axios.post(
        'https://api.notion.com/v1/pages',
        {
          parent: { database_id: notionDatabaseId },
          properties: {
            // 데이터베이스의 제목 컬럼 (보통 'Name' 또는 'Title')
            title: {
              title: [{ text: { content: titleText } }],
            },
          },
          children: [
            {
              object: 'block',
              type: 'callout',
              callout: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: `📁 원본 파일: ${doc.fileName} (${doc.fileType.toUpperCase()}, ${(doc.fileSize / 1024).toFixed(1)} KB)\n⏰ 등록 일시: ${new Date().toLocaleString('ko-KR')}\n수호카페 사내 자동화 플랫폼에서 자동 연동되었습니다.`,
                    },
                  },
                ],
                icon: { emoji: '☕' },
                color: 'brown_background',
              },
            },
            {
              object: 'block',
              type: 'heading_2',
              heading_2: {
                rich_text: [{ type: 'text', text: { content: '📄 파싱된 본문 내용' } }],
              },
            },
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: { content: excerptText },
                  },
                ],
              },
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${notionApiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
        }
      );

      const pageUrl = response.data?.url || `https://notion.so/${response.data?.id.replace(/-/g, '')}`;
      console.log(`📝 [Notion 연동 성공] 페이지가 생성되었습니다: ${pageUrl}`);

      return {
        success: true,
        pageUrl,
        message: '노션 사내 데이터베이스에 페이지가 생성되었습니다.',
      };
    } catch (err) {
      console.warn('⚠️ Notion API 호출 오류 (키/DB ID 확인 필요):', err.response?.data?.message || err.message);
      // 실패 시에도 전체 프로세스가 중단되지 않도록 가상 결과 반환
      return {
        success: false,
        pageUrl: null,
        message: '노션 API 통신 중 오류: ' + (err.response?.data?.message || err.message),
      };
    }
  }

  // 2. Notion API 키가 아직 설정되지 않은 경우 (가상 연동 모드)
  console.log('ℹ️ [Notion 연동] NOTION_API_KEY 미설정 (노션 연동 시뮬레이션 성공 처리)');
  return {
    success: true,
    pageUrl: `https://notion.so/suho-cafe/${encodeURIComponent(doc.title)}`,
    message: '노션 페이지 생성 시뮬레이션이 완료되었습니다. (실제 연동을 원하시면 .env에 NOTION_API_KEY와 NOTION_DATABASE_ID를 입력해 주세요)',
  };
}

/**
 * AI 고객/팀원 상담 3단 요약 결과를 노션 관리자 확인 페이지로 자동 생성합니다.
 * @param {Object} summaryData - { sessionId, title, inquiry, actionTaken, followUp, needsEscalation, createdAt }
 */
async function createNotionChatEscalationPage(summaryData) {
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  const titleText = `🚨 [상담 에스컬레이션] ${summaryData.inquiry.substring(0, 40)}`;

  if (notionApiKey && notionDatabaseId) {
    try {
      const response = await axios.post(
        'https://api.notion.com/v1/pages',
        {
          parent: { database_id: notionDatabaseId },
          properties: {
            title: {
              title: [{ text: { content: titleText } }],
            },
          },
          children: [
            {
              object: 'block',
              type: 'callout',
              callout: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: `📌 세션 ID: ${summaryData.sessionId}\n🚨 긴급도: ${summaryData.needsEscalation ? '관리자 즉시 확인 필요' : '일반 요약'}\n⏰ 상담 일시: ${new Date(summaryData.createdAt || Date.now()).toLocaleString('ko-KR')}`,
                    },
                  },
                ],
                icon: { emoji: summaryData.needsEscalation ? '🚨' : '📋' },
                color: summaryData.needsEscalation ? 'red_background' : 'gray_background',
              },
            },
            {
              object: 'block',
              type: 'heading_3',
              heading_3: {
                rich_text: [{ type: 'text', text: { content: '1. 핵심 문의 (Inquiry)' } }],
              },
            },
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: summaryData.inquiry } }],
              },
            },
            {
              object: 'block',
              type: 'heading_3',
              heading_3: {
                rich_text: [{ type: 'text', text: { content: '2. 조치 사항 (Action Taken)' } }],
              },
            },
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: summaryData.actionTaken } }],
              },
            },
            {
              object: 'block',
              type: 'heading_3',
              heading_3: {
                rich_text: [{ type: 'text', text: { content: '3. 추가 확인 필요 여부 (Follow-up)' } }],
              },
            },
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: summaryData.followUp } }],
              },
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${notionApiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
        }
      );

      const pageUrl = response.data?.url || `https://notion.so/${response.data?.id.replace(/-/g, '')}`;
      return {
        success: true,
        pageUrl,
        message: '노션 관리자 확인 데이터베이스에 에스컬레이션되었습니다.',
      };
    } catch (err) {
      console.warn('⚠️ Notion 에스컬레이션 페이지 생성 실패:', err.message);
      return {
        success: false,
        message: '노션 API 통신 오류: ' + (err.response?.data?.message || err.message),
      };
    }
  }

  // 모의 시뮬레이션 모드
  return {
    success: true,
    pageUrl: `https://notion.so/suho-cafe/escalation-${summaryData.sessionId}`,
    message: '노션 관리자 에스컬레이션 페이지가 생성되었습니다. (시뮬레이션 모드)',
  };
}

module.exports = {
  createNotionDocumentPage,
  createNotionChatEscalationPage,
};

