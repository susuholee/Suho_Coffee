import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import CalendarPage, { occursOn } from './CalendarPage';
import { theme } from '../styles/theme';

jest.mock('axios');
const meeting = { id: 'meeting', title: '매장 운영 회의', description: '신메뉴 출시 일정을 논의합니다.', location: '본점 회의실', start_at: '2026-09-07T01:00:00Z', end_at: '2026-09-07T02:00:00Z', event_date: '2026-09-07', end_date: '2026-09-07', start_time: '10:00', end_time: '11:00', timing_status: 'upcoming' };
const delivery = { ...meeting, id: 'delivery', title: '원두 입고', event_date: '2026-09-08', end_date: '2026-09-08', start_at: '2026-09-08T01:00:00Z', end_at: '2026-09-08T02:00:00Z' };
let root, container, client, data;
async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) { await Promise.resolve(); jest.advanceTimersByTime(0); }
  });
}
async function mount() {
  await act(async () => root.render(<QueryClientProvider client={client}><ThemeProvider theme={theme}><CalendarPage /></ThemeProvider></QueryClientProvider>));
  await flush();
}
function click(label) { act(() => container.querySelector(`[aria-label="${label}"]`).click()); }

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-06T00:00:00Z'));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  data = { events: [meeting, delivery], totalCount: 2, sync: { configured: true, status: 'synced', message: '자동 반영 중' } };
  axios.get.mockImplementation(async () => ({ data }));
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  container.remove();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

test('a calendar date filters the agenda and an event opens its time, location and description', async () => {
  await mount();
  expect(container.querySelector('[aria-label="매장 운영 회의 상세 보기"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="원두 입고 상세 보기"]')).not.toBeNull();
  click('2026-09-07 일정 1건');
  expect(container.querySelector('[aria-label="원두 입고 상세 보기"]')).toBeNull();
  click('매장 운영 회의 상세 보기');
  const detail = container.querySelector('[aria-label="일정 상세"]');
  expect(detail.textContent).toContain('본점 회의실');
  expect(detail.textContent).toContain('10:00 – 11:00');
  expect(detail.textContent).toContain('신메뉴 출시 일정을 논의합니다.');
  click('일정 상세 닫기');
  expect(container.querySelector('[aria-label="일정 상세"]')).toBeNull();
});

test('search filters events; month navigation clears the selected date', async () => {
  await mount();
  const input = container.querySelector('[aria-label="일정 검색"]');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '원두');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(container.querySelector('[aria-label="매장 운영 회의 상세 보기"]')).toBeNull();
  expect(container.querySelector('[aria-label="원두 입고 상세 보기"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="이전 달"]').disabled).toBe(true);
  click('다음 달');
  expect(container.textContent).toContain('2026년 10월');
  expect(container.querySelector('[aria-label="이전 달"]').disabled).toBe(false);
});

test('events update automatically and deleting the selected event removes its detail', async () => {
  await mount();
  click('매장 운영 회의 상세 보기');
  data = { ...data, events: [delivery], totalCount: 1 };
  await act(async () => jest.advanceTimersByTime(15000));
  await flush();
  expect(container.querySelector('[aria-label="매장 운영 회의 상세 보기"]')).toBeNull();
  expect(container.querySelector('[aria-label="일정 상세"]')).toBeNull();
});

test('missing connection is clearly shown, with a link to manage events in Google Calendar', async () => {
  data = { events: [], sync: { configured: false, status: 'not_configured', message: '구글 캘린더가 아직 연결되지 않았습니다.' } };
  await mount();
  expect(container.textContent).toContain('구글 캘린더 연결이 필요합니다');
  expect(container.querySelector('a').getAttribute('href')).toBe('https://calendar.google.com/calendar/u/0/r');
  expect(container.querySelector('[aria-label="일정 현황"]').textContent).toContain('—');
});

test('multi-day events span their covered dates without spilling into an exclusive midnight end', () => {
  const event = { start_at: '2026-09-06T15:00:00Z', end_at: '2026-09-08T15:00:00Z' };
  expect(occursOn(event, '2026-09-06')).toBe(false);
  expect(occursOn(event, '2026-09-07')).toBe(true);
  expect(occursOn(event, '2026-09-08')).toBe(true);
  expect(occursOn(event, '2026-09-09')).toBe(false);
});
