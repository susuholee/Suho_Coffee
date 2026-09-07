import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import AppLayout from './AppLayout';
import { theme } from '../../styles/theme';

jest.mock('axios');

const event = (id, title) => ({ id, title, revision: '1', event_date: '2026-09-07', end_date: '2026-09-07', start_time: '10:00', end_time: '11:00', timing_status: 'upcoming', should_alert: false });
const response = (events) => ({ success: true, events, totalCount: events.length, activeAlerts: [], sync: { configured: true, status: 'synced', message: '구글 캘린더 일정을 자동으로 확인하고 있습니다.', lastSyncedAt: '2026-09-06T00:00:00Z' } });
let root, container, queryClient, current;

async function flush() {
  await act(async () => {
    for (let index = 0; index < 5; index++) {
      await Promise.resolve();
      jest.advanceTimersByTime(0);
    }
  });
}
async function poll() {
  await act(async () => { jest.advanceTimersByTime(15000); });
  await flush();
}
async function mount() {
  await act(async () => {
    root.render(<QueryClientProvider client={queryClient}><ThemeProvider theme={theme}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AppLayout><main>검증 화면</main></AppLayout></MemoryRouter></ThemeProvider></QueryClientProvider>);
  });
  await flush();
}

beforeEach(() => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  current = response([event('existing', '기존 회의')]);
  axios.get.mockImplementation(async () => ({ data: current }));
});

afterEach(() => {
  act(() => root.unmount());
  queryClient.clear();
  container.remove();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

test('new Google events appear automatically, and a dismissed toast reopens only for a different change', async () => {
  await mount();
  expect(container.querySelector('[aria-label="구글 캘린더 일정 알림 1건"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="일정 알림 닫기"]')).toBeNull();

  current = response([...current.events, event('new', '새로 등록한 회의')]);
  await poll();
  expect(axios.get.mock.calls.length).toBeGreaterThan(1);
  expect(container.textContent).toContain('새로 등록한 회의');
  expect(container.textContent).toContain('새 일정이 등록되었습니다.');
  expect(container.querySelector('[aria-label="구글 캘린더 일정 알림 2건"]')).not.toBeNull();
  act(() => container.querySelector('[aria-label="일정 알림 닫기"]').click());
  await poll();
  expect(container.querySelector('[aria-label="일정 알림 닫기"]')).toBeNull();

  current = response([...current.events, event('another', '추가 입고 일정')]);
  await poll();
  expect(container.textContent).toContain('추가 입고 일정');
  expect(container.querySelector('[aria-label="일정 알림 닫기"]')).not.toBeNull();

  current = response([]);
  await poll();
  expect(container.querySelector('[aria-label="일정 알림 닫기"]')).toBeNull();
  expect(container.querySelector('[aria-label="구글 캘린더 일정 알림 0건"]')).not.toBeNull();
});

test('the dropdown shows actual dates and explicit disconnected state without fake events', async () => {
  await mount();
  act(() => container.querySelector('[aria-label="구글 캘린더 일정 알림 1건"]').click());
  expect(container.textContent).toContain('2026-09-07');
  expect(container.textContent).toContain('기존 회의');
  current = { ...response([]), sync: { configured: false, status: 'not_configured', message: '구글 캘린더가 아직 연결되지 않았습니다.' } };
  await poll();
  expect(container.textContent).toContain('구글 캘린더가 아직 연결되지 않았습니다.');
  expect(container.textContent).not.toContain('기존 회의');
});

test('modified events trigger an update notice, and repeated urgent polls do not reopen a dismissed notice', async () => {
  await mount();
  const changed = { ...current.events[0], revision: '2', title: '변경된 회의' };
  current = response([changed]);
  await poll();
  expect(container.textContent).toContain('일정이 변경되었습니다.');
  act(() => container.querySelector('[aria-label="일정 알림 닫기"]').click());
  const urgent = { ...changed, timing_status: 'imminent', should_alert: true, alert_text: '약 30분 후 시작' };
  current = { ...response([urgent]), activeAlerts: [urgent] };
  await poll();
  expect(container.textContent).toContain('약 30분 후 시작');
  act(() => container.querySelector('[aria-label="일정 알림 닫기"]').click());
  await poll();
  expect(container.querySelector('[aria-label="일정 알림 닫기"]')).toBeNull();
});
