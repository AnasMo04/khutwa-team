// Main application controller for KHUTWA TEAM
import { S } from './translations.js';
import {
  $,
  $$,
  lang,
  getLang,
  setLang,
  initLang,
  t,
  E,
  L,
  fmt,
  U,
  uid,
  normPhone,
  isDark,
  toast,
  ss
} from './utils.js';
import {
  IS_LIVE,
  signIn,
  signOut,
  verifyOrganizerPrivileges,
  getSupabase
} from './supabase.js';
import { store, TABLE_MAP, CONTENT_KINDS, PEOPLE_KINDS } from './data.js';
import {
  A,
  SH,
  IG,
  WA
} from './components.js';
import { views } from './views.js';
import {
  renderAdminView,
  openEditForm,
  filterTableRows,
  exportCheckinsCSV,
  printCheckinPoster,
  uploadGalleryImages,
  ADMIN_CONFIG
} from './admin.js';

let currentRoute = (location.hash || '#home').slice(1);
let pendingAction = null;

function navigate(dest) {
  currentRoute = dest;
  try {
    location.hash = dest;
  } catch (e) {}
  render();
  window.scrollTo(0, 0);

  if (store.isAdmin && currentRoute.startsWith('admin')) {
    store.loadPeopleFromSupabase().then(() => {
      store.takeSnapshot();
      if (currentRoute.startsWith('admin')) render();
    }).catch(console.warn);
  }
}

function askConfirmation(message, callback) {
  $('#cm').textContent = message;
  pendingAction = callback;
  $('#cd').showModal();
}

function tickCountdown() {
  const c = document.querySelector('.cdn');
  if (!c) return;
  const s = Math.max(0, ((new Date(c.dataset.t) - Date.now()) / 1000) | 0);
  const u = {
    d: (s / 86400) | 0,
    h: ((s % 86400) / 3600) | 0,
    m: ((s % 3600) / 60) | 0,
    s: s % 60
  };
  c.querySelectorAll('i').forEach(i => {
    i.textContent = String(u[i.dataset.u]).padStart(2, '0');
  });
}

function calculatePace() {
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

function revealElements() {
  if (
    typeof IntersectionObserver === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion:reduce)').matches
  )
    return;
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(x => {
        if (x.isIntersecting) {
          const el = x.target;
          io.unobserve(el);
          el.classList.add('in');
          setTimeout(() => {
            el.classList.remove('rv', 'in');
            el.style.transitionDelay = '';
          }, 1000);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll('#app .sec h2, #app .card, #app .ph').forEach((e, i) => {
    e.classList.add('rv');
    e.style.transitionDelay = (i % 4) * 90 + 'ms';
    io.observe(e);
  });
}

function render() {
  const parts = currentRoute.split(/-(.+)/);
  const routeKey = parts[0];
  const routeParam = parts[1];

  const currentLang = getLang();
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

  const curNav = routeKey === 'event' ? 'events' : routeKey;

  // Header navigation
  $('#hd').innerHTML = `<header><div class="w nav">${A(
    'home',
    '<span class="lgo" role="img" aria-label="KHUTWA"></span><b>TEAM</b>',
    'logo'
  )}<button class="burger" data-a="menu" aria-label="Menu">☰</button><nav id="nv">${[
    'home',
    'events',
    'community',
    'ach',
    'routes',
    'shop',
    'tools'
  ]
    .map(x => A(x, t(x), curNav === x ? 'on' : ''))
    .join(
      ''
    )}<button class="lg" data-a="lang">${
    currentLang === 'ar' ? 'English' : 'العربية'
  }</button><button class="lg" data-a="theme">${t(
    isDark() ? 'tl' : 'td'
  )}</button>${A('join', t('join'), 'btn p s')}</nav></div></header>`;

  // Main view rendering
  if (routeKey === 'admin') {
    $('#app').innerHTML = renderAdminView(routeParam, navigate);
  } else if (views[routeKey]) {
    $('#app').innerHTML = views[routeKey](routeParam);
  } else {
    $('#app').innerHTML = views.home();
  }

  // Footer
  $('#ft').innerHTML = `<footer>${SH()}<div class="w"><p class="logo"><span class="lgo big" role="img" aria-label="KHUTWA TEAM"></span></p><p>${t(
    'tag'
  )}</p><p>${[
    'home',
    'events',
    'community',
    'ach',
    'routes',
    'shop',
    'tools',
    'join'
  ]
    .map(x => A(x, t(x)))
    .join(' · ')}</p><p><a href="${U(
    IG()
  )}" target="_blank" rel="noopener">Instagram</a> · <a href="${U(
    WA()
  )}" target="_blank" rel="noopener">WhatsApp</a> (${t('ph')})</p><p>${[
    store.db.set.phone,
    store.db.set.email
  ]
    .filter(Boolean)
    .map(E)
    .join(' · ') || t('contact')}</p><p>${
    store.isAdmin || IS_LIVE ? A('admin', t(IS_LIVE ? 'admin_live' : 'admin')) : ''
  }</p></div></footer>`;

  // Dialog default labels
  $('#sv').textContent = t('save');
  $('#c1').textContent = $('#c2').textContent = t('close');
  $('#yb').textContent = t('yes');

  if ($('#pc')) calculatePace();
  tickCountdown();
  revealElements();
}

// Global click event handler
document.addEventListener('click', async x => {
  const btn = x.target.closest('[data-go],[data-a]');
  if (!btn) return;
  const d = btn.dataset;

  if (d.go) {
    x.preventDefault();
    return navigate(d.go);
  }

  const c = d.c;
  const i = d.i;

  if (d.a === 'lang') {
    const nextLang = getLang() === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    render();
  } else if (d.a === 'theme') {
    const nextTheme = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    ss('khutwa_theme', nextTheme);
    render();
  } else if (d.a === 'menu') {
    $('#nv').classList.toggle('open');
  } else if (d.a === 'close') {
    btn.closest('dialog')?.close();
  } else if (d.a === 'yes') {
    $('#cd')?.close();
    if (pendingAction) {
      pendingAction();
      pendingAction = null;
    }
  } else if (d.a === 'edit') {
    openEditForm(c, i);
  } else if (d.a === 'del') {
    askConfirmation(t('sure'), async () => {
      store.db[c] = store.db[c].filter(row => row.id !== i);
      try {
        await store.syncToSupabase();
        toast(t(IS_LIVE ? 'saved2' : 'saved'));
      } catch (e) {
        toast(t('e_save'));
      }
      render();
    });
  } else if (d.a === 'cancel' || d.a === 'done') {
    askConfirmation(t('sure'), async () => {
      const item = store.db.events.find(r => r.id === i);
      if (item) {
        item.status = d.a === 'cancel' ? 'cancelled' : 'completed';
        try {
          await store.syncToSupabase();
          toast(t(IS_LIVE ? 'saved2' : 'saved'));
        } catch (e) {
          toast(t('e_save'));
        }
        render();
      }
    });
  } else if (d.a === 'ciopen') {
    const selectedEv = store.selectedCheckinEvent || (store.db.events[0] || {}).id || '';
    store.db.set.checkin = { ev: selectedEv, open: true };
    try {
      await store.syncToSupabase();
      toast(t(IS_LIVE ? 'saved2' : 'saved'));
    } catch (e) {
      toast(t('e_save'));
    }
    render();
  } else if (d.a === 'ciclose') {
    store.db.set.checkin = {
      ev: (store.db.set.checkin || {}).ev || store.selectedCheckinEvent,
      open: false
    };
    try {
      await store.syncToSupabase();
      toast(t(IS_LIVE ? 'saved2' : 'saved'));
    } catch (e) {
      toast(t('e_save'));
    }
    render();
  } else if (d.a === 'refresh') {
    try {
      await store.loadFromSupabase();
      toast(t('saved2'));
      render();
    } catch (e) {
      toast(t('e_net'));
    }
  } else if (d.a === 'logout') {
    await signOut();
    store.isAdmin = false;
    store.db.regs = [];
    store.db.joins = [];
    store.db.orders = [];
    store.db.checkins = [];
    render();
  } else if (d.a === 'init') {
    try {
      await store.initializeDatabase();
      toast(t('saved2'));
      render();
    } catch (e) {
      toast(t('e_save'));
    }
  } else if (d.a === 'csv') {
    exportCheckinsCSV();
  } else if (d.a === 'poster') {
    printCheckinPoster();
  } else if (d.a === 'reset') {
    askConfirmation(t('sure'), async () => {
      store.loadDemo();
      render();
    });
  }
});

// Input filters & pace calculator
document.addEventListener('input', x => {
  if (x.target.id === 'q') filterTableRows();
  if (x.target.closest && x.target.closest('#pc')) calculatePace();
});

// Dropdowns change handler
document.addEventListener('change', async x => {
  const e = x.target;
  if (e.id === 'fs') filterTableRows();
  if (e.id === 'cis') {
    store.selectedCheckinEvent = e.value;
    render();
  }
  if (e.dataset.st) {
    const listKey = e.dataset.c || 'joins';
    const item = store.db[listKey].find(r => r.id === e.dataset.st);
    if (item) {
      item.status = e.value;
      e.closest('.li').dataset.s = e.value;
      try {
        await store.syncToSupabase();
      } catch (err) {
        toast(t('e_save'));
      }
    }
  }
  if (e.id === 'fu') {
    try {
      await uploadGalleryImages(e.files);
      await store.syncToSupabase();
      toast(t(IS_LIVE ? 'saved2' : 'saved'));
      render();
    } catch (err) {
      console.error('Upload error:', err);
      $('#upm').textContent = t('upe');
    }
  }
});

// Form Submissions (Login, Check-in, Event Admin, Registrations, Join, Shop)
document.addEventListener('submit', async x => {
  const form = x.target;
  const formKind = form.dataset.f;
  if (!formKind) return;
  x.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  // 1. Admin Edit Item Form
  if (formKind === 'adm') {
    const c = form.dataset.c;
    const id = form.dataset.i;
    const itemConfig = ADMIN_CONFIG[c];
    if (!itemConfig) return;
    const obj = {};

    itemConfig.f.forEach(([fieldKey, type, opt]) => {
      if (type === 'b') {
        obj[fieldKey] = {
          en: data[fieldKey + '__en'] || '',
          ar: data[fieldKey + '__ar'] || ''
        };
      } else if (type === 'c') {
        obj[fieldKey] = Boolean(data[fieldKey]);
      } else if (type === 'n') {
        obj[fieldKey] = +data[fieldKey] || 0;
      } else if (type === 'd') {
        obj[fieldKey] = new Date(
          new Date(data[fieldKey] + ':00Z').getTime() - 72e5
        ).toISOString();
      } else {
        obj[opt || fieldKey] = data[opt || fieldKey] || '';
      }
    });

    if (c === 'events') obj.custom = true;

    if (id) {
      const existing = store.db[c].find(r => r.id === id);
      if (existing) Object.assign(existing, obj);
    } else {
      obj.id = uid();
      store.db[c].push(obj);
    }

    try {
      await store.syncToSupabase();
      $('#dlg')?.close();
      toast(t(IS_LIVE ? 'saved2' : 'saved'));
      render();
    } catch (e) {
      toast(t('e_save'));
    }
    return;
  }

  // 2. Admin Login Form (Real Supabase Auth signInWithPassword)
  if (formKind === 'login') {
    const lm = form.querySelector('#lm');
    lm.textContent = '';
    const email = data.email?.trim();
    const password = data.password;

    try {
      await signIn(email, password);
      const isPrivileged = await verifyOrganizerPrivileges();
      if (!isPrivileged) {
        await signOut();
        store.isAdmin = false;
        lm.textContent = t('not_admin');
        return;
      }

      store.isAdmin = true;
      await store.loadFromSupabase();
      render();
    } catch (err) {
      console.error('Login error:', err);
      lm.textContent = t('e_login');
    }
    return;
  }

  // 3. Check-in (QR attendance scanning)
  if (formKind === 'ci') {
    const msg = form.querySelector('#msg');
    const say = (msgKey, cls) => {
      msg.innerHTML = `<p class="${cls}">${t(msgKey)}</p>`;
    };

    const ph = normPhone(data.phone);
    const nm = (data.name || '').trim().split(/\s+/).filter(w => w.length > 1);
    const age = Math.floor(+data.age);
    const checkinConfig = store.db.set.checkin || {};

    if (data.hp) return; // honeypot
    if (!checkinConfig.open || !checkinConfig.ev) return say('ci_closed', 'err');
    if (nm.length < 3) return say('e_name3', 'err');
    if (!/^\d{7,15}$/.test(ph)) return say('e_req', 'err');
    if (!(age >= 1 && age <= 99)) return say('e_age', 'err');
    if (!data.consent) return say('e_cons', 'err');

    const submitBtn = form.querySelector('.btn.p');
    submitBtn.disabled = true;

    const record = {
      id: uid(),
      ev: checkinConfig.ev,
      name: nm.join(' '),
      phone: ph,
      age,
      consent: true
    };

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
      } else {
        if (store.db.checkins.some(r => r.ev === record.ev && r.phone === ph)) {
          displayCheckinSuccess(form, record, 'ci_dup');
          return;
        }
        store.db.checkins.push({ ...record, date: new Date().toISOString() });
        await store.syncToSupabase();
      }

      displayCheckinSuccess(form, record, 'ci_ok');
    } catch (err) {
      console.error('Checkin error:', err);
      submitBtn.disabled = false;
      say(err.status === 401 || err.status === 403 ? 'ci_closed' : 'e_net', 'err');
    }
    return;
  }

  // 4. Site Settings Form
  if (formKind === 'set') {
    Object.assign(store.db.set, {
      ig: data.ig,
      wa: data.wa,
      phone: data.phone,
      email: data.email,
      hero: data.hero
    });
    try {
      await store.syncToSupabase();
      toast(t(IS_LIVE ? 'saved2' : 'saved'));
      render();
    } catch (e) {
      toast(t('e_save'));
    }
    return;
  }

  // 5. Visitor Registration, Join Team, or Shop Order
  const msgEl = form.querySelector('#msg');
  const submitBtn = form.querySelector('.btn.p');
  const ph = normPhone(data.phone);
  const say = (key, cls) => {
    msgEl.innerHTML = `<p class="${cls}">${t(key)}</p>`;
  };

  if (
    !data.name ||
    data.name.trim().length < 3 ||
    !/^\d{7,15}$/.test(ph) ||
    (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) ||
    (formKind === 'join' && !(data.reason || '').trim()) ||
    (formKind === 'reg' && !data.ev) ||
    (formKind === 'shop' &&
      (!data.pid || !data.size || !(+data.qty >= 1 && +data.qty <= 10)))
  ) {
    return say('e_req', 'err');
  }

  // Prevent local duplicates
  if (formKind === 'reg' && store.db.regs.some(r => r.ev === data.ev && r.phone === ph)) {
    return say('e_dup', 'err');
  }
  if (
    formKind === 'join' &&
    store.db.joins.some(r => r.phone === ph && r.status === 'pending')
  ) {
    return say('e_dupj', 'err');
  }
  if (
    formKind === 'shop' &&
    store.db.orders.some(
      r =>
        r.pid === data.pid &&
        r.phone === ph &&
        r.size === data.size &&
        r.status === 'new'
    )
  ) {
    return say('e_dups', 'err');
  }

  const origBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = t('sending');

  const newRecord = {
    id: uid(),
    name: data.name.trim(),
    phone: ph,
    email: data.email || ''
  };

  let targetKind = 'regs';
  if (formKind === 'reg') {
    newRecord.ev = data.ev;
    newRecord.note = data.note || '';
    targetKind = 'regs';
  } else if (formKind === 'shop') {
    newRecord.pid = data.pid;
    newRecord.size = data.size;
    newRecord.qty = +data.qty;
    newRecord.note = data.note || '';
    newRecord.status = 'new';
    targetKind = 'orders';
  } else {
    newRecord.level = data.level;
    newRecord.reason = data.reason.trim();
    newRecord.status = 'pending';
    targetKind = 'joins';
  }

  try {
    if (IS_LIVE) {
      const sb = getSupabase();
      const { error } = await sb.from(TABLE_MAP[targetKind]).insert(newRecord);
      if (error) throw error;
    } else {
      store.db[targetKind].push({ ...newRecord, date: new Date().toISOString() });
      await store.syncToSupabase();
    }

    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = origBtnText;

    const okMsgKey =
      formKind === 'reg' ? 'ok_reg' : formKind === 'shop' ? 'ok_shop' : 'ok_join';
    say(okMsgKey, 'ok');

    msgEl.innerHTML +=
      (IS_LIVE ? '' : `<p class="m">${t('demo_note')}</p>`) +
      (store.db.set.wa
        ? `<p><a class="btn p s" href="${U(WA())}?text=${encodeURIComponent(
            'KHUTWA TEAM · ' +
              (formKind === 'reg'
                ? L((store.db.events.find(r => r.id === data.ev) || {}).title)
                : formKind === 'shop'
                ? L((store.db.shop.find(r => r.id === data.pid) || {}).name) +
                  ' · ' +
                  data.size +
                  ' × ' +
                  data.qty
                : t('join')) +
              ' · ' +
              newRecord.name +
              ' · ' +
              newRecord.phone
          )}" target="_blank" rel="noopener">${t('sendwa')}</a></p>`
        : '');
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = origBtnText;
    console.error('Submission error:', err);
    if (err.code === '23505') {
      return say(
        formKind === 'reg' ? 'e_dup' : formKind === 'shop' ? 'e_dups' : 'e_dupj',
        'err'
      );
    }
    return say('e_net', 'err');
  }
});

function displayCheckinSuccess(form, record, msgKey) {
  const ev = store.db.events.find(x => x.id === record.ev) || {};
  form.closest('.card').innerHTML = `<h2>${t(msgKey)}</h2><p class="m">${E(
    L(ev.title)
  )} · ${E(record.name)}</p><p>${A('join', t('cta2'), 'btn p s')}</p>${
    IS_LIVE ? '' : `<p class="m">${t('demo_note')}</p>`
  }`;
}

// Background shape motion
if (!window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
  let rf;
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
}

// Hash change router listener
window.addEventListener('hashchange', () => {
  const hash = (location.hash || '#home').slice(1);
  if (hash !== currentRoute) {
    currentRoute = hash;
    render();
    window.scrollTo(0, 0);
  }
});

// App Bootstrap
export async function bootstrap() {
  initLang();
  const theme = localStorage.getItem('khutwa_theme');
  if (theme) document.documentElement.dataset.theme = theme;
  setInterval(tickCountdown, 1000);

  if (IS_LIVE) {
    $('#app').innerHTML = '<p class="w" style="padding:60px 20px">…</p>';
    try {
      // Check existing session
      store.isAdmin = await verifyOrganizerPrivileges();
      await store.loadFromSupabase();
    } catch (e) {
      console.error('Live boot error:', e);
      render();
      $('#app').innerHTML = `<section class="sec"><div class="w"><p>${t(
        'e_net'
      )}</p></div></section>`;
      return;
    }
    render();
  } else {
    store.loadDemo();
    render();
  }
}
