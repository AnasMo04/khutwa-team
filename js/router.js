import { $, t, E, U, getLang, isDark } from './utils.js';
import { IS_LIVE } from './supabase.js';
import { store } from './data.js';
import { A, SH, IG, WA, nextRunBadge, srcFor } from './components.js';
import { views } from './views.js';
import { renderAdminView } from './admin.js';
import { applySearchFilter, resetSavedQuery, restoreSearchInputs } from './search.js';
import { report } from './log.js';

let currentRoute = 'home';
let pendingAction = null;
let preserveSearch = false;
let lastSearchRoute = '';
let liveRefreshQueued = false;
let rendering = false;
let returnFocus = null;
let countdownTimer = null;
let chromeBound = false;

export function noteFocus() {
  const ae = document.activeElement;
  if (ae && ae !== document.body) returnFocus = ae;
}

function focusable(root) {
  if (!root) return [];
  return [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')].filter(
    el => el.tabIndex !== -1 && el.getClientRects().length > 0
  );
}

export function focusOpenDialog(dlg) {
  const nodes = focusable(dlg);
  if (nodes[0]) nodes[0].focus();
}

function trapTab(e) {
  if (e.key !== 'Tab') return;
  const dlg = [...document.querySelectorAll('dialog')].find(d => d.open);
  if (!dlg) return;
  const nodes = focusable(dlg);
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function setMenuOpen(open) {
  const nav = $('#nv');
  const burger = document.querySelector('[data-a="menu"]');
  if (nav) nav.classList.toggle('open', open);
  if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

export function askConfirmation(message, callback) {
  const dlg = $('#cd');
  const msg = $('#cm');
  if (!dlg || !msg || dlg.open) return;
  noteFocus();
  msg.textContent = message;
  pendingAction = callback;
  dlg.showModal();
  const cancel = $('#c2');
  if (cancel) cancel.focus();
}

export function takePendingAction() {
  const fn = pendingAction;
  pendingAction = null;
  return fn;
}

export function navigate(dest) {
  currentRoute = dest;
  try {
    location.hash = dest;
  } catch (err) {
    report(err, 'e_net');
  }
  render();
  window.scrollTo(0, 0);

  if (store.isAdmin && currentRoute.startsWith('admin')) {
    store.loadPeopleFromSupabase().then(() => {
      if (!currentRoute.startsWith('admin')) return;
      store.takeSnapshot();
      preserveSearch = true;
      render();
      preserveSearch = false;
    }).catch(err => report(err, 'e_net'));
  }
}

export function shouldSkipLiveRender() {
  if ($('#dlg')?.open || $('#cd')?.open) return true;
  const ae = document.activeElement;
  if (!ae || ae === document.body) return false;
  const tag = (ae.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export function onLiveData() {
  if (!store.isAdmin) return;
  if (!String(currentRoute).startsWith('admin')) return;
  if (shouldSkipLiveRender()) {
    liveRefreshQueued = true;
    return;
  }
  preserveSearch = true;
  render();
  preserveSearch = false;
}

function tickCountdown() {
  const c = document.querySelector('.cdn');
  if (!c) return;
  const when = new Date(c.dataset.t);
  if (Number.isNaN(when.getTime())) return;
  const s = Math.max(0, ((when - Date.now()) / 1000) | 0);
  const u = {
    d: (s / 86400) | 0,
    h: ((s % 86400) / 3600) | 0,
    m: ((s % 3600) / 60) | 0,
    s: s % 60
  };
  c.querySelectorAll('i').forEach(i => {
    i.textContent = String(u[i.dataset.u] || 0).padStart(2, '0');
  });
}

export function calculatePace() {
  const d = +$('#pd')?.value;
  const s =
    (+$('#ph')?.value || 0) * 3600 +
    (+$('#pm')?.value || 0) * 60 +
    (+$('#ps')?.value || 0);
  const o = $('#po');
  if (!o) return;
  if (!(d > 0 && s > 0)) {
    o.innerHTML = `<p class="m">${t('pc_h')}</p>`;
    return;
  }
  const f = x => {
    x = Math.round(x);
    const h = (x / 3600) | 0;
    const m = ((x % 3600) / 60) | 0;
    const z = String(x % 60).padStart(2, '0');
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + z;
  };
  o.innerHTML = `<div class="grid"><div class="card"><div class="big">${f(
    s / d
  )}</div>${t('pace')} / ${t('kmu')}</div><div class="card"><div class="big">${(
    (d / s) *
    3600
  ).toFixed(1)}</div>${t('kmu')}/h</div></div><h3>${t(
    'pred'
  )}</h3><div class="grid">${[5, 10, 21.1, 42.2]
    .map(
      k =>
        `<div class="card"><b>${k} ${t('kmu')}</b><div class="big">${f(
          s * Math.pow(k / d, 1.06)
        )}</div></div>`
    )
    .join('')}</div><p class="m">${t('pc_n')}</p>`;
}

function reveal(el) {
  if (!el || !el.classList.contains('rv')) return;
  el.classList.add('in');
  setTimeout(() => {
    el.classList.remove('rv', 'in');
    el.style.transitionDelay = '';
  }, 1000);
}

let revealIo = null;

function revealElements() {
  try {
    if (revealIo) {
      revealIo.disconnect();
      revealIo = null;
    }
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    const isMobile =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width:860px)').matches;
    if (reduceMotion || isMobile || typeof IntersectionObserver === 'undefined') return;
    const els = [...document.querySelectorAll('#app .sec h2, #app .card, #app .ph')];
    if (!els.length) return;
    revealIo = new IntersectionObserver(
      entries => {
        entries.forEach(x => {
          if (x.isIntersecting || x.intersectionRatio > 0) {
            revealIo.unobserve(x.target);
            reveal(x.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '80px' }
    );
    els.forEach((e, i) => {
      e.classList.add('rv');
      e.style.transitionDelay = (i % 4) * 90 + 'ms';
      revealIo.observe(e);
    });
    setTimeout(() => {
      els.forEach(e => reveal(e));
      try {
        if (revealIo) revealIo.disconnect();
        revealIo = null;
      } catch (err) {
        report(err, 'e_net');
      }
    }, 1200);
  } catch (err) {
    report(err, 'e_net');
    document.querySelectorAll('.rv').forEach(el => {
      el.classList.remove('rv', 'in');
      el.style.opacity = '';
      el.style.transform = '';
    });
  }
}

function showRenderError() {
  const app = $('#app');
  if (!app) return;
  app.innerHTML = `<section class="sec"><div class="w"><p>${t(
    'e_net'
  )}</p><p><button class="btn p" type="button" data-a="bootretry">${t(
    'retry'
  )}</button></p></div></section>`;
}

function renderInner() {
  const hd = $('#hd');
  const app = $('#app');
  const ft = $('#ft');
  if (!hd || !app || !ft) return;

  const parts = currentRoute.split(/-(.+)/);
  const routeKey = parts[0];
  const routeParam = parts[1];
  const currentLang = getLang();
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  const curNav = routeKey === 'event' ? 'events' : routeKey;

  hd.innerHTML = `<header><div class="w nav">${A(
    'home',
    '<span class="lgo" role="img" aria-label="KHUTWA"></span><b>TEAM</b>',
    'logo'
  )}<button class="burger" type="button" data-a="menu" aria-controls="nv" aria-expanded="false" aria-label="Menu">☰</button><nav id="nv">${[
    'home',
    'events',
    'community',
    'ach',
    'routes',
    'shop',
    'tools'
  ]
    .map(x => A(x, t(x), curNav === x ? 'on' : ''))
    .join('')}<button class="lg" type="button" data-a="lang">${
    currentLang === 'ar' ? 'English' : 'العربية'
  }</button><button class="lg" type="button" data-a="theme">${t(
    isDark() ? 'tl' : 'td'
  )}</button>${A('join', t('join'), 'btn p s')}</nav></div></header>`;

  if (routeKey === 'admin') app.innerHTML = renderAdminView(routeParam, navigate);
  else if (views[routeKey]) app.innerHTML = views[routeKey](routeParam);
  else app.innerHTML = views.home();

  const heroEl = $('#hero');
  if (heroEl) {
    heroEl.hidden = routeKey !== 'home';
    if (!heroEl.querySelector('.shp')) heroEl.insertAdjacentHTML('afterbegin', SH());
    const img = heroEl.querySelector('img.sl');
    const remote = srcFor(store.db.set && store.db.set.hero);
    if (img && remote) {
      img.removeAttribute('srcset');
      img.src = remote;
    }
    const eye = heroEl.querySelector('.eye');
    const heading = heroEl.querySelector('h1');
    const acts = heroEl.querySelector('.hero-act');
    if (eye) eye.textContent = 'KHUTWA TEAM · ' + t('city');
    if (heading) heading.textContent = t('tag');
    if (acts) {
      acts.innerHTML = `${nextRunBadge()}<p>${A('events', t('cta1'), 'btn p')} ${A('join', t('cta2'), 'btn')}</p>`;
    }
  }

  ft.innerHTML = `<footer>${SH()}<div class="w"><p class="logo"><span class="lgo big" role="img" aria-label="KHUTWA TEAM"></span></p><p>${t(
    'tag'
  )}</p><p>${['home', 'events', 'community', 'ach', 'routes', 'shop', 'tools', 'join']
    .map(x => A(x, t(x)))
    .join(' · ')}</p><p><a href="${U(IG())}" target="_blank" rel="noopener">Instagram</a> · <a href="${U(
    WA()
  )}" target="_blank" rel="noopener">WhatsApp</a></p><p>${[store.db.set.phone, store.db.set.email]
    .filter(Boolean)
    .map(E)
    .join(' · ') || t('contact')}</p><p>${
    store.isAdmin || IS_LIVE ? A('admin', t(IS_LIVE ? 'admin_live' : 'admin')) : ''
  }</p></div></footer>`;

  const sv = $('#sv');
  const c1 = $('#c1');
  const c2 = $('#c2');
  const yb = $('#yb');
  if (sv) sv.textContent = t('save');
  if (c1) c1.textContent = t('close');
  if (c2) c2.textContent = t('close');
  if (yb) yb.textContent = t('yes');

  if ($('#pc')) calculatePace();
  tickCountdown();
  revealElements();
  if (preserveSearch) restoreSearchInputs();
  applySearchFilter();
}

export function render() {
  if (rendering) return;
  rendering = true;
  try {
    if (!preserveSearch && currentRoute !== lastSearchRoute) resetSavedQuery();
    lastSearchRoute = currentRoute;
    renderInner();
  } catch (err) {
    report(err, 'e_net');
    try {
      showRenderError();
    } catch (err2) {
      report(err2, 'e_net');
    }
  } finally {
    rendering = false;
  }
}

function syncViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  document.documentElement.style.setProperty('--vvh', Math.max(240, Math.round(vv.height - 16)) + 'px');
  const keyboard = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  document.documentElement.style.setProperty('--kb', keyboard + 'px');
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  tickCountdown();
  countdownTimer = setInterval(tickCountdown, 1000);
}

function startMotion() {
  try {
    if (!window.matchMedia) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let rf = 0;
    document.addEventListener('pointermove', e => {
      if (rf) return;
      rf = requestAnimationFrame(() => {
        rf = 0;
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        document.querySelectorAll('.shp b').forEach(b => {
          const d = +b.dataset.d;
          b.style.translate = `${x * d}px ${y * d}px`;
          b.style.rotate = `${x * d}deg`;
        });
      });
    });
  } catch (err) {
    report(err, 'e_net');
  }
}

export function startRouter() {
  currentRoute = (location.hash || '#home').slice(1);
  startCountdown();
  if (chromeBound) return;
  chromeBound = true;
  startMotion();
  syncViewport();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewport);
    window.visualViewport.addEventListener('scroll', syncViewport);
  }
  window.addEventListener('hashchange', () => {
    const hash = (location.hash || '#home').slice(1);
    if (hash !== currentRoute) {
      currentRoute = hash;
      render();
      window.scrollTo(0, 0);
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, dialog')) {
      const q = $('#q');
      if (q) {
        e.preventDefault();
        q.focus();
      }
    }
    if (e.key === 'Escape') {
      const open = [...document.querySelectorAll('dialog')].find(d => d.open);
      if (open) return;
      setMenuOpen(false);
    }
    trapTab(e);
  });
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('close', () => {
      if (dlg.id === 'cd') pendingAction = null;
      const back = returnFocus;
      returnFocus = null;
      if (back && back.isConnected && back.focus) back.focus();
    });
  });
  window.addEventListener('error', e => report(e.error || e.message, 'e_net'));
  window.addEventListener('unhandledrejection', e => report(e.reason, 'e_net'));
  document.addEventListener('focusout', () => {
    if (liveRefreshQueued && store.isAdmin && String(currentRoute).startsWith('admin')) {
      liveRefreshQueued = false;
      preserveSearch = true;
      render();
      preserveSearch = false;
    }
  });
}
