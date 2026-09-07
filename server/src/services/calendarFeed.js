const { createHash } = require('crypto');
const ical = require('node-ical');

const DAY_MS = 86400000;
const TIME_ZONE = 'Asia/Seoul';
const text = (value) => typeof value === 'string' ? value : String(value?.val || '');
const hash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 24);
function dateKey(date, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type) => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function timeLabel(date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}
function allDayInstant(date, original) {
  // DATE values denote calendar days, not UTC instants. Show that day in Korea.
  const sourceZone = original?.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Date(`${dateKey(date, sourceZone)}T00:00:00+09:00`);
}

async function parseCalendarFeed(content, now = new Date()) {
  if (typeof content !== 'string' || !/^BEGIN:VCALENDAR\s*$/m.test(content) || !/^END:VCALENDAR\s*$/m.test(content)) {
    throw new Error('유효한 iCal 캘린더 응답이 아닙니다.');
  }
  const parsed = await ical.async.parseICS(content);
  const from = new Date(`${dateKey(now)}T00:00:00+09:00`);
  const to = new Date(from.getTime() + 90 * DAY_MS);
  const events = new Map();
  for (const event of Object.values(parsed)) {
    if (event.type !== 'VEVENT' || !event.start || event.status === 'CANCELLED') continue;
    // A day margin preserves date-only and ongoing occurrences across zones.
    const instances = ical.expandRecurringEvent(event, {
      from: new Date(from.getTime() - DAY_MS), to, expandOngoing: true,
    });
    for (const instance of instances) {
      const source = instance.event;
      if (source.status === 'CANCELLED') continue;
      const start = instance.isFullDay ? allDayInstant(instance.start, source.start || event.start) : instance.start;
      const end = instance.isFullDay ? allDayInstant(instance.end, source.end || source.start || event.start) : instance.end;
      if (end <= now || start >= to) continue;
      const title = text(instance.summary) || '제목 없는 일정';
      const description = text(source.description);
      const location = text(source.location);
      const recurrenceKey = event.rrule || source.recurrenceid
        ? source.recurrenceid?.toISOString() || instance.start.toISOString() : 'single';
      const id = `google_${hash(`${text(event.uid)}:${recurrenceKey}`)}`;
      const revision = hash(JSON.stringify([title, description, location, start.toISOString(), end.toISOString(), source.sequence || 0]));
      events.set(id, {
        id, title, description, location, category: 'google_sync',
        start_at: start.toISOString(), end_at: end.toISOString(),
        event_date: dateKey(start),
        end_date: dateKey(instance.isFullDay ? new Date(end.getTime() - 1) : end),
        start_time: instance.isFullDay ? '종일' : timeLabel(start),
        end_time: instance.isFullDay ? '' : timeLabel(end),
        all_day: instance.isFullDay, revision,
        created_at: source.created?.toISOString?.() || null,
      });
    }
  }
  return [...events.values()].sort((a, b) => a.start_at.localeCompare(b.start_at));
}

function enrichEvents(events, now = new Date()) {
  const upcoming = events.filter(event => new Date(event.end_at) > now);
  const enriched = upcoming.map(event => {
    const minutes = Math.ceil((new Date(event.start_at) - now) / 60000);
    const timing = minutes <= 0 ? 'in_progress' : !event.all_day && minutes <= 60 ? 'imminent' : 'upcoming';
    const alert = timing !== 'upcoming';
    return {
      ...event, timing_status: timing, diff_minutes: minutes, should_alert: alert,
      alert_text: timing === 'in_progress' ? `지금 진행 중인 일정: ${event.title}`
        : timing === 'imminent' ? `약 ${minutes}분 후 시작: ${event.title}`
          : `${event.event_date} ${event.start_time} 예정`,
    };
  });
  return {
    events: enriched,
    activeAlerts: enriched.filter(event => event.should_alert),
    totalCount: enriched.length,
    alertCount: enriched.filter(event => event.should_alert).length,
  };
}

module.exports = { parseCalendarFeed, enrichEvents, dateKey, TIME_ZONE };
