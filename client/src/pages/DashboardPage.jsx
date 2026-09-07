import React from 'react';
import styled from 'styled-components';
import { 
  Coffee, 
  Users, 
  FileText, 
  Bot, 
  GitBranch, 
  Activity, 
  ArrowUpRight, 
  Sparkles,
  ShieldCheck,
  Clock
} from 'lucide-react';

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px;
`;

const HeroBanner = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary} 0%, #2A1816 100%);
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 36px 32px;
  color: ${({ theme }) => theme.colors.textWhite};
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    right: -40px;
    bottom: -40px;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(217, 119, 6, 0.25) 0%, transparent 70%);
    border-radius: 50%;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    padding: 28px 20px;
  }
`;

const HeroTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1;
`;

const PlatformBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accentLight};
  width: fit-content;
`;

const HeroTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.3;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 22px;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.8);
  max-width: 600px;
  line-height: 1.5;
`;

const QuickActionGroup = styled.div`
  display: flex;
  gap: 12px;
  z-index: 1;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 14px;
  font-weight: 600;
  background-color: ${({ $primary, theme }) => 
    $primary ? theme.colors.accent : 'rgba(255, 255, 255, 0.15)'};
  color: ${({ theme }) => theme.colors.textWhite};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    background-color: ${({ $primary, theme }) => 
      $primary ? theme.colors.accentHover : 'rgba(255, 255, 255, 0.25)'};
    transform: translateY(-2px);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: ${({ theme }) => theme.transitions.normal};

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme }) => theme.colors.borderFocus};
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const IconWrapper = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $bgColor }) => $bgColor};
  color: ${({ $color }) => $color};
`;

const StatBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const StatValue = styled.div`
  font-size: 30px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.5px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const SectionCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 26px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ModuleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ModuleItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const ModuleInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const ModuleTitle = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const ModuleDesc = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const StatusPill = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ $active, theme }) => 
    $active ? theme.colors.successBg : theme.colors.warningBg};
  color: ${({ $active, theme }) => 
    $active ? theme.colors.success : theme.colors.warning};
`;

export default function DashboardPage() {
  const stats = [
    {
      title: '가입 대기 팀원 (RBAC)',
      value: '2명',
      label: '팀장 승인 대기 중',
      icon: Users,
      bgColor: '#FFFBEB',
      color: '#D97706',
      badge: '승인 필요',
    },
    {
      title: '등록된 사내 문서',
      value: '14건',
      label: 'PDF / Word / PPT 자동 파싱',
      icon: FileText,
      bgColor: '#EFF6FF',
      color: '#2563EB',
      badge: 'Storage 연동',
    },
    {
      title: 'AI 지식 RAG & 상담',
      value: '128회',
      label: 'Gemini 3단 자동 요약 완료',
      icon: Bot,
      bgColor: '#F5F3FF',
      color: '#7C3AED',
      badge: 'pgvector 가동',
    },
    {
      title: '자동화 워크플로우',
      value: '6개',
      label: 'Cron & Webhook 연동 중',
      icon: GitBranch,
      bgColor: '#ECFDF5',
      color: '#059669',
      badge: '실시간 가동',
    },
  ];

  const modules = [
    {
      title: '스마트 문서 관리 & 공지 자동화',
      desc: 'PDF/Word/PPT 업로드 ➔ 텍스트 추출 ➔ 사내 공지 & Discord/Notion 알림',
      icon: FileText,
      status: '준비 완료',
      active: true,
    },
    {
      title: 'AI 고객 응대 및 3단 대화 요약',
      desc: 'Gemini RAG 질의응답 ➔ 핵심 문의/조치 사항/추가 확인 3단 요약 리포트',
      icon: Sparkles,
      status: '준비 완료',
      active: true,
    },
    {
      title: '워크플로우(시나리오) 엔진',
      desc: 'GitHub/Jira 웹훅 및 Cron 트리거 ➔ DB 적재 & 디스코드 웹훅 액션',
      icon: GitBranch,
      status: '가동 중',
      active: true,
    },
    {
      title: '팀원 권한(RBAC) 승인 관리',
      desc: '신규 가입자 pending 대기열 검토 및 팀원 승인(Approved) 권한 제어',
      icon: ShieldCheck,
      status: '관리자 전용',
      active: true,
    },
  ];

  return (
    <DashboardContainer>
      {/* 히어로 배너 */}
      <HeroBanner>
        <HeroTextGroup>
          <PlatformBadge>
            <Coffee size={15} /> 수호카페 통합 자동화 플랫폼 v1.0
          </PlatformBadge>
          <HeroTitle>수호카페 업무 자동화 허브에 오신 것을 환영합니다</HeroTitle>
          <HeroSubtitle>
            문서 업로드 공지화, AI 지식 RAG 상담, 그리고 외부 툴(GitHub, Jira, Discord, Notion) 연동 워크플로우를 한곳에서 손쉽게 제어하세요.
          </HeroSubtitle>
        </HeroTextGroup>
        <QuickActionGroup>
          <ActionButton $primary>
            <Sparkles size={16} /> AI 상담 시작
          </ActionButton>
          <ActionButton>
            <FileText size={16} /> 문서 업로드
          </ActionButton>
        </QuickActionGroup>
      </HeroBanner>

      {/* 핵심 통계 카드 그리드 */}
      <StatsGrid>
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <StatCard key={idx}>
              <StatHeader>
                <IconWrapper $bgColor={item.bgColor} $color={item.color}>
                  <Icon size={22} />
                </IconWrapper>
                <StatBadge>{item.badge}</StatBadge>
              </StatHeader>
              <div>
                <StatValue>{item.value}</StatValue>
                <StatLabel>{item.title}</StatLabel>
              </div>
            </StatCard>
          );
        })}
      </StatsGrid>

      {/* 하단 모듈 현황 */}
      <ContentGrid>
        <SectionCard>
          <SectionHeader>
            <SectionTitle>
              <Activity size={20} color="#D97706" /> 핵심 자동화 모듈 현황
            </SectionTitle>
          </SectionHeader>
          <ModuleList>
            {modules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <ModuleItem key={idx}>
                  <ModuleInfo>
                    <Icon size={20} color="#4A2C2A" />
                    <div>
                      <ModuleTitle>{mod.title}</ModuleTitle>
                      <ModuleDesc>{mod.desc}</ModuleDesc>
                    </div>
                  </ModuleInfo>
                  <StatusPill $active={mod.active}>{mod.status}</StatusPill>
                </ModuleItem>
              );
            })}
          </ModuleList>
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>
              <Clock size={20} color="#D97706" /> 최근 시스템 활동
            </SectionTitle>
          </SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: '#6E6763', lineHeight: '1.6' }}>
              • <strong>[문서 파싱]</strong> 2026_가맹점_운영매뉴얼.pdf 파싱 완료 (텍스트 적재)<br />
              • <strong>[알림 발송]</strong> Discord #공지 채널 웹훅 전송 성공<br />
              • <strong>[AI 요약]</strong> 세션 #104 상담 종료 및 3단 요약 리포트 저장<br />
              • <strong>[RBAC]</strong> 신규 팀원 (user@suho.com) 가입 대기 등록
            </div>
          </div>
        </SectionCard>
      </ContentGrid>
    </DashboardContainer>
  );
}
