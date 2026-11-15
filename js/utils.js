import { S } from './translations.js';

const mem = {};

export let lang = 'ar';

export function getLang() {
  return lang;
}

export function setLang(l) {
  lang = l;
  try {
    localStorage.setItem('khutwa_lang', l);
  } catch (e) {
    mem['khutwa_lang'] = l;
  }
}

export function initLang() {
  try {
    lang = localStorage.getItem('khutwa_lang') || 'ar';
  } catch (e) {
    lang = mem['khutwa_lang'] || 'ar';
  }
}

export function sg(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return mem[k] || null;
  }
}

export function ss(k, v) {
  try {
    if (v === null || v === undefined) {
      localStorage.removeItem(k);
    } else {
      localStorage.setItem(k, v);
    }
  } catch (e) {
    mem[k] = v;
  }
}

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

export const t = k => {
  if (k == null || k === '') return '';
  return (S[k] || [k, k])[lang === 'ar' ? 1 : 0];
};

export const L = o => {
  if (o && typeof o === 'object') {
    return o[lang] || o.en || o.ar || '';
  }
  return o == null ? '' : o;
};

export const E = s =>
  String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const uid = () =>
  'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const U = u => (/^https?:\/\//.test(u) ? E(u) : '#');

export const fmt = i => {
  if (!i) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB', {
      timeZone: 'Africa/Tripoli',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(i));
  } catch (e) {
    return String(i);
  }
};

export function normPhone(p) {
  const x = String(p || '')
    .replace(/[٠-٩]/g, c => c.charCodeAt(0) - 1632)
    .replace(/[\s\-()]/g, '')
    .replace(/^\+/, '')
    .replace(/^00/, '');
  const m = x.match(/^(?:218)?0?(9\d{8})$/);
  return m ? '218' + m[1] : x;
}

export function isDark() {
  return (
    document.documentElement.dataset.theme ||
    (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')
  ) === 'dark';
}

export function toast(m) {
  let e = $('#ts');
  if (!e) {
    e = document.createElement('div');
    e.id = 'ts';
    e.setAttribute('role', 'status');
    document.body.appendChild(e);
  }
  e.textContent = m;
  e.className = 'on';
  clearTimeout(e._t);
  e._t = setTimeout(() => (e.className = ''), 3200);
}
