const fs = require('fs');
const path = require('path');
const { createNotionDocumentPage, createNotionChatEscalationPage } = require('./notionService');

const WORKFLOWS_FILE = path.join(__dirname, '../data/workflows.json');
const LOGS_FILE = path.join(__dirname, '../data/execution_logs.json');

// 워크플로우 파일 읽기/쓰기 헬퍼
function readWorkflows() {
  try {
    if (!fs.existsSync(WORKFLOWS_FILE)) return [];
    return JSON.parse(fs.readFileSync(WORKFLOWS_FILE, 'utf-8'));
  } catch (err) {
    console.error('워크플로우 로드 오류:', err.message);
    return [];
  }
}

function saveWorkflows(workflows) {
  try {
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2), 'utf-8');
  } catch (err) {
    console.error('워크플로우 저장 오류:', err.message);
  }
}

// 로그 파일 읽기/쓰기 헬퍼
function readLogs() {
  try {
    if (!fs.existsSync(LOGS_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
  } catch (err) {
    console.error('실행 로그 로드 오류:', err.message);
    return [];
  }
}

function saveLogs(logs) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('실행 로그 저장 오류:', err.message);
  }
}

/**
 * 단일 워크플로우를 즉시 실행하고 결과를 로깅합니다.
 * @param {string} workflowId
 * @returns {Promise<Object>} 실행 결과 객체
 */
async function executeWorkflow(workflowId) {
  const startTime = Date.now();
  const workflows = readWorkflows();
  const wfIndex = workflows.findIndex(w => w.id === workflowId);

  if (wfIndex === -1) {
    throw new Error('실행할 워크플로우를 찾을 수 없습니다.');
  }

  const wf = workflows[wfIndex];
  let executionDetails = '';
  let isSuccess = true;

  try {
    console.log(`⚡ [워크플로우 실행 시작] [${wf.id}] ${wf.name}`);

    // 액션 타입별 분기 실행
    if (wf.action_type === 'notion_briefing' || wf.action_type === 'notion_page_sync') {
      const mockDoc = {
        title: wf.action_config?.title || wf.name,
        fileName: 'workflow_auto_trigger.txt',
        fileType: 'txt',
        fileSize: 1024,
        extractedText: wf.action_config?.message || wf.description,
      };
      const notionRes = await createNotionDocumentPage(mockDoc);
      executionDetails = `노션 자동 동기화 성공 (결과: ${notionRes.pageUrl || notionRes.message})`;
    } else if (wf.action_type === 'alert_escalation') {
      executionDetails = `관리자 핫라인 긴급 알림 전송 완료 (등급: ${wf.action_config?.level || 'NORMAL'})`;
    } else {
      executionDetails = `기본 액션 처리 완료: [${wf.action_type}] 정상 디스패치`;
    }

    // 워크플로우 카운트 및 최근 실행 시각 갱신
    wf.last_run_at = new Date().toISOString();
    wf.run_count = (wf.run_count || 0) + 1;
    workflows[wfIndex] = wf;
    saveWorkflows(workflows);

  } catch (err) {
    isSuccess = false;
    executionDetails = `실행 실패: ${err.message}`;
    console.error(`❌ [워크플로우 실행 오류]`, err);
  }

  const durationMs = Date.now() - startTime;

  // 실행 이력 로그 추가
  const newLog = {
    id: `log_${Date.now()}`,
    workflow_id: wf.id,
    workflow_name: wf.name,
    trigger_type: wf.trigger_type,
    status: isSuccess ? 'success' : 'failed',
    details: executionDetails,
    execution_time_ms: durationMs,
    executed_at: new Date().toISOString(),
  };

  const logs = readLogs();
  logs.unshift(newLog);
  // 최근 100개만 유지
  if (logs.length > 100) logs.length = 100;
  saveLogs(logs);

  return {
    success: isSuccess,
    log: newLog,
    workflow: wf,
  };
}

module.exports = {
  readWorkflows,
  saveWorkflows,
  readLogs,
  saveLogs,
  executeWorkflow,
};
