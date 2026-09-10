const {
  readWorkflows,
  saveWorkflows,
  readLogs,
  executeWorkflow,
} = require('../services/workflowEngine');

/**
 * 1. 워크플로우 전체 목록 조회
 */
exports.getWorkflows = async (req, res, next) => {
  try {
    const workflows = readWorkflows();
    res.status(200).json({
      success: true,
      workflows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. 신규 워크플로우 등록
 */
exports.createWorkflow = async (req, res, next) => {
  try {
    const {
      name,
      description,
      triggerType = 'scheduled',
      triggerConfig = {},
      actionType = 'notion_briefing',
      actionConfig = {},
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '워크플로우 이름을 입력해주세요.',
      });
    }

    const workflows = readWorkflows();
    const newWorkflow = {
      id: `wf_${Date.now()}`,
      name: name.trim(),
      description: description || '자동화 워크플로우 시나리오',
      status: 'active',
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      last_run_at: null,
      run_count: 0,
      created_at: new Date().toISOString(),
    };

    workflows.unshift(newWorkflow);
    saveWorkflows(workflows);

    res.status(201).json({
      success: true,
      message: '신규 워크플로우가 등록되었습니다.',
      workflow: newWorkflow,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. 워크플로우 활성화/일시정지 토글
 */
exports.toggleWorkflow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workflows = readWorkflows();
    const wf = workflows.find(w => w.id === id);

    if (!wf) {
      return res.status(404).json({
        success: false,
        message: '해당 워크플로우를 찾을 수 없습니다.',
      });
    }

    wf.status = wf.status === 'active' ? 'paused' : 'active';
    saveWorkflows(workflows);

    res.status(200).json({
      success: true,
      message: `워크플로우가 [${wf.status === 'active' ? '활성화' : '일시정지'}]되었습니다.`,
      workflow: wf,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. 워크플로우 수동 즉시 실행 (Run Now)
 */
exports.runWorkflow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await executeWorkflow(id);

    res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success ? `워크플로우 [${result.workflow.name}] 실행 완료!` : result.log.details,
      log: result.log,
      workflow: result.workflow,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. 워크플로우 삭제
 */
exports.deleteWorkflow = async (req, res, next) => {
  try {
    const { id } = req.params;
    let workflows = readWorkflows();
    workflows = workflows.filter(w => w.id !== id);
    saveWorkflows(workflows);

    res.status(200).json({
      success: true,
      message: '워크플로우가 삭제되었습니다.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. 실행 이력 로그 목록 조회
 */
exports.getExecutionLogs = async (req, res, next) => {
  try {
    const logs = readLogs();
    res.status(200).json({
      success: true,
      logs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. 실행 이력 로그 전체 초기화
 */
exports.clearExecutionLogs = async (req, res, next) => {
  try {
    const { saveLogs } = require('../services/workflowEngine');
    saveLogs([]);
    res.status(200).json({
      success: true,
      message: '실행 이력 로그가 초기화되었습니다.',
    });
  } catch (err) {
    next(err);
  }
};
