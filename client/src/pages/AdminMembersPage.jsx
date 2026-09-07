import React, { useState } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Users, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  UserCheck, 
  UserX,
  Phone,
  AlertCircle,
  RefreshCw,
  Loader2,
  Check
} from 'lucide-react';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
  }
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PageSubtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ToastBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.successBg};
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: ${({ theme }) => theme.colors.success};
  padding: 12px 18px;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 2px;
`;

const TabButton = styled.button`
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $active, theme }) => ($active ? theme.colors.accent : theme.colors.textSecondary)};
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? theme.colors.accent : 'transparent')};
  margin-bottom: -4px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

const BadgeCount = styled.span`
  background-color: ${({ $active, theme }) => 
    $active ? theme.colors.accent : theme.colors.surfaceSubtle};
  color: ${({ $active, theme }) => 
    $active ? theme.colors.textWhite : theme.colors.textSecondary};
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  overflow: hidden;
`;

const TableToolbar = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 280px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  height: 38px;
  padding: 0 14px 0 36px;
  font-size: 13px;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
`;

const Th = styled.th`
  padding: 14px 20px;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.td`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textPrimary};
  vertical-align: middle;
`;

const Tr = styled.tr`
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: #FAF8F5;
  }

  &:last-child td {
    border-bottom: none;
  }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: ${({ $isAdmin, theme }) => ($isAdmin ? theme.colors.accent : '#6D4C41')};
  color: ${({ theme }) => theme.colors.textWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 12px;
  font-weight: 600;

  ${({ $status, theme }) => {
    if ($status === 'approved') {
      return `
        background-color: ${theme.colors.successBg};
        color: ${theme.colors.success};
      `;
    }
    if ($status === 'pending') {
      return `
        background-color: ${theme.colors.warningBg};
        color: ${theme.colors.warning};
      `;
    }
    return `
      background-color: ${theme.colors.dangerBg};
      color: ${theme.colors.danger};
    `;
  }}
`;

const RoleBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  background-color: ${({ $isAdmin, theme }) => 
    $isAdmin ? theme.colors.adminBadgeBg : theme.colors.memberBadgeBg};
  color: ${({ $isAdmin, theme }) => 
    $isAdmin ? theme.colors.adminBadge : theme.colors.memberBadge};
`;

const ActionBtnGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  ${({ $variant, theme }) => {
    if ($variant === 'approve') {
      return `
        background-color: #10B981;
        color: #FFFFFF;
        border: 1px solid #059669;

        &:hover:not(:disabled) {
          background-color: #059669;
          transform: translateY(-1px);
        }
      `;
    }
    if ($variant === 'reject') {
      return `
        background-color: #FEE2E2;
        color: #DC2626;
        border: 1px solid rgba(239, 68, 68, 0.4);

        &:hover:not(:disabled) {
          background-color: #EF4444;
          color: #FFFFFF;
        }
      `;
    }
    return `
      background-color: ${theme.colors.surfaceSubtle};
      color: ${theme.colors.textPrimary};
      border: 1px solid ${theme.colors.border};
    `;
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default function AdminMembersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // 1. React Query를 활용한 가입자 목록 패칭
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('/api/auth/users');
      return res.data.users || [];
    },
    refetchInterval: 3000,
  });

  // 2. React Query Mutation (상태 변경 처리)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await axios.patch(`/api/auth/users/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (resData, variables) => {
      queryClient.invalidateQueries(['users']);
      const isApproved = variables.status === 'approved';
      setToastMessage(isApproved ? '🎉 회원이 성공적으로 승인되었습니다! 이제 해당 계정으로 로그인이 가능합니다.' : '회원 가입이 거절되었습니다.');
      setTimeout(() => setToastMessage(''), 5000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || '처리 중 오류가 발생했습니다.');
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  const users = data || [];

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved');

  const displayedUsers = users
    .filter((u) => {
      if (activeTab === 'pending') return u.status === 'pending';
      if (activeTab === 'approved') return u.status === 'approved';
      return true;
    })
    .filter((u) => {
      const term = searchTerm.toLowerCase();
      return (
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.phone?.includes(term)
      );
    });

  // 브라우저 팝업(window.confirm) 없이 즉각 승인 처리
  const handleApprove = (u) => {
    setProcessingId(u.id);
    statusMutation.mutate({ id: u.id, status: 'approved' });
  };

  const handleReject = (u) => {
    setProcessingId(u.id);
    statusMutation.mutate({ id: u.id, status: 'rejected' });
  };

  return (
    <Container>
      <HeaderSection>
        <TitleGroup>
          <PageTitle>
            <Shield size={24} color="#D97706" /> 팀원 승인 및 권한 관리 (RBAC)
          </PageTitle>
          <PageSubtitle>
            가입 신청한 사내 구성원의 권한을 검토하고, 원클릭으로 시스템 접근 승인(Approved) 또는 거절을 제어합니다.
          </PageSubtitle>
        </TitleGroup>

        <button 
          onClick={() => refetch()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: '#FFFFFF',
            border: '1px solid #E6DFD5',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#6E6763',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} /> 새로고침
        </button>
      </HeaderSection>

      {/* 실시간 알림 토스트 배너 */}
      {toastMessage && (
        <ToastBanner>
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
        </ToastBanner>
      )}

      {/* 탭 네비게이션 */}
      <TabContainer>
        <TabButton 
          $active={activeTab === 'pending'} 
          onClick={() => setActiveTab('pending')}
        >
          <Clock size={16} /> 승인 대기열
          <BadgeCount $active={activeTab === 'pending'}>
            {pendingUsers.length}
          </BadgeCount>
        </TabButton>

        <TabButton 
          $active={activeTab === 'approved'} 
          onClick={() => setActiveTab('approved')}
        >
          <CheckCircle2 size={16} /> 승인 완료 팀원
          <BadgeCount $active={activeTab === 'approved'}>
            {approvedUsers.length}
          </BadgeCount>
        </TabButton>

        <TabButton 
          $active={activeTab === 'all'} 
          onClick={() => setActiveTab('all')}
        >
          <Users size={16} /> 전체 계정
          <BadgeCount $active={activeTab === 'all'}>
            {users.length}
          </BadgeCount>
        </TabButton>
      </TabContainer>

      {/* 테이블 카드 */}
      <Card>
        <TableToolbar>
          <SearchBox>
            <Search 
              size={16} 
              color="#A09893" 
              style={{ position: 'absolute', left: '12px' }} 
            />
            <SearchInput
              type="text"
              placeholder="이름, 이메일, 전화번호 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBox>
          <div style={{ fontSize: '13px', color: '#6E6763' }}>
            총 <strong>{displayedUsers.length}</strong>건
          </div>
        </TableToolbar>

        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>사용자 (이름 / 이메일)</Th>
                <Th>연락처</Th>
                <Th>역할 (Role)</Th>
                <Th>상태</Th>
                <Th>가입 일시</Th>
                <Th style={{ textAlign: 'right' }}>승인 제어</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <Td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    데이터 로딩 중...
                  </Td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <Td colSpan={6}>
                    <EmptyState>
                      <AlertCircle size={40} strokeWidth={1.5} />
                      <div>
                        {activeTab === 'pending' 
                          ? '현재 승인 대기 중인 회원이 없습니다.' 
                          : '해당 조건의 회원이 없습니다.'}
                      </div>
                    </EmptyState>
                  </Td>
                </tr>
              ) : (
                displayedUsers.map((u) => {
                  const isAdmin = u.role === 'admin';
                  const isCurrentProcessing = processingId === u.id;

                  return (
                    <Tr key={u.id}>
                      <Td>
                        <UserCell>
                          <UserAvatar $isAdmin={isAdmin}>
                            {u.name ? u.name.slice(0, 1) : 'U'}
                          </UserAvatar>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: '12px', color: '#6E6763' }}>{u.email}</div>
                          </div>
                        </UserCell>
                      </Td>

                      <Td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Phone size={14} color="#A09893" />
                          {u.phone || '미기재'}
                        </div>
                      </Td>

                      <Td>
                        <RoleBadge $isAdmin={isAdmin}>
                          {isAdmin ? '팀장 (Admin)' : '팀원 (Member)'}
                        </RoleBadge>
                      </Td>

                      <Td>
                        <StatusPill $status={u.status}>
                          {u.status === 'approved' && <CheckCircle2 size={12} />}
                          {u.status === 'pending' && <Clock size={12} />}
                          {u.status === 'rejected' && <XCircle size={12} />}
                          {u.status === 'approved' && '승인 완료'}
                          {u.status === 'pending' && '승인 대기'}
                          {u.status === 'rejected' && '거절됨'}
                        </StatusPill>
                      </Td>

                      <Td style={{ fontSize: '13px', color: '#6E6763' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                      </Td>

                      <Td style={{ textAlign: 'right' }}>
                        {u.status === 'pending' ? (
                          <ActionBtnGroup style={{ justifyContent: 'flex-end' }}>
                            <ActionBtn
                              $variant="approve"
                              onClick={() => handleApprove(u)}
                              disabled={isCurrentProcessing}
                            >
                              {isCurrentProcessing ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  처리 중...
                                </>
                              ) : (
                                <>
                                  <UserCheck size={14} />
                                  승인
                                </>
                              )}
                            </ActionBtn>
                            <ActionBtn
                              $variant="reject"
                              onClick={() => handleReject(u)}
                              disabled={isCurrentProcessing}
                            >
                              <UserX size={14} /> 거절
                            </ActionBtn>
                          </ActionBtnGroup>
                        ) : u.status === 'approved' ? (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            fontSize: '13px', 
                            color: '#10B981', 
                            fontWeight: 700 
                          }}>
                            <Check size={16} /> 정상 이용 중
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: 700 }}>
                            가입 거절됨
                          </span>
                        )}
                      </Td>
                    </Tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrapper>
      </Card>
    </Container>
  );
}
