import { useCallback, useEffect, useMemo, useState } from 'react';

const signature = event => `${event.revision || ''}:${event.timing_status || 'upcoming'}`;
function load(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export default function useCalendarReadState(data, userId, isOpen) {
  const key = `suho.calendar.read.v1:${userId || 'guest'}`;
  const events = useMemo(() => data?.events || [], [data?.events]);
  const [state, setState] = useState(() => ({ key, read: load(key) }));
  const read = useMemo(() => state.key === key ? state.read : load(key), [state, key]);

  useEffect(() => {
    setState({ key, read: load(key) });
    const onStorage = event => {
      if (event.key === key || event.key === null) setState({ key, read: load(key) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const isUnread = useCallback(event => read[event.id] !== signature(event), [read]);
  const markRead = useCallback(items => {
    setState(previous => {
      const current = previous.key === key ? previous.read : load(key);
      const next = { ...current, ...load(key) };
      for (const event of items) next[event.id] = signature(event);
      if (previous.key === key && Object.keys(next).length === Object.keys(current).length && Object.keys(next).every(id => next[id] === current[id])) return previous;
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* Retain in memory if browser storage is unavailable. */ }
      return { key, read: next };
    });
  }, [key]);
  const markAllRead = useCallback(() => markRead(events), [events, markRead]);

  useEffect(() => {
    // New arrivals are read while their list is visible.
    if (isOpen && events.length) markAllRead();
  }, [isOpen, events, markAllRead]);

  return { unreadCount: isOpen ? 0 : events.filter(isUnread).length, isUnread, markRead, markAllRead };
}
