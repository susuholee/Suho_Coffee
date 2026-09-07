import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  GitBranch,
  Play,
  Pause,
  Plus,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Trash2,
  Sparkles,
  X,
  ArrowRight,
  Activity,
  Layers,
  Calendar,
  Webhook,
} from 'lucide-react';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const PageContainer = styled.div`
  padding: 32px;
  max-width: 1300px;
  margin: 0 auto;
  width: 100%;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 20px 16px;
  }
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PageSubtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textWhite};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 14px;
  font-weight: 600;
  transition: ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
    transform: translateY(-1px);
  }
`;

/* 상단 통계 카드 그리드 */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const StatIconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const StatValue = styled.span`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

/* 워크플로우 카드 그리드 */
const WorkflowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const WorkflowCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 24px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: ${({ theme }) => theme.transitions.fast};
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme }) => theme.colors.accent};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ $active, theme }) => ($active ? theme.colors.accent : theme.colors.border)};
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const WfName = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 6px 0;
  line-height: 1.4;
`;

const StatusBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $active, theme }) => ($active ? theme.colors.successBg : theme.colors.warningBg)};
  color: ${({ $active, theme }) => ($active ? theme.colors.success : theme.colors.warning)};
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const WfDescription = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
  margin: 0 0 18px 0;
  min-height: 38px;
`;

/* 파이프라인 비주얼 플로우 */
const PipelineFlow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 20px;
  font-size: 12px;
`;

const StepBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  padding: 5px 10px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RunButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.accent}, #B45309);
  color: ${({ theme }) => theme.colors.textWhite};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 13px;
  font-weight: 700;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    opacity: 0.95;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryLight};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const DeleteButton = styled.button`
  padding: 10px;
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.danger};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.dangerBg};
  }
`;

/* 모달 컴포넌트 */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  width: 100%;
  max-width: 560px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  animation: fadeIn 0.2s ease-out;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const ModalBody = styled.form`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FormLabel = styled.label`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const FormInput = styled.input`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 14px;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const FormSelect = styled.select`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 14px;
  background: #FFF;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const FormTextarea = styled.textarea`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 14px;
  resize: vertical;
  min-height: 80px;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  background: ${({ theme }) => theme.colors.surfaceSubtle};
`;

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [runningWfId, setRunningWfId] = useState(null);

  // 신규 등록 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'scheduled',
    actionType: 'notion_briefing',
  });

  // 1. 워크플로우 목록 쿼리
  const { data: workflowsData, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await axios.get('/api/workflows');
      return res.data?.workflows || [];
    },
  });

  const workflows = workflowsData || [];
  const activeCount = workflows.filter(w => w.status === 'active').length;
  const totalRuns = workflows.reduce((acc, cur) => acc + (cur.run_count || 0), 0);

  // 2. 즉시 실행 (Run Now) 뮤테이션
  const runMutation = useMutation({
    mutationFn: async (id) => {
      setRunningWfId(id);
      const res = await axios.post(`/api/workflows/${id}/run`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['workflows']);
      setRunningWfId(null);
      setToastMessage(`⚡ [${data.workflow.name}] 즉시 실행이 완료되었습니다! (노션 동기화 성공)`);
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err) => {
      setRunningWfId(null);
      alert('실행 오류: ' + (err.response?.data?.message || err.message));
    },
  });

  // 3. 상태 토글 뮤테이션
  const toggleMutation = useMutation({
    mutationFn: async (id) => {
      const res = await axios.patch(`/api/workflows/${id}/toggle`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['workflows']);
      setToastMessage(`상태 변경: ${data.message}`);
      setTimeout(() => setToastMessage(null), 3000);
    },
  });

  // 4. 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await axios.delete(`/api/workflows/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows']);
    },
  });

  // 5. 신규 워크플로우 생성 뮤테이션
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post('/api/workflows', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows']);
      setShowModal(false);
      setFormData({ name: '', description: '', triggerType: 'scheduled', actionType: 'notion_briefing' });
      setToastMessage('✨ 새 워크플로우 파이프라인이 등록되었습니다.');
      setTimeout(() => setToastMessage(null), 3000);
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('워크플로우 이름을 입력해주세요.');
      return;
    }
    createMutation.mutate(formData);
  };

  const getTriggerLabel = (type) => {
    if (type === 'scheduled') return '⏰ 정기 스케줄러';
    if (type === 'event') return '📁 파일 업로드 감지';
    return '🔗 웹훅 / 에러 플래그';
  };

  const getActionLabel = (type) => {
    if (type === 'notion_briefing') return '📝 노션 브리핑 발행';
    if (type === 'notion_page_sync') return '🔄 노션 자동 백업';
    return '🚨 관리자 핫라인 호출';
  };

  return (
    <PageContainer>
      {/* 상단 헤더 */}
      <PageHeader>
        <HeaderTitleGroup>
          <PageTitle>
            <GitBranch size={26} color="#D97706" />
            자동화 워크플로우 엔진
          </PageTitle>
          <PageSubtitle>
            사내 이벤트 및 스케줄에 맞춰 노션 페이지 생성 및 공지 알림을 자동으로 트리거합니다.
          </PageSubtitle>
        </HeaderTitleGroup>
        <CreateButton onClick={() => setShowModal(true)}>
          <Plus size={18} />
          새 워크플로우 등록
        </CreateButton>
      </PageHeader>

      {/* 토스트 배너 */}
      {toastMessage && (
        <div style={{
          background: '#4A2C2A',
          color: '#FFF',
          padding: '12px 20px',
          borderRadius: '10px',
          marginBottom: '24px',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <Sparkles size={16} color="#D97706" />
          {toastMessage}
        </div>
      )}

      {/* 통계 카드 3개 */}
      <StatsGrid>
        <StatCard>
          <StatIconBox $bg="#FEF3C7" $color="#D97706">
            <Layers size={24} />
          </StatIconBox>
          <StatInfo>
            <StatLabel>전체 등록 파이프라인</StatLabel>
            <StatValue>{workflows.length}개</StatValue>
          </StatInfo>
        </StatCard>

        <StatCard>
          <StatIconBox $bg="#ECFDF5" $color="#10B981">
            <CheckCircle2 size={24} />
          </StatIconBox>
          <StatInfo>
            <StatLabel>정상 가동 중 (Active)</StatLabel>
            <StatValue>{activeCount}개</StatValue>
          </StatInfo>
        </StatCard>

        <StatCard>
          <StatIconBox $bg="#EFF6FF" $color="#3B82F6">
            <Activity size={24} />
          </StatIconBox>
          <StatInfo>
            <StatLabel>누적 자동화 실행 횟수</StatLabel>
            <StatValue>{totalRuns}회</StatValue>
          </StatInfo>
        </StatCard>
      </StatsGrid>

      {/* 워크플로우 카드 리스트 */}
      <WorkflowGrid>
        {workflows.map((wf) => {
          const isActive = wf.status === 'active';
          const isRunningThis = runningWfId === wf.id;

          return (
            <WorkflowCard key={wf.id} $active={isActive}>
              <div>
                <CardTop>
                  <WfName>{wf.name}</WfName>
                  <StatusBadge $active={isActive}>
                    {isActive ? '가동 중' : '일시정지'}
                  </StatusBadge>
                </CardTop>
                <WfDescription>{wf.description}</WfDescription>

                {/* 파이프라인 트리거 -> 액션 흐름 */}
                <PipelineFlow>
                  <StepBadge>
                    <Zap size={13} color="#D97706" />
                    {getTriggerLabel(wf.trigger_type)}
                  </StepBadge>
                  <ArrowRight size={14} color="#A09893" />
                  <StepBadge>
                    <FileText size={13} color="#4A2C2A" />
                    {getActionLabel(wf.action_type)}
                  </StepBadge>
                </PipelineFlow>
              </div>

              <div>
                <CardMeta>
                  <span>
                    최근 실행: {wf.last_run_at ? new Date(wf.last_run_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '실행 이력 없음'}
                  </span>
                  <span>누적 {wf.run_count || 0}회</span>
                </CardMeta>

                <CardActions>
                  <RunButton
                    onClick={() => runMutation.mutate(wf.id)}
                    disabled={isRunningThis || runMutation.isLoading}
                  >
                    <Play size={14} />
                    {isRunningThis ? '실행 중...' : '즉시 실행 (Run)'}
                  </RunButton>

                  <ToggleButton onClick={() => toggleMutation.mutate(wf.id)}>
                    {isActive ? <Pause size={14} /> : <Play size={14} />}
                    {isActive ? '정지' : '재개'}
                  </ToggleButton>

                  <DeleteButton 
                    title="삭제"
                    onClick={() => {
                      if (window.confirm(`'${wf.name}' 워크플로우를 삭제하시겠습니까?`)) {
                        deleteMutation.mutate(wf.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </DeleteButton>
                </CardActions>
              </div>
            </WorkflowCard>
          );
        })}
      </WorkflowGrid>

      {/* 새 워크플로우 생성 모달 */}
      {showModal && (
        <ModalOverlay onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitBranch size={20} color="#D97706" />
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>새 워크플로우 시나리오 등록</h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                style={{ cursor: 'pointer', color: '#6E6763' }}
              >
                <X size={20} />
              </button>
            </ModalHeader>

            <ModalBody onSubmit={handleCreateSubmit}>
              <FormGroup>
                <FormLabel>워크플로우 이름 *</FormLabel>
                <FormInput
                  type="text"
                  placeholder="예: 마감 정산 완료 시 노션 리포트 자동 생성"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>시나리오 설명</FormLabel>
                <FormTextarea
                  placeholder="이 워크플로우가 수행하는 자동화 내용을 간략히 적어주세요."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>트리거 (Trigger) *</FormLabel>
                <FormSelect
                  value={formData.triggerType}
                  onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
                >
                  <option value="scheduled">⏰ 정기 스케줄러 (매일 오전 지정 시각)</option>
                  <option value="event">📁 스마트 문서 업로드 감지 시</option>
                  <option value="webhook">🔗 외부 시스템 웹훅 / 에러 긴급 플래그</option>
                </FormSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel>액션 (Action) *</FormLabel>
                <FormSelect
                  value={formData.actionType}
                  onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                >
                  <option value="notion_briefing">📝 사내 노션(Notion) 일일 브리핑 페이지 생성</option>
                  <option value="notion_page_sync">🔄 노션 지식베이스 자동 백업 및 동기화</option>
                  <option value="alert_escalation">🚨 관리자 핫라인 긴급 알림 전송</option>
                </FormSelect>
              </FormGroup>

              <ModalFooter style={{ padding: '16px 0 0 0', background: 'transparent' }}>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: '#D97706',
                    color: '#FFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {createMutation.isLoading ? '생성 중...' : '워크플로우 생성'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: '#E6DFD5',
                    color: '#262220',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </ModalFooter>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}
