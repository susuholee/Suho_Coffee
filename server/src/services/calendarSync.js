const axios = require('axios');
const { parseCalendarFeed, enrichEvents, TIME_ZONE } = require('./calendarFeed');

const REFRESH_MS = 15000;
function validateCalendarUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['calendar.google.com', 'www.google.com'].includes(url.hostname) || url.port || url.username || url.password || !url.pathname.startsWith('/calendar/ical/') || !url.pathname.endsWith('.ics')) {
    throw new Error('구글 캘린더의 iCal 주소를 확인해주세요.');
  }
  return url.href;
}

// A short-lived cache coalesces browser polling. Google remains the source of
// truth, so cold starts on Vercel never rely on local files or background timers.
function createCalendarSync({ getUrl = () => process.env.GOOGLE_CALENDAR_ICAL_URL, fetchFeed = (url) => axios.get(url, {
  timeout: 8000, responseType: 'text', maxContentLength: 8 * 1024 * 1024,
  maxRedirects: 0, headers: { Accept: 'text/calendar', 'Cache-Control': 'no-cache' },
}), now = () => new Date() } = {}) {
  let sourceUrl;
  let cachedEvents = [];
  let lastAttempt = null;
  let lastSuccess = null;
  let syncError = null;
  let inFlight = null;

  function snapshot(configured) {
    const status = !configured ? 'not_configured' : syncError ? 'error' : 'synced';
    return {
      ...enrichEvents(cachedEvents, now()),
      sync: {
        configured, status, stale: !!syncError && !!lastSuccess,
        lastSyncedAt: lastSuccess, refreshIntervalSeconds: REFRESH_MS / 1000,
        timeZone: TIME_ZONE, windowDays: 90,
        message: !configured ? '구글 캘린더가 아직 연결되지 않았습니다.'
          : syncError ? syncError : '구글 캘린더 일정을 자동으로 확인하고 있습니다.',
      },
    };
  }

  async function getEventsWithAlerts({ force = false } = {}) {
    const configuredUrl = getUrl()?.trim() || '';
    if (sourceUrl !== configuredUrl) {
      sourceUrl = configuredUrl;
      cachedEvents = [];
      lastAttempt = null;
      lastSuccess = null;
      syncError = null;
      inFlight = null;
    }
    if (!configuredUrl) return snapshot(false);
    if (inFlight) { await inFlight; return snapshot(true); }
    if (!force && lastAttempt !== null && now().getTime() - lastAttempt < REFRESH_MS) return snapshot(true);

    lastAttempt = now().getTime();
    const requestUrl = configuredUrl;
    const request = (async () => {
      try {
        const response = await fetchFeed(validateCalendarUrl(requestUrl));
        const events = await parseCalendarFeed(response.data, now());
        if (sourceUrl !== requestUrl) return;
        // Replacing even an empty feed reflects deletions and cancellations.
        cachedEvents = events;
        lastSuccess = now().toISOString();
        syncError = null;
      } catch (error) {
        if (sourceUrl !== requestUrl) return;
        // Do not log Axios errors: they contain the private iCal URL.
        syncError = '구글 캘린더를 가져오지 못했습니다. 연결 주소와 공유 설정을 확인해주세요.';
      }
    })();
    inFlight = request;
    try { await request; }
    finally { if (inFlight === request) inFlight = null; }
    return snapshot(!!sourceUrl);
  }

  return {
    getEventsWithAlerts,
    syncWithGoogleCalendar: () => getEventsWithAlerts({ force: true }),
  };
}

module.exports = { createCalendarSync, validateCalendarUrl };
