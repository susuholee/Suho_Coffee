const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCalendarFeed, enrichEvents } = require('../src/services/calendarFeed');
const { createCalendarSync, validateCalendarUrl } = require('../src/services/calendarSync');
const { createCalendarController } = require('../src/controllers/calendarController');

const NOW = new Date('2026-09-06T00:00:00Z'); // Sunday, 09:00 KST
const URL = 'https://calendar.google.com/calendar/ical/example/private-test/basic.ics';
const feed = (...events) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Suho test//EN', ...events, 'END:VCALENDAR'].join('\r\n');
const event = (extra = [], uid = 'test-event') => ['BEGIN:VEVENT', `UID:${uid}`, 'DTSTART:20260906T003000Z', 'DTEND:20260906T013000Z', 'SUMMARY:매장 회의', ...extra, 'END:VEVENT'].join('\r\n');
const custom = (lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');

test('UTC and TZID dates display in Korea; future dates never become today alerts', async () => {
  const events = await parseCalendarFeed(feed(event(), custom(['UID:tomorrow', 'DTSTART;TZID=Asia/Seoul:20260907T093000', 'DTEND;TZID=Asia/Seoul:20260907T103000', 'SUMMARY:내일 회의'])), NOW);
  assert.equal(events[0].start_time, '09:30');
  assert.equal(events[0].end_time, '10:30');
  assert.equal(events[1].event_date, '2026-09-07');
  const data = enrichEvents(events, NOW);
  assert.equal(data.alertCount, 1);
  assert.equal(data.events[1].timing_status, 'upcoming');
});

test('all-day dates retain their calendar day and exclusive end date', async () => {
  const events = await parseCalendarFeed(feed(custom(['UID:day', 'DTSTART;VALUE=DATE:20260906', 'DTEND;VALUE=DATE:20260908', 'SUMMARY:이틀간 행사'])), NOW);
  assert.equal(events.length, 1);
  assert.equal(events[0].event_date, '2026-09-06');
  assert.equal(events[0].end_date, '2026-09-07');
  assert.equal(events[0].start_at, '2026-09-05T15:00:00.000Z');
  assert.equal(events[0].all_day, true);
  assert.equal(enrichEvents(events, new Date('2026-09-07T15:00:00Z')).events.length, 0);
});

test('recurrences respect exceptions, overrides and cancellations', async () => {
  const recurring = event(['RRULE:FREQ=DAILY;COUNT=4', 'EXDATE:20260907T003000Z'], 'daily');
  const moved = custom(['UID:daily', 'RECURRENCE-ID:20260908T003000Z', 'DTSTART:20260908T020000Z', 'DTEND:20260908T030000Z', 'SUMMARY:시간 변경']);
  const cancelled = custom(['UID:daily', 'RECURRENCE-ID:20260909T003000Z', 'DTSTART:20260909T003000Z', 'DTEND:20260909T013000Z', 'STATUS:CANCELLED', 'SUMMARY:취소']);
  const events = await parseCalendarFeed(feed(recurring, moved, cancelled), NOW);
  assert.deepEqual(events.map(e => e.event_date), ['2026-09-06', '2026-09-08']);
  assert.equal(events[1].start_time, '11:00');
  assert.equal(events[1].title, '시간 변경');
});

test('folded text and escaped punctuation are decoded; event IDs survive edits', async () => {
  const source = feed(custom(['UID:folded', 'DTSTART:20260906T003000Z', 'DTEND:20260906T013000Z', 'SUMMARY:긴 일정 ', ' 제목', 'DESCRIPTION:첫 줄\\n둘째 줄\\, 확인', 'LOCATION:매장']));
  const first = (await parseCalendarFeed(source, NOW))[0];
  assert.equal(first.title, '긴 일정 제목');
  assert.equal(first.description, '첫 줄\n둘째 줄, 확인');
  const changed = (await parseCalendarFeed(source.replace('20260906T003000Z', '20260906T010000Z'), NOW))[0];
  assert.equal(first.id, changed.id);
  assert.notEqual(first.revision, changed.revision);
});

test('ended and cancelled events disappear; ongoing overnight events stay', async () => {
  const events = await parseCalendarFeed(feed(event(['STATUS:CANCELLED']), custom(['UID:ongoing', 'DTSTART:20260905T140000Z', 'DTEND:20260906T010000Z', 'SUMMARY:야간 행사']), custom(['UID:past', 'DTSTART:20260905T000000Z', 'DTEND:20260905T010000Z', 'SUMMARY:지난 일정'])), NOW);
  assert.equal(events.length, 1);
  assert.equal(enrichEvents(events, NOW).events[0].timing_status, 'in_progress');
});

test('an empty valid feed is distinct from an invalid response', async () => {
  assert.deepEqual(await parseCalendarFeed(feed(), NOW), []);
  await assert.rejects(parseCalendarFeed('<html>Sign in</html>', NOW));
});

test('GET automatically fetches, caches briefly, and reflects additions and removals', async () => {
  let clock = NOW.getTime(), calls = 0, content = feed(event());
  const service = createCalendarSync({ getUrl: () => URL, now: () => new Date(clock), fetchFeed: async () => { calls++; return { data: content }; } });
  assert.equal((await service.getEventsWithAlerts()).totalCount, 1);
  await service.getEventsWithAlerts();
  assert.equal(calls, 1);
  content = feed(event(), event([], 'added'));
  clock += 15001;
  assert.equal((await service.getEventsWithAlerts()).totalCount, 2);
  content = feed();
  clock += 15001;
  assert.equal((await service.getEventsWithAlerts()).totalCount, 0);
  assert.equal(calls, 3);
});

test('concurrent polling coalesces into one request; manual refresh bypasses cache', async () => {
  let calls = 0;
  const service = createCalendarSync({ getUrl: () => URL, now: () => NOW, fetchFeed: async () => { calls++; return { data: feed(event()) }; } });
  const responses = await Promise.all([service.getEventsWithAlerts(), service.getEventsWithAlerts(), service.getEventsWithAlerts()]);
  assert.equal(calls, 1);
  assert.ok(responses.every(r => r.totalCount === 1));
  await service.syncWithGoogleCalendar();
  assert.equal(calls, 2);
});

test('missing config shows no seeded events and never reports successful sync', async () => {
  const service = createCalendarSync({ getUrl: () => '', fetchFeed: () => { throw new Error('must not fetch'); } });
  const data = await service.getEventsWithAlerts();
  assert.equal(data.sync.status, 'not_configured');
  assert.equal(data.totalCount, 0);
});

test('upstream failure retains last good events with an explicit stale status and no secret leakage', async () => {
  let fail = false;
  const service = createCalendarSync({ getUrl: () => URL, now: () => NOW, fetchFeed: async () => {
    if (fail) throw new Error(`failed private URL ${URL}`);
    return { data: feed(event()) };
  } });
  await service.getEventsWithAlerts();
  fail = true;
  const data = await service.syncWithGoogleCalendar();
  assert.equal(data.totalCount, 1);
  assert.equal(data.sync.status, 'error');
  assert.equal(data.sync.stale, true);
  assert.ok(!JSON.stringify(data).includes('private-test'));
});

test('changing calendars clears the previous calendar cache', async () => {
  let url = URL;
  const service = createCalendarSync({ getUrl: () => url, now: () => NOW, fetchFeed: async () => ({ data: feed(event()) }) });
  await service.getEventsWithAlerts();
  url = '';
  assert.equal((await service.getEventsWithAlerts()).totalCount, 0);
});

test('only Google HTTPS iCal feed addresses are accepted', () => {
  assert.equal(validateCalendarUrl(URL), URL);
  assert.throws(() => validateCalendarUrl('http://127.0.0.1/private.ics'));
  assert.throws(() => validateCalendarUrl('https://calendar.google.com.evil.example/calendar/ical/test.ics'));
  assert.throws(() => validateCalendarUrl('https://calendar.google.com/calendar/u/0/r'));
});

test('calendar API GET triggers synchronization and prevents HTTP caching; manual failure is not 200', async () => {
  const service = createCalendarSync({ getUrl: () => '', now: () => NOW });
  const controller = createCalendarController(service);
  const response = () => ({ code: null, headers: {}, body: null, set(k, v) { this.headers[k] = v; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  const res = response();
  await controller.getEvents({}, res, error => { throw error; });
  assert.equal(res.code, 200);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.equal(res.body.sync.status, 'not_configured');
  const manual = response();
  await controller.syncCalendar({}, manual, error => { throw error; });
  assert.equal(manual.code, 503);
  assert.equal(manual.body.success, false);
});
