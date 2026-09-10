import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import useCalendar from '../../hooks/useCalendar';
import useCalendarReadState from '../../hooks/useCalendarReadState';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Coffee, 
  LayoutDashboard, 
  FileText, 
  Bot, 
  GitBranch, 
  History, 
  Users, 
  Menu, 
  X,
  Bell,
  Shield,
  LogOut,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle,
  Plus,
  ExternalLink,
  Sparkles
} from 'lucide-react';

const LayoutWrapper = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Sidebar = styled.aside`
  width: 260px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textWhite};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px 16px;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  transition: ${({ theme }) => theme.transitions.smooth};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    box-shadow: ${({ $isOpen, theme }) => ($isOpen ? theme.shadows.lg : 'none')};
  }
`;

const BrandSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px 28px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
`;

const BrandLogo = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textWhite};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const BrandName = styled.div`
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.3px;
`;

const BrandDesc = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
`;

const NavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 24px;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 14px;
  font-weight: 500;
  color: ${({ $active, theme }) => ($active ? theme.colors.textWhite : 'rgba(255, 255, 255, 0.75)')};
  background: ${({ $active, theme }) => ($active ? 'rgba(255, 255, 255, 0.15)' : 'transparent')};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${({ theme }) => theme.colors.textWhite};
  }
`;

const UserSection = styled.div`
  padding: 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
`;

const UserName = styled.div`
  font-size: 13px;
  font-weight: 600;
`;

const UserRole = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.accentLight};
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 260px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-left: 0;
  }
`;

const TopHeader = styled.header`
  height: 64px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 50;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 0 16px;
  }
`;

const MobileMenuBtn = styled.button`
  display: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: block;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.success};
  background: ${({ theme }) => theme.colors.successBg};
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
`;

const PulseDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.success};
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
`;

const pulseBadge = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const NotificationBox = styled.div`
  position: relative;
`;

const BellButton = styled.button`
  position: relative;
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${({ theme }) => theme.transitions.fast};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceSubtle};
    color: ${({ theme }) => theme.colors.accent};
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background-color: ${({ theme }) => theme.colors.danger};
  color: white;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  animation: ${pulseBadge} 2s infinite;
`;

/* 구글 캘린더 드롭다운 패널 */
const CalendarDropdownPanel = styled.div`
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 400px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: 200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideDown} 0.2s ease-out;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    position: fixed;
    top: 72px;
    width: calc(100vw - 24px);
    right: 12px;
  }
`;

const DropdownHeader = styled.div`
  padding: 16px 18px;
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DropdownTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DropdownEventsList = styled.div`
  max-height: 360px;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const EventItemCard = styled.div`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $isAlert }) => ($isAlert ? '#FFFBEB' : '#FAF8F5')};
  border: 1px solid ${({ $isAlert, theme }) => ($isAlert ? theme.colors.accent : theme.colors.border)};
  border-left-width: 4px;
  border-left-color: ${({ $isAlert, theme }) => ($isAlert ? theme.colors.accent : theme.colors.primary)};
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: #FFF8E7;
  }
`;

const EventCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
`;

const EventTimeBadge = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TimingBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $isAlert }) => ($isAlert ? '#FEF3C7' : '#E6DFD5')};
  color: ${({ $isAlert, theme }) => ($isAlert ? theme.colors.accentHover : theme.colors.textSecondary)};
`;

const EventTitleText = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-top: 2px;
`;

const EventLocationText = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 4px;
`;

/* 화면 우측 상단 플로팅 알림 팝업 (Toast) */
const FloatingToast = styled.div`
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 150;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1.5px solid ${({ theme }) => theme.colors.accent};
  padding: 16px 20px;
  box-shadow: 0 10px 25px -5px rgba(217, 119, 6, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  gap: 14px;
  max-width: 420px;
  width: calc(100vw - 48px);
  animation: ${slideDown} 0.3s ease-out;
`;

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [latestAlert, setLatestAlert] = useState(null);
  const previousEvents = useRef(null);
  const notifiedAlerts = useRef(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => (await axios.get('/api/auth/me')).data.user,
    retry: false,
  });
  const { data: calendarData, isFetching: isSyncing, isLoading: isCalendarLoading, error: calendarError, syncMutation } = useCalendar();

  const events = calendarData?.events || [];
  const { unreadCount: alertCount, isUnread, markRead, markAllRead } = useCalendarReadState(calendarData, currentUser?.id, calendarOpen);
  const syncState = calendarData?.sync;
  const calendarMessage = calendarError ? '일정을 확인하지 못했습니다. 잠시 후 다시 확인합니다.'
    : syncMutation.error && !syncMutation.error.response?.data?.sync ? '새로고침에 실패했습니다. 잠시 후 다시 시도해주세요.'
    : syncState?.message;

  useEffect(() => {
    if (calendarData?.sync?.status === 'not_configured') {
      previousEvents.current = null;
      notifiedAlerts.current.clear();
      setLatestAlert(null);
      return;
    }
    if (calendarData?.sync?.status !== 'synced') return;
    const current = calendarData.events || [];
    const changed = previousEvents.current && current.filter(event => previousEvents.current.get(event.id) !== event.revision && isUnread(event));
    const newEvent = changed?.[0];
    const imminent = (calendarData.activeAlerts || []).find(event => isUnread(event) && !notifiedAlerts.current.has(`${event.id}:${event.revision}:${event.timing_status}`));
    if (calendarOpen) {
      setLatestAlert(null);
    } else if (newEvent) {
      const wasPresent = previousEvents.current.has(newEvent.id);
      setLatestAlert({ ...newEvent, alert_text: `${wasPresent ? '일정이 변경되었습니다.' : '새 일정이 등록되었습니다.'}${changed.length > 1 ? ` 외 ${changed.length - 1}건도 반영되었습니다.` : ''}` });
    } else if (imminent) {
      setLatestAlert(imminent);
    } else {
      setLatestAlert(previous => previous && current.some(event => event.id === previous.id && isUnread(event)) ? previous : null);
    }
    for (const event of calendarData.activeAlerts || []) notifiedAlerts.current.add(`${event.id}:${event.revision}:${event.timing_status}`);
    previousEvents.current = new Map(current.map(event => [event.id, event.revision]));
  }, [calendarData, calendarOpen, isUnread]);

  const navItems = [
    { label: '대시보드', path: '/', icon: LayoutDashboard },
    { label: '일정 관리', path: '/calendar', icon: Calendar },
    { label: '스마트 문서 관리', path: '/documents', icon: FileText },
    { label: 'AI 상담 & 3단 요약', path: '/chat', icon: Bot },
    { label: '워크플로우 엔진', path: '/workflows', icon: GitBranch },
    { label: '실행 이력 / 모니터링', path: '/logs', icon: History },
    { label: '팀원 승인 (RBAC)', path: '/admin/members', icon: Users },
  ];

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.error(e);
    }
    navigate('/login');
  };

  return (
    <LayoutWrapper>
      {/* 우측 상단 실시간 플로팅 알림 팝업 */}
      {latestAlert && (
        <FloatingToast role="status" aria-live="polite">
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: '#FEF3C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D97706',
            flexShrink: 0
          }}>
            <Calendar size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>
                ⏰ 구글 캘린더 일정 알림
              </span>
              <span style={{ fontSize: '11px', color: '#A09893' }}>
                {latestAlert.event_date} {latestAlert.start_time}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#262220', marginBottom: '4px' }}>
              {latestAlert.title}
            </div>
            <div style={{ fontSize: '12px', color: '#6E6763', marginBottom: '8px' }}>
              {latestAlert.alert_text || latestAlert.description}
            </div>
            <button
              onClick={() => {
                markRead([latestAlert]);
                setLatestAlert(null);
                setCalendarOpen(false);
                navigate('/calendar');
              }}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#D97706',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              전체 일정표 보기 &rarr;
            </button>
          </div>
          <button
            onClick={() => { markRead([latestAlert]); setLatestAlert(null); }}
            aria-label="일정 알림 닫기"
            style={{ color: '#A09893', cursor: 'pointer', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </FloatingToast>
      )}

      {/* 사이드바 */}
      <Sidebar $isOpen={mobileOpen}>
        <div>
          <BrandSection style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <BrandLogo>
              <Coffee size={22} />
            </BrandLogo>
            <div>
              <BrandName>수호카페 플랫폼</BrandName>
              <BrandDesc>Automation & Workflow Hub</BrandDesc>
            </div>
          </BrandSection>

          <NavList>
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavItem 
                  key={idx} 
                  $active={isActive}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavItem>
              );
            })}
          </NavList>
        </div>

        <UserSection>
          <UserInfo>
            <UserAvatar>{currentUser?.name?.slice(0, 1) || '?'}</UserAvatar>
            <div>
              <UserName>{currentUser?.name || '로그인 필요'}</UserName>
              <UserRole>{currentUser ? currentUser.role === 'admin' ? '팀장 (Admin)' : '팀원 (Member)' : '사용자 정보 없음'}</UserRole>
            </div>
          </UserInfo>
          <button 
            title="로그아웃" 
            onClick={handleLogout}
            style={{ color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '6px' }}
          >
            <LogOut size={18} />
          </button>
        </UserSection>
      </Sidebar>

      {/* 메인 영역 */}
      <MainContent>
        <TopHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MobileMenuBtn onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </MobileMenuBtn>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{navItems.find(item => item.path === location.pathname)?.label || '수호카페'}</h3>
          </div>

          <HeaderRight>
            <StatusIndicator>
              수호카페 플랫폼
            </StatusIndicator>

            {/* 구글 캘린더 알림 벨 */}
            <NotificationBox>
              <BellButton 
                onClick={() => {
                  if (!calendarOpen) { markAllRead(); setLatestAlert(null); }
                  setCalendarOpen(!calendarOpen);
                }}
                title="구글 캘린더 매장 일정 알림"
                aria-label={`구글 캘린더 일정 알림 ${alertCount}건`}
                aria-expanded={calendarOpen}
              >
                <Bell size={20} />
                {alertCount > 0 && (
                  <NotificationBadge>{alertCount > 99 ? '99+' : alertCount}</NotificationBadge>
                )}
              </BellButton>

              {/* 캘린더 일정 드롭다운 */}
              {calendarOpen && (
                <CalendarDropdownPanel>
                  <DropdownHeader>
                    <DropdownTitle>
                      <Calendar size={18} color="#D97706" />
                      구글 캘린더 매장 일정표
                    </DropdownTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending || isSyncing}
                        title="구글 캘린더 즉시 동기화"
                        style={{
                          background: '#FEF3C7',
                          color: '#B45309',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RefreshCw size={12} className={syncMutation.isPending || isSyncing ? 'spin' : ''} />
                        새로고침
                      </button>
                      <button 
                        onClick={() => setCalendarOpen(false)}
                        aria-label="일정표 닫기"
                        style={{ color: '#6E6763', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </DropdownHeader>

                  <div role="status" style={{ padding: '10px 16px', fontSize: '12px', lineHeight: 1.6, color: syncState?.status === 'error' || calendarError ? '#B45309' : '#6E6763' }}>
                    {isCalendarLoading ? '구글 캘린더 일정을 확인하고 있습니다.' : calendarMessage}
                    {syncState?.configured && <div>15초마다 확인 · 앞으로 90일 · 한국 시간</div>}
                    {syncState?.lastSyncedAt && <div>마지막 반영: {new Date(syncState.lastSyncedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}{syncState.stale ? ' · 이전 일정 표시 중' : ''}</div>}
                  </div>

                  <DropdownEventsList>
                    {events.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#A09893', fontSize: '13px' }}>
                        {isCalendarLoading ? '일정 불러오는 중…' : syncState?.status === 'synced' ? '앞으로 90일 동안 등록된 일정이 없습니다.' : '연결되면 등록된 일정이 여기에 표시됩니다.'}
                      </div>
                    ) : (
                      events.map((evt) => (
                        <EventItemCard key={evt.id} $isAlert={evt.should_alert}>
                          <EventCardTop>
                            <EventTimeBadge>
                              <Clock size={12} />
                              {evt.event_date}{evt.end_date !== evt.event_date ? ` ~ ${evt.end_date}` : ''}
                              {' · '}{evt.all_day ? '종일' : `${evt.start_time} - ${evt.end_time}`}
                            </EventTimeBadge>
                            <TimingBadge $isAlert={evt.should_alert}>
                              {evt.timing_status === 'imminent' 
                                ? `약 ${evt.diff_minutes}분 후 시작` 
                                : evt.timing_status === 'in_progress'
                                ? '진행 중'
                                : evt.timing_status === 'past'
                                ? '완료됨'
                                : '예정'}
                            </TimingBadge>
                          </EventCardTop>
                          <EventTitleText>{evt.title}</EventTitleText>
                          {evt.location && (
                            <EventLocationText>
                              <MapPin size={11} />
                              {evt.location}
                            </EventLocationText>
                          )}
                        </EventItemCard>
                      ))
                    )}
                  </DropdownEventsList>
                  <button onClick={() => { setCalendarOpen(false); navigate('/calendar'); }} style={{ padding: '14px', color: '#B45309', fontWeight: 700, borderTop: '1px solid #E6DFD5' }}>일정 관리에서 전체 보기 →</button>
                </CalendarDropdownPanel>
              )}
            </NotificationBox>
          </HeaderRight>
        </TopHeader>

        {children}
      </MainContent>
    </LayoutWrapper>
  );
}
