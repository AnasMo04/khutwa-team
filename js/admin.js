import { store, CONTENT_KINDS, PEOPLE_KINDS, TABLE_MAP } from './data.js';
import { IS_LIVE, signIn, signOut, verifyOrganizerPrivileges, getSupabase } from './supabase.js';
import { S } from './translations.js';
import { t, E, L, fmt, U, $, toast } from './utils.js';
import { A, sc, isUpcoming } from './components.js';

export const ORDER_STATUSES = ['new', 'contacted', 'confirmed', 'delivered', 'cancelled'];
export const JOIN_STATUSES = ['pending', 'approved', 'rejected'];

export const ADMIN_CONFIG = {
  events: {
    c: ['title', 'when', 'type', 'status'],
    fl: 1,
    f: [
      ['title', 'b'],
      ['when', 'd'],
      ['km', 'n'],
      ['type', 's', ['easy', 'run5', 'speed']],
      ['point', 'b'],
      ['maplink', 't', 'map'],
      ['desc', 'b'],
      ['status', 's', ['open', 'cancelled', 'completed']],
      ['beginner', 'c'],
      ['img', 'p']
    ]
  },
  regs: {
    c: ['name', 'phone', 'ev', 'note', 'date']
  },
  members: {
    c: ['name', 'pub'],
    f: [
      ['name', 'b'],
      ['bio', 'b'],
      ['interests', 'b'],
      ['pub', 'c'],
      ['photo', 'p']
    ]
  },
  ach: {
    c: ['title', 'cat', 'who'],
    f: [
      ['title', 'b'],
      ['cat', 's', ['first5k', 'pb', 'consist', 'part', 'monthly']],
      ['who', 't']
    ]
  },
  joins: {
    c: ['name', 'phone', 'level', 'reason', 'status'],
    fl: 1
  },
  gal: {
    c: ['thumb', 'cap'],
    f: [['cap', 'b']],
    up: 1
  },
  shop: {
    c: ['name', 'price', 'sizes', 'status'],
    f: [
      ['name', 'b'],
      ['price', 'n'],
      ['sizes', 't'],
      ['desc', 'b'],
      ['status', 's', ['avail', 'soldout'], 'status', 'booking_status'],
      ['img', 'p', null, 'img', 'prod_img']
    ]
  },
  orders: {
    c: ['name', 'phone', 'pid', 'size', 'qty', 'status', 'date'],
    fl: 1
  },
  routes: {
    c: ['name', 'km', 'level', 'safety'],
    f: [
      ['name', 'b'],
      ['km', 'n'],
      ['from', 'b'],
      ['maplink', 't', 'map'],
      ['level', 's', ['easy', 'moderate', 'hard']],
      ['safety', 'b']
    ]
  }
};

const NAV_GROUPS = [
  ['content', ['events', 'shop', 'gal', 'ach', 'members', 'routes']],
  ['people', ['checkin', 'orders', 'regs', 'joins']],
  ['site', ['set']]
];

export function renderLoginView() {
  return sc(
    t('admin_live'),
    `<form class="card" data-f="login" style="max-width:420px"><h3>${t(
      'login_h'
    )}</h3><label>${t(
      'em'
    )}<input name="email" type="email" required autocomplete="username"></label><label>${t(
      'pw'
    )}<input name="password" type="password" required autocomplete="current-password"></label><p><button class="btn p">${t(
      'login_btn'
    )}</button></p><p id="lm" class="err" role="status"></p></form>`
  );
}

export function renderAdminView(tab, onNavigate) {
  if (!store.isAdmin) {
    if (IS_LIVE) {
      return renderLoginView();
    }
    return sc(t('admin'), `<p>${t('lock')}</p>`);
  }

  const validTab =
    tab && (ADMIN_CONFIG[tab] || tab === 'set' || tab === 'checkin') ? tab : 'overview';

  const side = `<aside class="sb"><a class="${
    validTab === 'overview' ? 'on' : ''
  }" href="#admin" data-go="admin">${t('overview')}</a>${NAV_GROUPS.map(
    ([g, ks]) =>
      `<p class="gl">${t('g_' + g)}</p>${ks
        .map(
          k =>
            `<a class="${
              k === validTab ? 'on' : ''
            }" href="#admin-${k}" data-go="admin-${k}">${t(k)}</a>`
        )
        .join('')}`
  ).join('')}</aside>`;

  const isPeopleTab = ['checkin', 'orders', 'regs', 'joins'].includes(validTab);
  const bar = `<div class="abar"><div><h2>${t(validTab)}</h2>${
    validTab !== 'overview'
      ? `<p class="m">${t('d_' + validTab)} <span class="tag g">${t(
          isPeopleTab ? (IS_LIVE ? 'vis_priv' : 'vis_loc') : 'vis_pub'
        )}</span></p>`
      : ''
  }</div><div class="pb"><button class="btn s" data-a="refresh">${t(
    'refresh'
  )}</button> <button class="btn s" data-a="logout">${t('logout')}</button></div></div>`;

  return `<div class="adm">${side}<div class="am">${bar}${
    validTab === 'overview'
      ? renderOverview()
      : validTab === 'set'
      ? renderSettingsForm()
      : validTab === 'checkin'
      ? renderCheckinPanel()
      : renderTable(validTab)
  }</div></div>`;
}

function renderOverview() {
  const ck = [
    [store.db.set.wa, 'c1', 'admin-set'],
    [store.db.gal.some(g => g.url), 'c2', 'admin-gal'],
    [store.db.set.hero, 'c4', 'admin-set'],
    [store.db.events.some(v => v.custom), 'c3', 'admin-events']
  ];

  return `${
    IS_LIVE && store.isEmpty
      ? `<div class="card"><h3>${t('init_h')}</h3><p>${t(
          'init_p'
        )}</p><button class="btn p" data-a="init">${t('init_btn')}</button></div>`
      : ''
  }<div class="card"><h3>${t('how_h')}</h3><div class="steps">${[1, 2, 3]
    .map(
      n =>
        `<div><b class="n">${n}</b><h4>${t(
          (IS_LIVE ? 'l' : '') + 'st' + n
        )}</h4><p class="m">${t((IS_LIVE ? 'l' : '') + 'st' + n + 'p')}</p></div>`
    )
    .join('')}</div></div>
<h3>${t('qa')}</h3><p><button class="btn p" data-a="edit" data-c="events">${t(
    'add_event'
  )}</button> ${A('admin-gal', t('upl'), 'btn')} ${A(
    'admin-set',
    t('set'),
    'btn'
  )}</p>
<h3>${t('check')}</h3><div class="card">${ck
    .map(
      ([ok, k, g]) =>
        `<p class="ck ${ok ? 'ok2' : ''}">${ok ? '✓' : '○'} ${
          ok ? t(k) : A(g, t(k))
        }</p>`
    )
    .join('')}</div>
<div class="grid">${[
    [t('upc'), store.db.events.filter(isUpcoming).length],
    [t('regs'), store.db.regs.length],
    [t('pending'), store.db.joins.filter(j => j.status === 'pending').length],
    [t('members'), store.db.members.length],
    [t('ach'), store.db.ach.length],
    [t('routes'), store.db.routes.length],
    [t('gal'), store.db.gal.length],
    [t('orders'), store.db.orders.length],
    [t('checkin'), store.db.checkins.length]
  ]
    .map(
      ([a, b]) =>
        `<div class="card"><div class="big">${b}</div>${a}</div>`
    )
    .join('')}</div>${
    IS_LIVE ? '' : `<button class="btn d s" data-a="reset">${t('reset')}</button>`
  }`;
}

export function renderSettingsForm() {
  return `<form class="card" data-f="set">${[
    ['ig', 'ig'],
    ['wa', 'wa'],
    ['phone', 'phone'],
    ['email', 'mail']
  ]
    .map(
      ([k, l]) =>
        `<label>${t(l)}<input name="${k}" value="${E(store.db.set[k] || '')}"></label>`
    )
    .join('')}<label>${t(
    'herop'
  )}<select name="hero"><option value="">-</option>${store.db.gal
    .map(
      g =>
        `<option value="${g.id}"${
          g.id === store.db.set.hero ? ' selected' : ''
        }>${E(L(g.cap) || g.id)}</option>`
    )
    .join(
      ''
    )}</select></label><p><button class="btn p">${t('save')}</button></p></form>`;
}

function cell(c, k, r) {
  const v = r[k];
  if (k === 'price') return v ? `${v} ${t('lyd')}` : t('price_tba');
  if (k === 'pid')
    return E(L((store.db.shop.find(x => x.id === v) || {}).name));
  if (k === 'thumb')
    return `<span class="tmb" style="background-image:${
      r.url ? `url('${E(r.url)}')` : `var(--i${r.i})`
    }"></span>`;
  if (k === 'status' && (c === 'joins' || c === 'orders' || c === 'shop')) {
    const list = c === 'orders' ? ORDER_STATUSES : c === 'shop' ? ['avail', 'soldout'] : JOIN_STATUSES;
    return `<select data-st="${r.id}" data-c="${c}" aria-label="${t(
      c === 'shop' ? 'booking_status' : 'status'
    )}">${list
      .map(
        s => `<option value="${s}"${s === v ? ' selected' : ''}>${t(s)}</option>`
      )
      .join('')}</select>`;
  }
  if (k === 'when' || k === 'date') return fmt(v);
  if (k === 'ev') return E(L((store.db.events.find(x => x.id === v) || {}).title));
  if (typeof v === 'boolean') return t(v ? 'yes' : 'no');
  return E(typeof v === 'string' && S[v] ? t(v) : L(v));
}

export function renderTable(c) {
  const g = ADMIN_CONFIG[c];
  if (!g) return `<div class="card"><p>${t('empty')}</p></div>`;
  const rows = c === 'gal'
    ? (store.db.gal || []).filter(g => !g.scope || g.scope === 'general')
    : (store.db[c] || []);
  const B = (a, r, x, k = '') =>
    `<button class="btn s ${k}" data-a="${a}" data-c="${c}" data-i="${r.id}">${t(
      x
    )}</button>`;
  const add = g.up
    ? `<label class="btn p s" style="margin:0">${t(
        'upl'
      )}<input type="file" id="fu" accept="image/*" multiple hidden></label>`
    : g.f
    ? `<button class="btn p s" data-a="edit" data-c="${c}">${t('add')}</button>`
    : '';

  return `<div class="bar"><input id="q" placeholder="${t(
    'search'
  )}" aria-label="${t('search')}">${
    g.fl
      ? `<select id="fs" aria-label="${t('status')}"><option value="">${t(
          'all'
        )}</option>${(c === 'events'
          ? ['open', 'cancelled', 'completed']
          : c === 'orders'
          ? ORDER_STATUSES
          : JOIN_STATUSES
        )
          .map(s => `<option value="${s}">${t(s)}</option>`)
          .join('')}</select>`
      : ''
  }${add}<span id="upm" class="m"></span></div><div id="ls">${rows
    .map(
      r =>
        `<div class="li" data-s="${r.status || ''}"><div class="lm"><b>${cell(
          c,
          g.c[0],
          r
        )}</b><div class="lc">${g.c
          .slice(1)
          .map(k => {
            const val = cell(c, k, r);
            return val ? `<span><em>${t(k)}</em> ${val}</span>` : '';
          })
          .join('')}</div></div><div class="act">${
          g.f ? B('edit', r, 'edit') : ''
        }${
          c === 'events' && r.status === 'open'
            ? B('cancel', r, 'cancel') + B('done', r, 'done')
            : ''
        }${B('del', r, 'del', 'd')}</div></div>`
    )
    .join('')}</div><div id="em" class="card"${
    rows.length ? ' hidden' : ''
  }><p>${t('empty')}</p>${rows.length ? '' : add}</div>`;
}

export function filterTableRows() {
  const q = ($('#q')?.value || '').toLowerCase();
  const s = $('#fs') ? $('#fs').value : '';
  let n = 0;
  document.querySelectorAll('.li').forEach(r => {
    const matchesQuery = r.textContent.toLowerCase().includes(q);
    const matchesStatus = !s || r.dataset.s === s;
    const hide = !(matchesQuery && matchesStatus);
    r.hidden = hide;
    if (!hide) n++;
  });
  const em = $('#em');
  if (em) em.hidden = n > 0;
}

export function openEditForm(c, id) {
  const r = id ? (store.db[c] || []).find(x => x.id === id) || {} : {};
  const df = $('#df');
  df.dataset.c = c;
  df.dataset.i = id || '';
  const g = ADMIN_CONFIG[c];
  if (!g || !g.f) return;

  $('#fb').innerHTML =
    `<h3>${t(id ? 'edit' : 'add')}</h3>` +
    g.f
      .map(([k, ty, o, altName, labelKey]) => {
        const label = t(labelKey || k);
        const v = r[k];
        if (ty === 'b') {
          return ['en', 'ar']
            .map(
              langKey =>
                `<label>${label} (${langKey.toUpperCase()})${
                  ['desc', 'bio', 'safety'].includes(k)
                    ? `<textarea name="${k}__${langKey}" rows="2">${E(
                        (v && v[langKey]) || ''
                      )}</textarea>`
                    : `<input name="${k}__${langKey}" value="${E(
                        (v && v[langKey]) || ''
                      )}">`
                }</label>`
            )
            .join('');
        }
        if (ty === 'd') {
          return `<label>${label}<input type="datetime-local" name="${k}" required value="${
            v
              ? new Date(new Date(v).getTime() + 72e5).toISOString().slice(0, 16)
              : ''
          }"></label>`;
        }
        if (ty === 'n') {
          return `<label>${label}<input type="number" step="any" min="0" name="${k}" value="${
            v ?? ''
          }"></label>`;
        }
        if (ty === 's') {
          return `<label>${label}<select name="${k}">${o
            .map(
              opt =>
                `<option value="${opt}"${opt === v ? ' selected' : ''}>${t(
                  opt
                )}</option>`
            )
            .join('')}</select></label>`;
        }
        if (ty === 'p') {
          const entityScope = c === 'shop' ? 'product' : c === 'members' ? 'member' : 'general';
          const options = store.db.gal
            .filter(pic => (pic.scope || 'general') === entityScope || pic.id === v)
            .map(
              pic =>
                `<option value="${pic.id}"${pic.id === v ? ' selected' : ''}>${E(
                  L(pic.cap) || pic.id
                )}</option>`
            )
            .join('');

          return `<label>${label}<select name="${k}" id="sel_${k}"><option value="">-</option>${options}</select></label><div style="margin-top:-6px;margin-bottom:10px"><label class="btn s" style="margin:0;display:inline-block;cursor:pointer">${t(
            'upl_single'
          )}<input type="file" class="f-entity-up" data-k="${k}" data-scope="${entityScope}" accept="image/*" hidden></label><span id="up_${k}_msg" class="m" style="margin-inline-start:8px"></span></div>`;
        }
        if (ty === 'c') {
          return `<label><input type="checkbox" name="${k}" style="width:auto"${
            v ? ' checked' : ''
          }> ${label}</label>`;
        }
        return `<label>${label}<input name="${o || k}" value="${E(
          r[o || k] || ''
        )}"></label>`;
      })
      .join('');

  $('#dlg').showModal();
}

export function renderCheckinPanel() {
  const c = store.db.set.checkin || {};
  const evs = store.db.events
    .slice()
    .sort((a, b) => (a.when < b.when ? 1 : -1));
  const sel = store.selectedCheckinEvent || c.ev || (evs[0] || {}).id || '';
  store.selectedCheckinEvent = sel;
  const rows = store.db.checkins.filter(r => r.ev === sel);
  const prev = new Set(store.db.checkins.filter(r => r.ev !== sel).map(r => r.phone));
  const ret = rows.filter(r => prev.has(r.phone)).length;
  const avg = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + r.age, 0) / rows.length)
    : 0;
  const currentEvent = store.db.events.find(x => x.id === c.ev);

  return `<div class="card"><p>${
    c.open && currentEvent
      ? t('ci_status_open') + ' <b>' + E(L(currentEvent.title)) + '</b>'
      : t('ci_status_closed')
  }</p><label>${t('ci_pick')}<select id="cis">${evs
    .map(
      v =>
        `<option value="${v.id}"${v.id === sel ? ' selected' : ''}>${E(
          L(v.title)
        )} · ${fmt(v.when)}</option>`
    )
    .join('')}</select></label><p><button class="btn p s" data-a="ciopen">${t(
    'open_ci'
  )}</button> <button class="btn s" data-a="ciclose">${t(
    'close_ci'
  )}</button> <button class="btn s" data-a="poster">${t(
    'poster'
  )}</button> <button class="btn s" data-a="csv">${t(
    'csv'
  )}</button></p></div><div class="grid">${[
    [t('stat_total'), rows.length],
    [t('stat_unique'), new Set(store.db.checkins.map(r => r.phone)).size],
    [t('stat_new'), rows.length - ret],
    [t('stat_ret'), ret],
    [t('stat_age'), avg]
  ]
    .map(
      ([label, count]) =>
        `<div class="card"><div class="big">${count}</div>${label}</div>`
    )
    .join('')}</div><div class="bar"><input id="q" placeholder="${t(
    'search'
  )}" aria-label="${t('search')}"></div><div id="ls">${rows
    .map(
      r =>
        `<div class="li"><div class="lm"><b>${E(r.name)}</b><div class="lc"><span><em>${t(
          'phone'
        )}</em> ${E(r.phone)}</span><span><em>${t('ci_age')}</em> ${
          r.age
        }</span><span>${r.date ? fmt(r.date) : ''}</span></div></div><div class="act"><button class="btn s d" data-a="del" data-c="checkins" data-i="${E(
          r.id
        )}">${t('del')}</button></div></div>`
    )
    .join('')}</div><div id="em" class="card"${
    rows.length ? ' hidden' : ''
  }><p>${t('empty')}</p></div>`;
}

export function exportCheckinsCSV() {
  const currentEv = store.selectedCheckinEvent;
  const rows = store.db.checkins.filter(r => r.ev === currentEv);
  const q = v => '"' + String(v).replace(/"/g, '""') + '"';
  const txt =
    '\ufeff' +
    [['name', 'phone', 'age', 'time'], ...rows.map(r => [r.name, r.phone, r.age, r.date || ''])]
      .map(row => row.map(q).join(','))
      .join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = `khutwa-checkin-${currentEv || 'all'}.csv`;
  a.click();
}

export function printCheckinPoster() {
  const u = location.href.split('#')[0] + '#checkin';
  const p = $('#pp');
  p.innerHTML = `<div class="lgo huge"></div><h1>${t('ci_h')}</h1><p>${t(
    'poster_p'
  )}</p><div class="qb" id="qr"></div><p class="u">${E(
    u
  )}</p><p>KHUTWA TEAM · ${t('tag')}</p>`;
  if (window.QRCode) {
    new window.QRCode($('#qr'), {
      text: u,
      width: 340,
      height: 340,
      correctLevel: window.QRCode.CorrectLevel.M
    });
  } else {
    $('#qr').textContent = 'QR library not loaded';
  }
  setTimeout(() => window.print(), 400);
}

export async function uploadImageFile(file, scope = 'general') {
  const sb = getSupabase();
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.82));

  const prefix = scope === 'general' ? 'gal' : scope;
  const path = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;

  let url = '';
  if (sb) {
    const { data, error } = await sb.storage.from('gallery').upload(path, blob, {
      contentType: 'image/jpeg'
    });
    if (error) throw error;
    const { data: publicUrlData } = sb.storage.from('gallery').getPublicUrl(path);
    url = publicUrlData.publicUrl;
  } else {
    url = URL.createObjectURL(blob);
  }

  const record = {
    id: 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
    aid: path,
    url,
    scope,
    cap: { en: '', ar: '' }
  };

  store.db.gal.push(record);
  return record;
}

export async function uploadGalleryImages(files) {
  const upm = $('#upm');
  for (const f of files) {
    if (upm) upm.textContent = '…';
    await uploadImageFile(f, 'general');
  }
  if (upm) upm.textContent = '';
}
