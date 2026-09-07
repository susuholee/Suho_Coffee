import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};
  background: ${({ $danger, theme }) => ($danger ? theme.colors.dangerBg : theme.colors.surface)};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.textPrimary)};
  border: 1px solid ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.border)};

  &:hover {
    background: ${({ $danger, theme }) => ($danger ? '#FEE2E2' : theme.colors.surfaceSubtle)};
  }
`;

/* 상단 건전성 메트릭 카드 */
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 20px 22px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const MetricIconBox = styled.div`
  width: 46px;
  height: 46px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MetricInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetricLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const MetricValue = styled.span`
  font-size: 20px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PulseDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10B981;
  animation: ${pulse} 2s infinite ease-in-out;
`;

/* 필터 & 검색 바 */
const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 420px;
  min-width: 260px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 14px 10px 38px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 13px;
  background: ${({ theme }) => theme.colors.surface};

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const FilterChips = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterChip = styled.button`
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? theme.colors.textWhite : theme.colors.textSecondary)};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

/* 로그 테이블 */
const TableContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
`;

const Thead = styled.thead`
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  th {
    padding: 14px 18px;
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const Tbody = styled.tbody`
  tr {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    transition: ${({ theme }) => theme.transitions.fast};

    &:hover {
      background: ${({ theme }) => theme.colors.primaryLight};
    }

    &:last-child {
      border-bottom: none;
    }
  }

  td {
    padding: 14px 18px;
    color: ${({ theme }) => theme.colors.textPrimary};
    vertical-align: middle;
  }
`;

const StatusTag = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $status, theme }) => ($status === 'success' ? theme.colors.successBg : theme.colors.dangerBg)};
  color: ${({ $status, theme }) => ($status === 'success' ? theme.colors.success : theme.colors.danger)};
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const TriggerTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const LatencyTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #6E6763;
  background: #F1EDE6;
  padding: 2px 6px;
  border-radius: 4px;
`;

/* 상세 모달 */
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
  max-width: 600px;
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
  gap: 16px;
  font-size: 13px;
`;

const DetailRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailLabel = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
`;

const DetailValue = styled.div`
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  word-break: break-all;
  line-height: 1.5;
`;

export default function LogsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SUCCESS' | 'FAILED'
  const [selectedLog, setSelectedLog] = useState(null);

  // 1. 실행 로그 쿼리
  const { data: logsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['executionLogs'],
    queryFn: async () => {
      const res = await axios.get('/api/workflows/logs');
      return res.data?.logs || [];
    },
    refetchInterval: 10000, // 10초마다 자동 폴링
  });

  const logs = logsData || [];

  // 2. 통계 계산
  const metrics = useMemo(() => {
    const total = logs.length;
    if (total === 0) {
      return { total: 0, successRate: '100%', avgLatency: '0ms', healthy: true };
    }
    const successCount = logs.filter(l => l.status === 'success').length;
    const rate = ((successCount / total) * 100).toFixed(1) + '%';
    const totalMs = logs.reduce((acc, cur) => acc + (cur.execution_time_ms || 0), 0);
    const avg = Math.round(totalMs / total) + 'ms';
    return { total, successRate: rate, avgLatency: avg, healthy: successCount >= total * 0.9 };
  }, [logs]);

  // 3. 로그 필터링
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch =
        (log.workflow_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SUCCESS' && log.status === 'success') ||
        (statusFilter === 'FAILED' && log.status === 'failed');

      return matchSearch && matchStatus;
    });
  }, [logs, searchTerm, statusFilter]);

  // 4. 로그 전체 초기화 뮤테이션
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.delete('/api/workflows/logs');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['executionLogs']);
    },
  });

  const handleClearLogs = () => {
    if (window.confirm('모든 실행 이력 로그를 초기화하시겠습니까?')) {
      clearLogsMutation.mutate();
    }
  };

  const formatTrigger = (type) => {
    if (type === 'scheduled') return '⏰ 정기 스케줄러';
    if (type === 'event') return '📁 파일 이벤트';
    return '🔗 웹훅 트리거';
  };

  return (
    <PageContainer>
      {/* 상단 헤더 */}
      <PageHeader>
        <HeaderTitleGroup>
          <PageTitle>
            <History size={26} color="#D97706" />
            실행 이력 및 모니터링 로그
          </PageTitle>
          <PageSubtitle>
            수호카페 자동화 파이프라인의 실행 이력과 노션 연동 결과를 실시간 모니터링합니다.
          </PageSubtitle>
        </HeaderTitleGroup>
        <HeaderActions>
          <ActionButton onClick={() => refetch()} title="새로고침">
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} />
            새로고침
          </ActionButton>
          <ActionButton $danger onClick={handleClearLogs} title="로그 비우기">
            <Trash2 size={14} />
            로그 초기화
          </ActionButton>
        </HeaderActions>
      </PageHeader>

      {/* 건전성 메트릭스 그리드 */}
      <MetricsGrid>
        <MetricCard>
          <MetricIconBox $bg="#EFF6FF" $color="#3B82F6">
            <Layers size={22} />
          </MetricIconBox>
          <MetricInfo>
            <MetricLabel>총 실행 기록</MetricLabel>
            <MetricValue>{metrics.total}건</MetricValue>
          </MetricInfo>
        </MetricCard>

        <MetricCard>
          <MetricIconBox $bg="#ECFDF5" $color="#10B981">
            <CheckCircle2 size={22} />
          </MetricIconBox>
          <MetricInfo>
            <MetricLabel>실행 성공률</MetricLabel>
            <MetricValue>{metrics.successRate}</MetricValue>
          </MetricInfo>
        </MetricCard>

        <MetricCard>
          <MetricIconBox $bg="#FEF3C7" $color="#D97706">
            <Clock size={22} />
          </MetricIconBox>
          <MetricInfo>
            <MetricLabel>평균 소요 시간</MetricLabel>
            <MetricValue>{metrics.avgLatency}</MetricValue>
          </MetricInfo>
        </MetricCard>

        <MetricCard>
          <MetricIconBox $bg="#F5F3FF" $color="#7C3AED">
            <Cpu size={22} />
          </MetricIconBox>
          <MetricInfo>
            <MetricLabel>시스템 관제 상태</MetricLabel>
            <MetricValue>
              <PulseDot /> 정상 가동 중
            </MetricValue>
          </MetricInfo>
        </MetricCard>
      </MetricsGrid>

      {/* 필터 및 검색 바 */}
      <FilterBar>
        <SearchContainer>
          <Search size={16} color="#A09893" style={{ position: 'absolute', left: 12, top: 12 }} />
          <SearchInput
            type="text"
            placeholder="워크플로우명 또는 실행 결과 상세 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>

        <FilterChips>
          <FilterChip
            $active={statusFilter === 'ALL'}
            onClick={() => setStatusFilter('ALL')}
          >
            전체 ({logs.length})
          </FilterChip>
          <FilterChip
            $active={statusFilter === 'SUCCESS'}
            onClick={() => setStatusFilter('SUCCESS')}
          >
            성공만 ({logs.filter(l => l.status === 'success').length})
          </FilterChip>
          <FilterChip
            $active={statusFilter === 'FAILED'}
            onClick={() => setStatusFilter('FAILED')}
          >
            실패 ({logs.filter(l => l.status === 'failed').length})
          </FilterChip>
        </FilterChips>
      </FilterBar>

      {/* 로그 데이터 테이블 */}
      <TableContainer>
        <Table>
          <Thead>
            <tr>
              <th>실행 일시</th>
              <th>워크플로우 이름</th>
              <th>트리거 유형</th>
              <th>상태</th>
              <th>실행 상세 내용</th>
              <th>소요 시간</th>
              <th>상세</th>
            </tr>
          </Thead>
          <Tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#A09893' }}>
                  조건에 맞는 실행 로그가 없습니다.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isSuccess = log.status === 'success';
                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', color: '#6E6763', fontSize: '12px' }}>
                      {new Date(log.executed_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={14} color="#D97706" />
                        {log.workflow_name}
                      </div>
                    </td>
                    <td>
                      <TriggerTag>{formatTrigger(log.trigger_type)}</TriggerTag>
                    </td>
                    <td>
                      <StatusTag $status={log.status}>
                        {isSuccess ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        {isSuccess ? 'SUCCESS' : 'FAILED'}
                      </StatusTag>
                    </td>
                    <td style={{ maxWidth: '380px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span title={log.details}>{log.details}</span>
                    </td>
                    <td>
                      <LatencyTag>{log.execution_time_ms || 0}ms</LatencyTag>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{
                          background: 'transparent',
                          color: '#D97706',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <FileText size={13} />
                        보기
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </TableContainer>

      {/* 로그 상세 확인 모달 */}
      {selectedLog && (
        <ModalOverlay onClick={() => setSelectedLog(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#D97706" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>실행 로그 상세 정보</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} style={{ cursor: 'pointer', color: '#6E6763' }}>
                <X size={18} />
              </button>
            </ModalHeader>

            <ModalBody>
              <DetailRow>
                <DetailLabel>로그 ID</DetailLabel>
                <DetailValue>{selectedLog.id}</DetailValue>
              </DetailRow>

              <DetailRow>
                <DetailLabel>워크플로우 명</DetailLabel>
                <DetailValue>{selectedLog.workflow_name} ({selectedLog.workflow_id})</DetailValue>
              </DetailRow>

              <DetailRow>
                <DetailLabel>실행 상태 & 소요 시간</DetailLabel>
                <DetailValue style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StatusTag $status={selectedLog.status}>
                    {selectedLog.status === 'success' ? 'SUCCESS' : 'FAILED'}
                  </StatusTag>
                  <span>소요 시간: {selectedLog.execution_time_ms}ms</span>
                </DetailValue>
              </DetailRow>

              <DetailRow>
                <DetailLabel>실행 일시</DetailLabel>
                <DetailValue>{new Date(selectedLog.executed_at).toLocaleString('ko-KR')}</DetailValue>
              </DetailRow>

              <DetailRow>
                <DetailLabel>실행 결과 상세 (노션 연동 등)</DetailLabel>
                <DetailValue>{selectedLog.details}</DetailValue>
              </DetailRow>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}
