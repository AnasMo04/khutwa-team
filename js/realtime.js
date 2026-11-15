import { getSupabase, IS_LIVE } from './supabase.js';
import { store, TABLE_MAP, PEOPLE_KINDS } from './data.js';

const POLL_MS = 7000;
const POLL_FALLBACK_MS = 5000;
const REALTIME_TABLES = [...Object.values(TABLE_MAP), 'content'];
const KIND_BY_TABLE = Object.fromEntries(
  Object.entries(TABLE_MAP).map(([kind, table]) => [table, kind])
);

let channels = [];
let pollTimer = null;
let subscribeTimer = null;
let onChange = null;
let started = false;
let realtimeOk = false;
let lastSig = '';

function sig() {
  const ci = store.db.set && store.db.set.checkin;
  const people = PEOPLE_KINDS.map(k => {
    const rows = store.db[k] || [];
    return (
      k +
      ':' +
      rows.length +
      ':' +
      rows
        .map(r => (r.id || '') + (r.status || '') + (r.date || ''))
        .join('.')
    );
  }).join('|');
  return JSON.stringify(ci) + '|' + people;
}

async function refreshStore() {
  if (!IS_LIVE || !store.isAdmin) return false;
  await store.loadPeopleFromSupabase();
  try {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('content')
        .select('kind, id, data')
        .eq('kind', 'set')
        .eq('id', 'main')
        .limit(1);
      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row && row.data) {
        store.db.set = { ...store.db.set, ...row.data };
      }
    }
  } catch (e) {
    console.warn('Live settings refresh failed:', e);
  }
  store.takeSnapshot();
  const next = sig();
  if (next === lastSig) return false;
  lastSig = next;
  return true;
}

function applyPayload(payload) {
  const table = payload?.table;
  const kind = KIND_BY_TABLE[table];
  if (!kind || !store.db[kind]) return false;
  const type = payload.eventType || payload.event;
  const row = payload.new;
  const old = payload.old;
  const list = store.db[kind];
  if (type === 'INSERT' && row && row.id) {
    if (!list.some(r => r.id === row.id)) list.unshift(row);
    else {
      const i = list.findIndex(r => r.id === row.id);
      if (i >= 0) list[i] = { ...list[i], ...row };
    }
    return true;
  }
  if (type === 'UPDATE' && row && row.id) {
    const i = list.findIndex(r => r.id === row.id);
    if (i >= 0) list[i] = { ...list[i], ...row };
    else list.unshift(row);
    return true;
  }
  if (type === 'DELETE') {
    const id = (old && old.id) || (row && row.id);
    if (!id) return false;
    const next = list.filter(r => r.id !== id);
    if (next.length === list.length) return false;
    store.db[kind] = next;
    return true;
  }
  return false;
}

async function notifyIfChanged(changed) {
  if (!changed) return;
  lastSig = sig();
  store.takeSnapshot();
  if (typeof onChange === 'function') onChange();
}

async function onRealtime(payload) {
  try {
    if (payload?.table === 'content') {
      const changed = await refreshStore();
      await notifyIfChanged(changed);
      return;
    }
    const merged = applyPayload(payload);
    if (merged) {
      await notifyIfChanged(true);
      return;
    }
    const changed = await refreshStore();
    await notifyIfChanged(changed);
  } catch (e) {
    console.warn('Realtime handler error:', e);
  }
}

async function pollTick() {
  if (!started || document.visibilityState === 'hidden') return;
  try {
    const changed = await refreshStore();
    await notifyIfChanged(changed);
  } catch (e) {
    console.warn('Live poll failed:', e);
  }
}

function startPolling(ms) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(pollTick, ms || (realtimeOk ? POLL_MS * 2 : POLL_FALLBACK_MS));
  pollTick();
}

function subscribeRealtime(sb) {
  if (!sb || typeof sb.channel !== 'function') {
    startPolling(POLL_FALLBACK_MS);
    return;
  }
  try {
    let ch = sb.channel('khutwa-admin-live');
    REALTIME_TABLES.forEach(table => {
      ch = ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        onRealtime
      );
    });
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        realtimeOk = true;
        startPolling(POLL_MS * 2);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        realtimeOk = false;
        startPolling(POLL_FALLBACK_MS);
      }
    });
    channels.push(ch);
    subscribeTimer = setTimeout(() => {
      if (started && !pollTimer) startPolling(POLL_FALLBACK_MS);
    }, 3500);
  } catch (e) {
    console.warn('Realtime unavailable, using poll:', e);
    startPolling(POLL_FALLBACK_MS);
  }
}

function onVisible() {
  if (started && document.visibilityState === 'visible') pollTick();
}

export function startLiveUpdates(callback) {
  onChange = callback;
  stopLiveUpdates();
  started = true;
  lastSig = sig();
  if (!IS_LIVE || !store.isAdmin) return;
  document.addEventListener('visibilitychange', onVisible);
  const sb = getSupabase();
  if (sb) subscribeRealtime(sb);
  else startPolling(POLL_FALLBACK_MS);
}

export function stopLiveUpdates() {
  started = false;
  realtimeOk = false;
  document.removeEventListener('visibilitychange', onVisible);
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (subscribeTimer) {
    clearTimeout(subscribeTimer);
    subscribeTimer = null;
  }
  const sb = getSupabase();
  channels.forEach(ch => {
    try {
      if (sb && typeof sb.removeChannel === 'function') sb.removeChannel(ch);
      else if (ch && typeof ch.unsubscribe === 'function') ch.unsubscribe();
    } catch (e) {}
  });
  channels = [];
}

export function isLiveConnected() {
  return started && IS_LIVE && store.isAdmin;
}
