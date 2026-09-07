import React, { useState } from 'react';
import styled from 'styled-components';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin, RefreshCw, Search, X, CalendarCheck } from 'lucide-react';
import useCalendar from '../hooks/useCalendar';

const Page = styled.div`
  padding: 32px; max-width: 1500px; width: 100%; margin: 0 auto;
  @media (max-width: 768px) { padding: 20px 14px; }
`;
const Header = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; margin-bottom: 24px;
  h1 { display: flex; align-items: center; gap: 10px; font-size: 26px; color: ${({ theme }) => theme.colors.primary}; }
  p { margin-top: 8px; color: ${({ theme }) => theme.colors.textSecondary}; font-size: 14px; line-height: 1.7; }
`;
const Actions = styled.div`display: flex; gap: 8px; flex-wrap: wrap; align-items: center;`;
const Button = styled.button`
  display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 13px;
  font-size: 13px; font-weight: 600; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 8px;
  background: ${({ $primary, theme }) => $primary ? theme.colors.primary : theme.colors.surface};
  color: ${({ $primary, theme }) => $primary ? '#fff' : theme.colors.textPrimary};
  text-decoration: none; cursor: pointer;
  &:hover:not(:disabled) { opacity: .85; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.accent}; outline-offset: 2px; }
`;
const SyncBanner = styled.div`
  border: 1px solid ${({ $warning, theme }) => $warning ? '#F0D7AA' : theme.colors.border};
  background: ${({ $warning }) => $warning ? '#FFFBEB' : '#fff'}; padding: 16px 18px; border-radius: 12px;
  margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
  strong { font-size: 14px; display: block; margin-bottom: 4px; }
  p, span { font-size: 12px; color: ${({ theme }) => theme.colors.textSecondary}; line-height: 1.7; }
`;
const Stats = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 22px;
  div { padding: 18px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px; background: #fff; }
  span { display: block; color: ${({ theme }) => theme.colors.textSecondary}; font-size: 12px; margin-bottom: 8px; }
  strong { color: ${({ theme }) => theme.colors.primary}; font-size: 25px; }
  @media (max-width: 480px) { gap: 8px; div { padding: 12px; } strong { font-size: 21px; } }
`;
const Grid = styled.div`
  display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(300px, 1fr); gap: 22px; align-items: start;
  @media (max-width: 1100px) { grid-template-columns: minmax(0, 1fr); }
`;
const Card = styled.section`
  min-width: 0; background: #fff; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 14px; overflow: hidden;
`;
const CardHeader = styled.div`
  padding: 18px; border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  h2 { font-size: 17px; color: ${({ theme }) => theme.colors.primary}; }
  p { color: ${({ theme }) => theme.colors.textSecondary}; font-size: 12px; margin-top: 5px; }
`;
const CalendarTable = styled.table`
  width: 100%; table-layout: fixed; border-collapse: collapse;
  th { padding: 14px 0; font-size: 12px; font-weight: 600; color: ${({ theme }) => theme.colors.textSecondary}; }
  th:first-child { color: #C35242; } th:last-child { color: #3E73AA; }
  td { padding: 3px; vertical-align: top; border-top: 1px solid #F1EDE6; }
`;
const Day = styled.button`
  width: 100%; min-height: 94px; border-radius: 8px; padding: 8px 5px; display: flex; flex-direction: column; align-items: flex-start; gap: 5px;
  background: ${({ $selected }) => $selected ? '#FEF3C7' : 'transparent'};
  border: 1px solid ${({ $selected }) => $selected ? '#D97706' : 'transparent'};
  color: ${({ $outside, theme }) => $outside ? theme.colors.textMuted : theme.colors.textPrimary};
  opacity: ${({ $outside }) => $outside ? '.5' : '1'};
  > span:first-child { font-size: 13px; font-weight: 700; padding: 3px 5px; border-radius: 50%; background: ${({ $today }) => $today ? '#4A2C2A' : 'transparent'}; color: ${({ $today }) => $today ? '#fff' : 'inherit'}; }
  &:hover:not(:disabled) { background: #F5ECE8; }
  &:focus-visible { outline: 2px solid #D97706; outline-offset: -2px; }
  @media (max-width: 480px) { min-height: 75px; padding: 6px 2px; }
`;
const DayEvent = styled.span`
  display: block; max-width: 100%; font-size: 10px; color: #865431; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
const Footnote = styled.p`
  padding: 14px 18px; color: ${({ theme }) => theme.colors.textSecondary}; font-size: 12px; line-height: 1.7; border-top: 1px solid ${({ theme }) => theme.colors.border};
`;
const SearchBox = styled.label`
  display: flex; align-items: center; gap: 8px; margin: 16px; padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 8px; color: ${({ theme }) => theme.colors.textMuted};
  input { width: 100%; min-width: 0; border: 0; outline: none; padding: 0; font-size: 13px; box-shadow: none; }
  &:focus-within { border-color: #D97706; }
`;
const List = styled.div`padding: 0 16px 16px; display: flex; flex-direction: column; gap: 10px; max-height: 510px; overflow-y: auto;`;
const EventButton = styled.button`
  text-align: left; width: 100%; border: 1px solid ${({ $selected }) => $selected ? '#D97706' : '#E6DFD5'}; border-radius: 10px;
  padding: 14px; background: ${({ $selected }) => $selected ? '#FFFBEB' : '#FAF8F5'}; color: #262220;
  strong { display: block; font-size: 14px; margin: 8px 0; overflow-wrap: anywhere; }
  p { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6E6763; line-height: 1.7; }
  &:focus-visible { outline: 2px solid #D97706; }
`;
const EventMeta = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between; font-size: 11px; color: #6E6763;
`;
const Badge = styled.span`
  padding: 3px 7px; border-radius: 20px; background: ${({ $active }) => $active ? '#FEF3C7' : '#EDE8E0'}; color: ${({ $active }) => $active ? '#A1580A' : '#6E6763'};
`;
const Empty = styled.div`padding: 32px 16px; text-align: center; color: #6E6763; font-size: 13px; line-height: 1.8; svg { margin-bottom: 10px; color: #A09893; }`;
const Detail = styled.div`
  padding: 18px; h3 { font-size: 17px; margin-bottom: 14px; overflow-wrap: anywhere; }
  p { font-size: 13px; color: #6E6763; line-height: 1.8; display: flex; align-items: flex-start; gap: 7px; margin-bottom: 8px; }
  svg { flex-shrink: 0; margin-top: 4px; }
  pre { margin-top: 16px; padding: 14px; background: #FAF8F5; border-radius: 8px; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; font-size: 13px; line-height: 1.8; }
`;

export function koreaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}
export function occursOn(event, day) {
  const start = new Date(`${day}T00:00:00+09:00`).getTime();
  return new Date(event.start_at).getTime() < start + 86400000 && new Date(event.end_at).getTime() > start;
}
function monthKey(date) { return date.toISOString().slice(0, 7); }
function monthShift(month, amount) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return monthKey(date);
}
function dateLabel(day) { return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${day}T12:00:00+09:00`)); }
function eventTime(event) { return event.all_day ? '종일' : `${event.start_time} – ${event.end_time}`; }
function eventStatus(event) { return event.timing_status === 'in_progress' ? '진행 중' : event.timing_status === 'imminent' ? '곧 시작' : '예정'; }

export default function CalendarPage() {
  const { data, isLoading, isFetching, error, syncMutation } = useCalendar();
  const today = koreaDateKey();
  const firstMonth = today.slice(0, 7);
  const lastDay = koreaDateKey(new Date(new Date(`${today}T00:00:00+09:00`).getTime() + 89 * 86400000));
  const [month, setMonth] = useState(firstMonth);
  const [selectedDay, setSelectedDay] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const events = data?.events || [];
  const sync = data?.sync;
  const syncError = error || syncMutation.error;
  const canShowEmpty = sync?.status === 'synced' || sync?.stale;
  const selectedEvent = events.find(event => event.id === selectedEventId);
  const monthStart = new Date(`${month}-01T00:00:00+09:00`);
  const nextMonth = new Date(`${monthShift(month, 1)}-01T00:00:00+09:00`);
  const monthEvents = events.filter(event => new Date(event.start_at) < nextMonth && new Date(event.end_at) > monthStart);
  const visibleEvents = monthEvents.filter(event => (!selectedDay || occursOn(event, selectedDay)) && `${event.title} ${event.location} ${event.description}`.toLowerCase().includes(search.toLowerCase().trim()));
  const calendarStart = new Date(`${month}-01T00:00:00Z`);
  calendarStart.setUTCDate(1 - calendarStart.getUTCDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(calendarStart.getTime() + index * 86400000).toISOString().slice(0, 10));
  const [year, monthNumber] = month.split('-');
  const changeMonth = (amount) => { setMonth(monthShift(month, amount)); setSelectedDay(null); setSelectedEventId(null); };

  return <Page>
    <Header>
      <div><h1><CalendarDays size={28} /> 일정 관리</h1><p>구글 캘린더에 등록한 매장 일정을 한눈에 확인하세요.<br />등록·수정·삭제한 일정은 알림과 일정표에 자동으로 반영됩니다.</p></div>
      <Actions>
        <Button onClick={() => syncMutation.mutate()} disabled={isFetching || syncMutation.isPending}><RefreshCw size={15} />{isFetching || syncMutation.isPending ? '확인 중…' : '새로고침'}</Button>
        <Button as="a" $primary href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />구글 캘린더에서 관리</Button>
      </Actions>
    </Header>
    <SyncBanner role="status" $warning={!!syncError || sync?.status !== 'synced'}>
      <div><strong>{isLoading ? '캘린더 연결 확인 중' : sync?.status === 'not_configured' ? '구글 캘린더 연결이 필요합니다' : syncError || sync?.status === 'error' ? '일정을 다시 확인해주세요' : '구글 캘린더 자동 반영 중'}</strong>
        <p>{syncError && !syncMutation.error?.response?.data?.sync ? '일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : sync?.message || '등록된 일정을 불러오고 있습니다.'}</p>
        {sync?.status === 'not_configured' && <p>캘린더 연결이 완료되면 이곳에 일정이 표시됩니다.</p>}
      </div>
      <div><span>15초마다 확인 · 한국 시간 · 앞으로 90일</span>{sync?.lastSyncedAt && <p>마지막 반영 {new Date(sync.lastSyncedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}{sync.stale ? ' · 이전 일정 표시 중' : ''}</p>}</div>
    </SyncBanner>
    <Stats aria-label="일정 현황">
      <div><span>오늘 예정·진행 일정</span><strong>{canShowEmpty ? events.filter(event => occursOn(event, today)).length : '—'}</strong></div>
      <div><span>조회 중인 달의 일정</span><strong>{canShowEmpty ? monthEvents.length : '—'}</strong></div>
      <div><span>전체 예정 일정 · 90일</span><strong>{canShowEmpty ? events.length : '—'}</strong></div>
    </Stats>
    <Grid>
      <Card aria-label="월별 일정 달력">
        <CardHeader><div><h2>{year}년 {Number(monthNumber)}월</h2><p>날짜를 선택하면 해당 일정만 볼 수 있습니다.</p></div>
          <Actions><Button aria-label="이전 달" disabled={month <= firstMonth} onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></Button>
            <Button onClick={() => { setMonth(firstMonth); setSelectedDay(today); setSelectedEventId(null); }}>오늘</Button>
            <Button aria-label="다음 달" disabled={month >= lastDay.slice(0, 7)} onClick={() => changeMonth(1)}><ChevronRight size={16} /></Button></Actions>
        </CardHeader>
        <CalendarTable aria-label={`${year}년 ${Number(monthNumber)}월 달력`}>
          <thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
          <tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(day => {
            const daily = events.filter(event => occursOn(event, day));
            const outside = !day.startsWith(month) || day < today || day > lastDay;
            return <td key={day}><Day disabled={outside} $outside={outside} $today={day === today} $selected={selectedDay === day} aria-pressed={selectedDay === day} aria-label={`${day} 일정 ${daily.length}건`} onClick={() => { setSelectedDay(day); setSelectedEventId(null); }}>
              <span>{Number(day.slice(8))}</span>{daily.slice(0, 2).map(event => <DayEvent key={event.id}>{event.title}</DayEvent>)}{daily.length > 2 && <DayEvent>+{daily.length - 2}건</DayEvent>}
            </Day></td>;
          })}</tr>)}</tbody>
        </CalendarTable>
        <Footnote>완료된 일정은 제외합니다. 종일·여러 날에 걸친 일정은 해당 날짜마다 표시됩니다.</Footnote>
      </Card>
      <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
        <Card aria-label="일정 목록">
          <CardHeader><div><h2>{selectedDay ? dateLabel(selectedDay) : `${Number(monthNumber)}월 전체 일정`}</h2><p>{canShowEmpty ? `${visibleEvents.length}건의 일정` : '일정 연결 대기'}</p></div>
            {selectedDay && <Button onClick={() => { setSelectedDay(null); setSelectedEventId(null); }}>이번 달 전체</Button>}
          </CardHeader>
          <SearchBox><Search size={16} /><input aria-label="일정 검색" placeholder="일정 이름, 장소, 내용 검색" value={search} onChange={event => setSearch(event.target.value)} /></SearchBox>
          <List>{isLoading ? <Empty>일정을 불러오고 있습니다.</Empty> : !visibleEvents.length ? <Empty><CalendarCheck size={28} /><div>{!canShowEmpty ? '구글 캘린더가 연결되면 일정을 확인할 수 있습니다.' : search ? '검색 조건에 맞는 일정이 없습니다.' : '선택한 기간에 예정된 일정이 없습니다.'}</div></Empty> : visibleEvents.map(event =>
            <EventButton key={event.id} $selected={selectedEventId === event.id} aria-label={`${event.title} 상세 보기`} aria-pressed={selectedEventId === event.id} onClick={() => setSelectedEventId(event.id)}>
              <EventMeta><span>{dateLabel(event.event_date)}{event.end_date !== event.event_date ? ` ~ ${dateLabel(event.end_date)}` : ''}</span><Badge $active={event.should_alert}>{eventStatus(event)}</Badge></EventMeta>
              <strong>{event.title}</strong><p><Clock size={13} />{eventTime(event)}</p>{event.location && <p><MapPin size={13} />{event.location}</p>}
            </EventButton>)}</List>
        </Card>
        {selectedEvent && <Card aria-label="일정 상세">
          <CardHeader><h2>일정 상세</h2><Button aria-label="일정 상세 닫기" onClick={() => setSelectedEventId(null)}><X size={16} /></Button></CardHeader>
          <Detail><h3>{selectedEvent.title}</h3><p><CalendarDays size={15} />{selectedEvent.event_date}{selectedEvent.end_date !== selectedEvent.event_date ? ` ~ ${selectedEvent.end_date}` : ''}</p>
            <p><Clock size={15} />{eventTime(selectedEvent)} · 한국 시간</p><p><MapPin size={15} />{selectedEvent.location || '등록된 장소가 없습니다.'}</p>
            <pre>{selectedEvent.description || '등록된 상세 내용이 없습니다.'}</pre>
          </Detail>
        </Card>}
      </div>
    </Grid>
  </Page>;
}
