import { $, normPhone } from './utils.js';

export const savedQuery = { q: '', fs: '' };

export function phoneVariants(phone) {
  const raw = String(phone || '');
  const n = normPhone(raw);
  const out = new Set([raw, n]);
  const digits = n.replace(/\D/g, '') || raw.replace(/\D/g, '');
  if (digits) out.add(digits);
  const m = (digits || n).match(/(?:218)?0?(9\d{8})$/);
  if (m) {
    const d = m[1];
    out.add(d);
    out.add('0' + d);
    out.add('218' + d);
    out.add('+218' + d);
    out.add('00218' + d);
    out.add('2180' + d);
  }
  return [...out].filter(Boolean);
}

export function recordBlob(r) {
  if (!r || typeof r !== 'object') return '';
  const parts = [];
  const seen = new Set();
  const add = s => {
    const x = String(s || '').trim();
    if (!x || seen.has(x)) return;
    seen.add(x);
    parts.push(x);
  };
  const walk = (val, key) => {
    if (val == null) return;
    if (key === 'phone') phoneVariants(val).forEach(add);
    if (typeof val === 'object') {
      if (Array.isArray(val)) val.forEach(v => walk(v, key));
      else Object.entries(val).forEach(([k, v]) => walk(v, k));
      return;
    }
    add(val);
    if (typeof val === 'string' && /[0-9٠-٩]/.test(val)) {
      phoneVariants(val).forEach(add);
    }
  };
  walk(r);
  return parts.join(' ').toLowerCase();
}

export function matchesQuery(blob, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = String(blob || '').toLowerCase();
  if (hay.includes(q)) return true;
  const qDigits = normPhone(q).replace(/\D/g, '') || q.replace(/\D/g, '');
  if (qDigits.length >= 3) {
    const hayDigits = hay.replace(/\D/g, '');
    if (hayDigits.includes(qDigits)) return true;
    return phoneVariants(q).some(v => {
      const d = String(v).replace(/\D/g, '');
      return (d && hayDigits.includes(d)) || hay.includes(String(v).toLowerCase());
    });
  }
  return false;
}

export function restoreSearchInputs() {
  const qEl = $('#q');
  const fsEl = $('#fs');
  if (qEl) qEl.value = savedQuery.q;
  if (fsEl && [...fsEl.options].some(o => o.value === savedQuery.fs)) fsEl.value = savedQuery.fs;
}

export function applySearchFilter() {
  const qEl = $('#q');
  const fsEl = $('#fs');
  if (qEl) savedQuery.q = qEl.value;
  if (fsEl) savedQuery.fs = fsEl.value;
  const q = qEl ? qEl.value : savedQuery.q;
  const s = fsEl ? fsEl.value : savedQuery.fs;
  const items = document.querySelectorAll('.li, [data-q]');
  if (!items.length) return;
  let n = 0;
  items.forEach(r => {
    const blob = r.getAttribute('data-q') || r.textContent || '';
    const matchesQ = matchesQuery(blob, q);
    const matchesStatus = !s || r.dataset.s === s;
    const hide = !(matchesQ && matchesStatus);
    r.hidden = hide;
    if (!hide) n++;
  });
  const em = $('#em');
  if (em) em.hidden = n > 0;
}

export function resetSavedQuery() {
  savedQuery.q = '';
  savedQuery.fs = '';
}
