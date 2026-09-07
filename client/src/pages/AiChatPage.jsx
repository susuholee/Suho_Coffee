import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Bot,
  User,
  Send,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  X,
  RotateCcw,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Flame,
  Trash2,
} from 'lucide-react';

const pulse = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
`;

const PageContainer = styled.div`
  display: flex;
  height: calc(100vh - 64px);
  background-color: ${({ theme }) => theme.colors.background};
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    height: auto;
  }
`;

/* 좌측 세션 사이드바 */
const SessionSidebar = styled.div`
  width: 320px;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    max-height: 240px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const SidebarHeader = styled.div`
  padding: 20px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SidebarTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NewChatButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textWhite};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 13px;
  font-weight: 600;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
    transform: translateY(-1px);
  }
`;

const SessionList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SessionCard = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $active, theme }) => ($active ? theme.colors.primaryLight : theme.colors.surfaceSubtle)};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.accent : 'transparent')};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
    background: ${({ theme }) => theme.colors.primaryLight};
  }
`;

const SessionCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const SessionCardTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
`;

const StatusTag = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $completed, theme }) => ($completed ? theme.colors.successBg : theme.colors.warningBg)};
  color: ${({ $completed, theme }) => ($completed ? theme.colors.success : theme.colors.warning)};
`;

const SessionCardMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

/* 메인 채팅 영역 */
const ChatMainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.colors.background};
`;

const ChatHeader = styled.div`
  padding: 16px 28px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  z-index: 10;
`;

const ChatHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BotIconBadge = styled.div`
  width: 42px;
  height: 42px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.accent});
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textWhite};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ChatTitle = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const ChatSub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ChatHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SummaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textWhite};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 13px;
  font-weight: 600;
  transition: ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.accentHover};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NotionBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/* 메시지 스크롤 영역 */
const MessageScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

/* 추천 질문 칩 */
const QuickChips = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  margin-bottom: 12px;
`;

const QuickChipTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ChipButton = styled.button`
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryLight};
    border-color: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

/* 메시지 말풍선 */
const MessageRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: ${({ $isUser }) => ($isUser ? 'flex-end' : 'flex-start')};
`;

const MessageAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ $isUser, theme }) => ($isUser ? theme.colors.primary : theme.colors.accent)};
  color: ${({ theme }) => theme.colors.textWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const MessageBubble = styled.div`
  max-width: 68%;
  padding: 14px 18px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background: ${({ $isUser, theme }) => ($isUser ? theme.colors.primary : theme.colors.surface)};
  color: ${({ $isUser, theme }) => ($isUser ? theme.colors.textWhite : theme.colors.textPrimary)};
  border: 1px solid ${({ $isUser, theme }) => ($isUser ? 'transparent' : theme.colors.border)};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const SourceDocsContainer = styled.div`
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const SourceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.primaryLight};
  color: ${({ theme }) => theme.colors.primary};
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  width: fit-content;
`;

const Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent};
  animation: ${pulse} 1.2s infinite ease-in-out;
  animation-delay: ${({ $delay }) => $delay};
`;

/* 하단 입력 폼 */
const ChatInputContainer = styled.form`
  padding: 16px 28px;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InputField = styled.input`
  flex: 1;
  padding: 14px 18px;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.background};
  transition: ${({ theme }) => theme.transitions.fast};

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const SendButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryHover};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* 3단 요약 모달 */
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
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
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

const ModalBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SummaryStepCard = styled.div`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border-left: 4px solid ${({ $color }) => $color};
`;

const StepHeader = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StepText = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0;
`;

const EscalationBox = styled.div`
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $urgent, theme }) => ($urgent ? theme.colors.dangerBg : theme.colors.successBg)};
  border: 1px solid ${({ $urgent, theme }) => ($urgent ? theme.colors.danger : theme.colors.success)};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

export default function AiChatPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const messagesEndRef = useRef(null);

  // 1. 전체 세션 목록 쿼리
  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: async () => {
      const res = await axios.get('/api/chat/sessions');
      return res.data?.sessions || [];
    },
  });

  const sessions = sessionsData || [];

  // 기본 활성 세션 선택
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  // 2. 선택된 세션 상세 쿼리
  const { data: currentSessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ['chatSession', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return null;
      const res = await axios.get(`/api/chat/sessions/${selectedSessionId}`);
      return res.data?.session || null;
    },
    enabled: !!selectedSessionId,
  });

  const currentSession = currentSessionData || null;

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // 3. 신규 세션 생성 뮤테이션
  const createSessionMutation = useMutation({
    mutationFn: async (title = '신규 AI 상담') => {
      const res = await axios.post('/api/chat/sessions', { title });
      return res.data?.session;
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries(['chatSessions']);
      setSelectedSessionId(newSession.id);
      setToastMessage('✨ 새로운 상담 세션이 시작되었습니다.');
      setTimeout(() => setToastMessage(null), 3000);
    },
  });

  // 4. 메시지 전송 및 AI 응답 뮤테이션
  const sendMessageMutation = useMutation({
    mutationFn: async (message) => {
      const res = await axios.post(`/api/chat/sessions/${selectedSessionId}/messages`, { message });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chatSession', selectedSessionId]);
      queryClient.invalidateQueries(['chatSessions']);
    },
    onError: (err) => {
      alert('메시지 전송 오류: ' + (err.response?.data?.message || err.message));
    },
  });

  // 5. 3단 요약 생성 뮤테이션
  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`/api/chat/sessions/${selectedSessionId}/summarize`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chatSession', selectedSessionId]);
      queryClient.invalidateQueries(['chatSessions']);
      setShowSummaryModal(true);
    },
    onError: (err) => {
      alert('요약 생성 오류: ' + (err.response?.data?.message || err.message));
    },
  });

  // 6. 노션 에스컬레이션 전송 뮤테이션
  const escalateMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`/api/chat/sessions/${selectedSessionId}/escalate`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['chatSession', selectedSessionId]);
      queryClient.invalidateQueries(['chatSessions']);
      setToastMessage('🚀 노션 관리자 확인 페이지로 에스컬레이션되었습니다!');
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err) => {
      alert('에스컬레이션 전송 실패: ' + (err.response?.data?.message || err.message));
    },
  });

  // 7. 세션 삭제 뮤테이션
  const deleteSessionMutation = useMutation({
    mutationFn: async (id) => {
      const res = await axios.delete(`/api/chat/sessions/${id}`);
      return res.data;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries(['chatSessions']);
      if (selectedSessionId === deletedId) {
        setSelectedSessionId(null);
      }
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || sendMessageMutation.isLoading) return;
    const msg = inputText.trim();
    setInputText('');
    sendMessageMutation.mutate(msg);
  };

  const handleChipClick = (text) => {
    if (sendMessageMutation.isLoading) return;
    sendMessageMutation.mutate(text);
  };

  return (
    <PageContainer>
      {/* 1. 좌측 세션 사이드바 */}
      <SessionSidebar>
        <SidebarHeader>
          <SidebarTitle>
            <MessageSquare size={18} color="#D97706" />
            상담 이력 목록
          </SidebarTitle>
          <NewChatButton 
            onClick={() => createSessionMutation.mutate('신규 AI 상담')}
            disabled={createSessionMutation.isLoading}
          >
            <Plus size={15} />
            새 상담
          </NewChatButton>
        </SidebarHeader>

        <SessionList>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#A09893', fontSize: '13px' }}>
              진행 중인 상담이 없습니다.<br />'+ 새 상담' 버튼을 눌러보세요.
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === selectedSessionId;
              const isCompleted = s.status === 'completed';
              return (
                <SessionCard
                  key={s.id}
                  $active={isActive}
                  onClick={() => setSelectedSessionId(s.id)}
                >
                  <SessionCardTop>
                    <SessionCardTitle title={s.title}>{s.title}</SessionCardTitle>
                    <StatusTag $completed={isCompleted}>
                      {isCompleted ? '종료됨 (요약)' : '진행 중'}
                    </StatusTag>
                  </SessionCardTop>
                  <SessionCardMeta>
                    <span>{new Date(s.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      title="세션 삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSessionMutation.mutate(s.id);
                      }}
                      style={{ color: '#A09893', padding: '2px', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </SessionCardMeta>
                </SessionCard>
              );
            })
          )}
        </SessionList>
      </SessionSidebar>

      {/* 2. 메인 대화 영역 */}
      <ChatMainArea>
        {/* 상단 액션 바 */}
        <ChatHeader>
          <ChatHeaderLeft>
            <BotIconBadge>
              <Bot size={24} />
            </BotIconBadge>
            <div>
              <ChatTitle>
                {currentSession?.title || '수호봇 AI 실시간 상담'}
              </ChatTitle>
              <ChatSub>
                <ShieldCheck size={14} color="#10B981" />
                사내 매뉴얼 RAG 지식 베이스 동기화 완료
              </ChatSub>
            </div>
          </ChatHeaderLeft>

          <ChatHeaderActions>
            {currentSession?.summary ? (
              <SummaryButton onClick={() => setShowSummaryModal(true)}>
                <CheckCircle2 size={16} />
                3단 요약 보기
              </SummaryButton>
            ) : (
              <SummaryButton
                onClick={() => summarizeMutation.mutate()}
                disabled={summarizeMutation.isLoading || !currentSession || currentSession.messages?.length <= 1}
              >
                <Sparkles size={16} />
                {summarizeMutation.isLoading ? '요약 분석 중...' : '상담 종료 & 3단 요약'}
              </SummaryButton>
            )}

            {currentSession?.notion_escalation && (
              <NotionBadge>
                <ExternalLink size={14} color="#D97706" />
                <a 
                  href={currentSession.notion_escalation.pageUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#D97706', textDecoration: 'none' }}
                >
                  노션 에스컬레이션됨
                </a>
              </NotionBadge>
            )}
          </ChatHeaderActions>
        </ChatHeader>

        {/* 토스트 알림 */}
        {toastMessage && (
          <div style={{
            background: '#4A2C2A',
            color: '#FFF',
            padding: '10px 24px',
            fontSize: '13px',
            fontWeight: '600',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <Sparkles size={16} color="#D97706" />
            {toastMessage}
          </div>
        )}

        {/* 메시지 뷰어 */}
        <MessageScroll>
          {/* 자주 묻는 질문 칩 */}
          <QuickChips>
            <QuickChipTitle>
              <Flame size={14} />
              빠른 질문:
            </QuickChipTitle>
            <ChipButton onClick={() => handleChipClick('2026 수호카페 가맹점 오픈 준비 수칙이 어떻게 되나요?')}>
              ☕ 매장 오픈 준비 수칙
            </ChipButton>
            <ChipButton onClick={() => handleChipClick('아메리카노 표준 레시피와 샷 추출 용량을 알려줘.')}>
              📖 아메리카노 표준 레시피
            </ChipButton>
            <ChipButton onClick={() => handleChipClick('시그니처 블렌드 원두 배합 비율이 어떻게 되나요?')}>
              🌱 시그니처 블렌드 원두 배합
            </ChipButton>
            <ChipButton onClick={() => handleChipClick('에스프레소 머신 압력이 9bar 미만으로 떨어졌을 때 어떻게 조치하나요?')}>
              ⚙️ 머신 추출 압력 이상 조치
            </ChipButton>
          </QuickChips>

          {currentSession?.messages?.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <MessageRow key={msg.id} $isUser={isUser}>
                {!isUser && (
                  <MessageAvatar $isUser={false}>
                    <Bot size={18} />
                  </MessageAvatar>
                )}
                <MessageBubble $isUser={isUser}>
                  <div>{msg.text}</div>
                  {/* 참조 문서 출처 표시 */}
                  {!isUser && msg.source_docs && msg.source_docs.length > 0 && (
                    <SourceDocsContainer>
                      <span style={{ fontSize: '11px', color: '#6E6763', fontWeight: 600 }}>근거 문서:</span>
                      {msg.source_docs.map((doc, idx) => (
                        <SourceBadge key={idx}>
                          <FileText size={11} />
                          {doc.title}
                        </SourceBadge>
                      ))}
                    </SourceDocsContainer>
                  )}
                </MessageBubble>
                {isUser && (
                  <MessageAvatar $isUser={true}>
                    <User size={18} />
                  </MessageAvatar>
                )}
              </MessageRow>
            );
          })}

          {sendMessageMutation.isLoading && (
            <MessageRow $isUser={false}>
              <MessageAvatar $isUser={false}>
                <Bot size={18} />
              </MessageAvatar>
              <TypingIndicator>
                <Dot $delay="0s" />
                <Dot $delay="0.2s" />
                <Dot $delay="0.4s" />
                <span style={{ fontSize: '12px', color: '#6E6763', marginLeft: '6px' }}>
                  수호봇이 사내 매뉴얼을 검색하여 답변을 생성하고 있습니다...
                </span>
              </TypingIndicator>
            </MessageRow>
          )}

          <div ref={messagesEndRef} />
        </MessageScroll>

        {/* 하단 입력 폼 */}
        <ChatInputContainer onSubmit={handleSend}>
          <InputField
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="수호카페 가맹점 운영, 레시피, 머신 관리 수칙을 질문하세요 (엔터로 전송)..."
            disabled={sendMessageMutation.isLoading}
          />
          <SendButton 
            type="submit" 
            disabled={!inputText.trim() || sendMessageMutation.isLoading}
          >
            <Send size={18} />
          </SendButton>
        </ChatInputContainer>
      </ChatMainArea>

      {/* 3. 3단 대화 요약 팝업 모달 */}
      {showSummaryModal && currentSession?.summary && (
        <ModalOverlay onClick={() => setShowSummaryModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#D97706" />
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>AI 상담 3단 자동 요약 결과</h3>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                style={{ cursor: 'pointer', color: '#6E6763' }}
              >
                <X size={20} />
              </button>
            </ModalHeader>

            <ModalBody>
              {/* 1단: 핵심 문의 */}
              <SummaryStepCard $color="#D97706">
                <StepHeader $color="#D97706">
                  <span style={{ padding: '2px 6px', background: '#FEF3C7', borderRadius: '4px' }}>1단</span>
                  핵심 문의 (Inquiry)
                </StepHeader>
                <StepText>{currentSession.summary.inquiry}</StepText>
              </SummaryStepCard>

              {/* 2단: 조치 사항 */}
              <SummaryStepCard $color="#4A2C2A">
                <StepHeader $color="#4A2C2A">
                  <span style={{ padding: '2px 6px', background: '#F5ECE8', borderRadius: '4px' }}>2단</span>
                  조치 사항 (Action Taken)
                </StepHeader>
                <StepText>{currentSession.summary.actionTaken}</StepText>
              </SummaryStepCard>

              {/* 3단: 추가 확인 필요 여부 */}
              <SummaryStepCard $color={currentSession.summary.needsEscalation ? '#EF4444' : '#10B981'}>
                <StepHeader $color={currentSession.summary.needsEscalation ? '#EF4444' : '#10B981'}>
                  <span style={{ 
                    padding: '2px 6px', 
                    background: currentSession.summary.needsEscalation ? '#FEF2F2' : '#ECFDF5', 
                    borderRadius: '4px' 
                  }}>3단</span>
                  추가 확인 필요 여부 (Follow-up)
                </StepHeader>
                <StepText>{currentSession.summary.followUp}</StepText>
              </SummaryStepCard>

              {/* 에스컬레이션 상태 배너 */}
              <EscalationBox $urgent={currentSession.summary.needsEscalation}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {currentSession.summary.needsEscalation ? (
                    <AlertCircle size={22} color="#EF4444" />
                  ) : (
                    <CheckCircle2 size={22} color="#10B981" />
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>
                      {currentSession.summary.needsEscalation 
                        ? '🚨 관리자 현장 확인 및 에스컬레이션 권장' 
                        : '✅ 표준 매뉴얼에 따라 정상 해결된 상담입니다.'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6E6763', marginTop: '2px' }}>
                      사내 노션(Notion) 관리자 DB로 본 3단 요약 리포트를 자동 전송할 수 있습니다.
                    </div>
                  </div>
                </div>
              </EscalationBox>
            </ModalBody>

            <ModalFooter>
              {currentSession?.notion_escalation ? (
                <a
                  href={currentSession.notion_escalation.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    background: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={16} />
                  노션 에스컬레이션 페이지 열기
                </a>
              ) : (
                <button
                  onClick={() => escalateMutation.mutate()}
                  disabled={escalateMutation.isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: '#D97706',
                    color: '#FFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <ArrowRight size={16} />
                  {escalateMutation.isLoading ? '노션 전송 중...' : '노션 관리자 에스컬레이션 전송'}
                </button>
              )}
              <button
                onClick={() => setShowSummaryModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: '#E6DFD5',
                  color: '#262220',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}
