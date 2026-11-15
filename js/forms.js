import { $, t, E, L, U, uid, normPhone, isServerPhone, toast } from './utils.js';
import { IS_LIVE, signIn, signOut, verifyOrganizerPrivileges, getSupabase } from './supabase.js';
import { store, TABLE_MAP } from './data.js';
import { ADMIN_CONFIG } from './admin.js';
import { A } from './components.js';
import { startLiveUpdates } from './realtime.js';
import { report } from './log.js';
import { render, onLiveData } from './router.js';

const LEVELS = new Set(['lv1', 'lv2', 'lv3']);
const locks = new WeakSet();
const activeCheckinSubmissions = new Set();
const checkinCooldowns = new Map();
const CHECKIN_COOLDOWN_MS = 5000;
let bound = false;

function claimForm(form) {
  if (!form || locks.has(form) || form.dataset.busy === '1') return null;
  locks.add(form);
  form.dataset.busy = '1';
  const btn = form.querySelector('.btn.p');
  const prev = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = t('sending');
  }
  return () => {
    locks.delete(form);
    delete form.dataset.busy;
    if (btn && btn.isConnected) {
      btn.disabled = false;
      btn.textContent = prev;
    }
  };
}

function say(el, key, cls) {
  if (!el) return;
  const safe = cls === 'ok' ? 'ok' : 'err';
  el.innerHTML = `<p class="${safe}">${t(key)}</p>`;
}

function boundedNumber(value, fallback, min, max) {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function publicError(formKind, data, ph) {
  const name = (data.name || '').trim();
  if (!name || !String(data.phone || '').trim()) return 'e_req';
  if (name.length < 3 || name.length > 80 || !isServerPhone(data.phone)) return 'e_valid';
  if (data.email && (data.email.length > 120 || !/^\S+@\S+\.\S+$/.test(data.email))) return 'e_valid';
  if ((data.note || '').length > 200) return 'e_valid';
  if (formKind === 'join') {
    const reason = (data.reason || '').trim();
    if (!reason) return 'e_req';
    if (reason.length > 300 || !LEVELS.has(data.level)) return 'e_valid';
  }
  if (formKind === 'reg' && !data.ev) return 'e_req';
  if (formKind === 'shop') {
    const qty = Math.floor(+data.qty);
    if (!data.pid || !data.size) return 'e_req';
    if (data.size.length < 1 || data.size.length > 10 || qty < 1 || qty > 10) return 'e_valid';
  }
  return '';
}

function displayCheckinSuccess(form, record, msgKey) {
  const ev = store.db.events.find(x => x.id === record.ev) || {};
  const card = form.closest('.card');
  if (!card) return;
  card.innerHTML = `<h2>${t(msgKey)}</h2><p class="m">${E(L(ev.title))} · ${E(record.name)}</p><p>${A(
    'join',
    t('cta2'),
    'btn p s'
  )}</p>${IS_LIVE ? '' : `<p class="m">${t('demo_note')}</p>`}`;
}

async function saveAdmin(form, data) {
  const c = form.dataset.c;
  const id = form.dataset.i;
  const itemConfig = ADMIN_CONFIG[c];
  if (!itemConfig || !itemConfig.f) return;
  const unlock = claimForm(form);
  if (!unlock) return;
  const obj = {};
  let badDate = false;
  itemConfig.f.forEach(([fieldKey, type, opt, altName]) => {
    const formKey = (type === 't' && typeof opt === 'string' && opt) || fieldKey;
    const targetKey =
      (typeof altName === 'string' && altName) ||
      (type === 't' && typeof opt === 'string' && opt) ||
      fieldKey;
    if (type === 'b') {
      obj[fieldKey] = { en: data[fieldKey + '__en'] || '', ar: data[fieldKey + '__ar'] || '' };
    } else if (type === 'c') obj[fieldKey] = Boolean(data[formKey]);
    else if (type === 'n') obj[fieldKey] = +data[formKey] || 0;
    else if (type === 'd') {
      const when = new Date(data[formKey] + ':00Z');
      if (Number.isNaN(when.getTime())) badDate = true;
      else obj[fieldKey] = new Date(when.getTime() - 72e5).toISOString();
    } else obj[targetKey] = data[formKey] ?? '';
  });
  if (badDate) {
    toast(t('e_valid'));
    unlock();
    return;
  }
  if (c === 'events') obj.custom = true;
  try {
    await store.commit(db => {
      if (id) {
        const existing = (db[c] || []).find(r => r.id === id);
        if (existing) Object.assign(existing, obj);
      } else {
        obj.id = uid();
        db[c].push(obj);
      }
    });
    $('#dlg')?.close();
    toast(t(IS_LIVE ? 'saved2' : 'saved'));
    render();
  } catch (err) {
    toast(t('e_save'));
  } finally {
    unlock();
  }
}

async function saveLogin(form, data) {
  const lm = form.querySelector('#lm');
  if (lm) lm.textContent = '';
  const unlock = claimForm(form);
  if (!unlock) return;
  try {
    await signIn((data.email || '').trim(), data.password);
    const isPrivileged = await verifyOrganizerPrivileges();
    if (!isPrivileged) {
      await signOut();
      store.isAdmin = false;
      if (lm) lm.textContent = t('not_admin');
      return;
    }
    store.isAdmin = true;
    await store.loadFromSupabase();
    startLiveUpdates(onLiveData);
    render();
  } catch (err) {
    report(err, 'e_net');
    if (lm) lm.textContent = t('e_login');
  } finally {
    unlock();
  }
}

async function saveCheckin(form, data) {
  const msg = form.querySelector('#msg');
  if (data.hp) return;
  const ph = normPhone(data.phone);
  const nm = (data.name || '').trim().split(/\s+/).filter(w => w.length > 1);
  const age = Math.floor(+data.age);
  const joined = nm.join(' ');
  const checkinConfig = store.db.set.checkin || {};
  if (!checkinConfig.open || !checkinConfig.ev) return say(msg, 'ci_closed', 'err');
  if (nm.length < 3) return say(msg, 'e_name3', 'err');
  if (joined.length < 5 || joined.length > 80) return say(msg, 'e_valid', 'err');
  if (!isServerPhone(data.phone)) return say(msg, 'e_valid', 'err');
  if (!(age >= 1 && age <= 99)) return say(msg, 'e_age', 'err');
  if (!data.consent) return say(msg, 'e_cons', 'err');

  const evId = checkinConfig.ev;
  const lockKey = `${evId}_${ph}`;
  if (activeCheckinSubmissions.has(lockKey)) return say(msg, 'ci_wait', 'err');
  const now = Date.now();
  if (now - (checkinCooldowns.get(lockKey) || 0) < CHECKIN_COOLDOWN_MS) return say(msg, 'ci_wait', 'err');
  if (store.db.checkins.some(r => r.ev === evId && r.phone === ph)) {
    displayCheckinSuccess(form, { ev: evId, name: joined, phone: ph }, 'ci_dup');
    return;
  }
  const unlock = claimForm(form);
  if (!unlock) return say(msg, 'ci_wait', 'err');
  activeCheckinSubmissions.add(lockKey);
  checkinCooldowns.set(lockKey, now);
  const record = { id: uid(), ev: evId, name: joined, phone: ph, age, consent: true };
  try {
    if (IS_LIVE) {
      const sb = getSupabase();
      const { error } = await sb.from('checkins').insert(record);
      if (error) {
        if (error.code === '23505') {
          displayCheckinSuccess(form, record, 'ci_dup');
          return;
        }
        throw error;
      }
      if (!store.db.checkins.some(r => r.ev === record.ev && r.phone === ph)) {
        store.db.checkins.push({ ...record, date: new Date().toISOString() });
      }
    } else {
      await store.commit(db => {
        db.checkins.push({ ...record, date: new Date().toISOString() });
      });
    }
    displayCheckinSuccess(form, record, 'ci_ok');
  } catch (err) {
    report(err, 'e_net');
    say(msg, err.status === 401 || err.status === 403 ? 'ci_closed' : 'e_net', 'err');
  } finally {
    activeCheckinSubmissions.delete(lockKey);
    unlock();
  }
}

let settingsBusy = false;

async function saveSettings(data) {
  if (settingsBusy) return;
  settingsBusy = true;
  try {
    await store.commit(db => {
      Object.assign(db.set, {
        ig: data.ig,
        wa: data.wa,
        phone: data.phone,
        email: data.email,
        hero: data.hero,
        challenge: {
          done: boundedNumber(data.challenge_done, 312, 0, 100000),
          goal: boundedNumber(data.challenge_goal, 500, 1, 100000)
        }
      });
    });
    toast(t(IS_LIVE ? 'saved2' : 'saved'));
    render();
  } catch (err) {
    toast(t('e_save'));
  } finally {
    settingsBusy = false;
  }
}

async function savePublic(form, formKind, data) {
  if (data.hp) return;
  const msgEl = form.querySelector('#msg');
  const ph = normPhone(data.phone);
  const invalid = publicError(formKind, data, ph);
  if (invalid) return say(msgEl, invalid, 'err');
  if (formKind === 'reg' && store.db.regs.some(r => r.ev === data.ev && r.phone === ph)) return say(msgEl, 'e_dup', 'err');
  if (formKind === 'join' && store.db.joins.some(r => r.phone === ph && r.status === 'pending')) {
    return say(msgEl, 'e_dupj', 'err');
  }
  if (
    formKind === 'shop' &&
    store.db.orders.some(r => r.pid === data.pid && r.phone === ph && r.size === data.size && r.status === 'new')
  ) {
    return say(msgEl, 'e_dups', 'err');
  }
  const unlock = claimForm(form);
  if (!unlock) return;
  const newRecord = { id: uid(), name: data.name.trim(), phone: ph, email: data.email || '' };
  let targetKind = 'joins';
  if (formKind === 'reg') {
    newRecord.ev = data.ev;
    newRecord.note = data.note || '';
    targetKind = 'regs';
  } else if (formKind === 'shop') {
    newRecord.pid = data.pid;
    newRecord.size = data.size;
    newRecord.qty = Math.floor(+data.qty);
    newRecord.note = data.note || '';
    newRecord.status = 'new';
    targetKind = 'orders';
  } else {
    newRecord.level = data.level;
    newRecord.reason = data.reason.trim();
    newRecord.status = 'pending';
  }
  try {
    if (IS_LIVE) {
      const sb = getSupabase();
      const { error } = await sb.from(TABLE_MAP[targetKind]).insert(newRecord);
      if (error) throw error;
    } else {
      await store.commit(db => {
        db[targetKind].push({ ...newRecord, date: new Date().toISOString() });
      });
    }
    form.reset();
    unlock();
    const okMsgKey = formKind === 'reg' ? 'ok_reg' : formKind === 'shop' ? 'ok_shop' : 'ok_join';
    say(msgEl, okMsgKey, 'ok');
    if (msgEl) {
      msgEl.innerHTML +=
        (IS_LIVE ? '' : `<p class="m">${t('demo_note')}</p>`) +
        (store.db.set.wa
          ? `<p><a class="btn p s" href="${U(WA())}?text=${encodeURIComponent(
              'KHUTWA TEAM · ' +
                (formKind === 'reg'
                  ? L((store.db.events.find(r => r.id === data.ev) || {}).title)
                  : formKind === 'shop'
                  ? L((store.db.shop.find(r => r.id === data.pid) || {}).name) + ' · ' + data.size + ' × ' + data.qty
                  : t('join')) +
                ' · ' +
                newRecord.name +
                ' · ' +
                newRecord.phone
            )}" target="_blank" rel="noopener">${t('sendwa')}</a></p>`
          : '');
    }
  } catch (err) {
    report(err, 'e_net');
    unlock();
    if (err.code === '23505') {
      return say(msgEl, formKind === 'reg' ? 'e_dup' : formKind === 'shop' ? 'e_dups' : 'e_dupj', 'err');
    }
    return say(msgEl, 'e_net', 'err');
  }
}

function fieldIssue(el) {
  const form = el.form;
  if (!form || !form.dataset.f) return '';
  const kind = form.dataset.f;
  if (!['reg', 'join', 'shop', 'ci'].includes(kind)) return '';
  const value = (el.value || '').trim();
  if (el.name === 'name') {
    if (!value) return el.required ? 'e_req' : '';
    if (kind === 'ci') {
      const parts = value.split(/\s+/).filter(w => w.length > 1);
      if (parts.length < 3 || value.length < 5 || value.length > 80) return 'e_name3';
    } else if (value.length < 3 || value.length > 80) return 'e_valid';
  }
  if (el.name === 'phone') {
    if (!value) return el.required ? 'e_req' : '';
    if (!isServerPhone(value)) return 'e_valid';
  }
  if (el.name === 'email' && value && (value.length > 120 || !/^\S+@\S+\.\S+$/.test(value))) return 'e_valid';
  if (el.name === 'reason') {
    if (!value) return 'e_req';
    if (value.length > 300) return 'e_valid';
  }
  if (el.name === 'age') {
    const age = Math.floor(+el.value);
    if (!(age >= 1 && age <= 99)) return 'e_age';
  }
  return '';
}

function markField(el) {
  if (!el || !el.name) return;
  const issue = fieldIssue(el);
  let hint = el.nextElementSibling;
  if (!hint || !hint.classList || !hint.classList.contains('hint')) hint = null;
  if (issue) {
    el.setAttribute('aria-invalid', 'true');
    if (!hint) {
      hint = document.createElement('p');
      hint.className = 'hint';
      el.after(hint);
    }
    hint.hidden = false;
    hint.textContent = t(issue);
  } else if (el.hasAttribute('aria-invalid')) {
    el.removeAttribute('aria-invalid');
    if (hint) hint.hidden = true;
  }
}

export function bindForms() {
  if (bound) return;
  bound = true;
  document.addEventListener('focusout', e => {
    if (e.target && e.target.form) markField(e.target);
  });
  document.addEventListener('submit', async x => {
    const form = x.target;
    const formKind = form.dataset && form.dataset.f;
    if (!formKind) return;
    x.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      if (formKind === 'adm') return await saveAdmin(form, data);
      if (formKind === 'login') return await saveLogin(form, data);
      if (formKind === 'ci') return await saveCheckin(form, data);
      if (formKind === 'set') return await saveSettings(data);
      if (formKind === 'reg' || formKind === 'join' || formKind === 'shop') {
        return await savePublic(form, formKind, data);
      }
    } catch (err) {
      report(err, 'e_save');
      toast(t('e_save'));
    }
  });
}
