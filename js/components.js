import { store } from './data.js';
import { t, E, L, fmt, U } from './utils.js';

export const gi = g => (g && g.url ? `url('${E(g.url)}')` : g && g.i ? `var(--i${g.i})` : '');
export const gb = id => {
  const g = store.db.gal.find(x => x.id === id);
  return g ? gi(g) : '';
};
export const tile = g =>
  `<div class="ph im" style="background-image:${gi(g)}" role="img" aria-label="${E(L(g.cap) || t('photo'))}"></div>`;

export const IG = () => store.db.set.ig || 'https://www.instagram.com/';
export const WA = () => 'https://wa.me/' + (store.db.set.wa || '').replace(/\D/g, '');

export const A = (g, x, c = '') => `<a class="${c}" href="#${g}" data-go="${g}">${x}</a>`;

export const backBtn = (fallbackTarget = 'home', labelKey = 'back') =>
  `<button type="button" class="btn s bck-btn" data-a="back" data-back-to="${fallbackTarget}"><span class="bck-arr" aria-hidden="true">←</span> <span>${t(labelKey)}</span></button>`;

export const sc = (h, b, p, c = '') =>
  `<section class="sec ${c}"><div class="w"><h2>${h}</h2>${p ? `<p class="m">${p}</p>` : ''}${b}</div></section>`;

export const SH = () =>
  `<div class="shp" aria-hidden="true">${[
    ['q', 44, 6, 18, 50],
    ['o', 70, 84, 10, -35],
    ['p', 90, 72, 58, 25],
    ['q', 26, 34, 72, -60],
    ['c', 54, 50, 16, 40],
    ['p', 56, 14, 58, -20]
  ]
    .map(
      ([k, s, x, y, d]) =>
        `<b class="${k}" data-d="${d}" style="width:${s}px;height:${s}px;left:${x}%;top:${y}%"></b>`
    )
    .join('')}</div>`;

export const MQ = () => {
  const w = [t('tag'), 'KHUTWA TEAM', t('v1'), t('v3')]
    .map(x => `<span>${E(x)}</span>`)
    .join('');
  return `<div class="mq" aria-hidden="true"><div>${w + w + w + w}</div></div>`;
};

export const TRK = () =>
  `<div class="trk" aria-hidden="true">${[6, 24, 42, 60]
    .map(
      (y, i) =>
        `<i style="top:${y}px;animation-duration:${5 + i * 1.7}s;animation-delay:-${i * 2}s"></i>`
    )
    .join('')}</div>`;

export const gcal = v => {
  const z = d => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '');
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
    encodeURIComponent('KHUTWA TEAM: ' + L(v.title)) +
    '&dates=' +
    z(v.when) +
    '/' +
    z(new Date(v.when).getTime() + 36e5) +
    '&location=Misrata'
  );
};

export const waLink = v =>
  'https://wa.me/?text=' +
  encodeURIComponent('KHUTWA TEAM: ' + L(v.title) + ' · ' + fmt(v.when));

export const isUpcoming = v =>
  v.status !== 'completed' && new Date(v.when) > new Date();

export const evCard = v =>
  `<article class="card">${
    gb(v.img) ? `<div class="cov" style="background-image:${gb(v.img)}"></div>` : ''
  }<span class="tag">${t(v.type)}</span><span class="tag g">${t(v.status)}</span>${
    v.beginner ? `<span class="tag g">${t('beginner')}</span>` : ''
  }<h3>${E(L(v.title))}</h3><p class="m">${fmt(v.when)} · ${v.km} ${t('kmu')}<br>${E(
    L(v.point)
  )}</p><p>${E(L(v.desc))}</p>${A('event-' + v.id, t('details'), 'btn s')}</article>`;

export const achCard = a =>
  `<article class="card"><span class="tag">${t(a.cat)}</span><h3>${E(
    L(a.title)
  )}</h3><p class="m">${E(a.who)}</p><span class="tag g">${t('sample')}</span></article>`;

export const inp = (k, l, r, ty = 'text') =>
  `<label for="${k}">${t(l)}${r ? ' *' : ''}</label><input id="${k}" name="${k}" type="${ty}"${
    r ? ' required' : ''
  } maxlength="80">`;

export const tail = (bt = 'submit', isLive = false) =>
  `<p class="m">${t('priv')}</p>${
    isLive ? '' : `<p class="m">${t('demo_note')}</p>`
  }<button class="btn p">${t(bt)}</button><div id="msg" role="status" aria-live="polite"></div></form>`;

export const nextRunBadge = () => {
  const v = store.db.events
    .filter(x => x.status === 'open' && isUpcoming(x))
    .sort((a, b) => (a.when < b.when ? -1 : 1))[0];
  return v
    ? `<div class="cdn" data-t="${v.when}"><b>${t('next')}</b> · ${E(
        L(v.title)
      )}<div class="cdt">${['d', 'h', 'm', 's']
        .map(u => `<span><i data-u="${u}">00</i>${t(u + u)}</span>`)
        .join('')}</div></div>`
    : '';
};

export const tee = p => {
  const im = p.img && gb(p.img);
  return `<div class="tee" role="img" aria-label="${E(L(p.name))}"${
    im ? ` style="background-image:${im}"` : ''
  }>${
    im
      ? ''
      : `<div class="tee-placeholder"><svg viewBox="0 0 200 200" aria-hidden="true"><path d="M70 20l-50 22 16 40 24-8v106h80V74l24 8 16-40-50-22c-6 14-18 22-30 22S76 34 70 20z" fill="#111" stroke="#3a3a3a" stroke-width="2"/></svg><span class="lgo"></span><small>${t(
          'mock'
        )}</small></div>`
  }</div>`;
};

export const prod = (p, isLive = false) =>
  `<article class="card prod-card"><div class="prod-media">${tee(p)}</div><div class="prod-info"><div class="prod-head"><h3>${E(
    L(p.name)
  )}</h3><div class="prod-price">${
    p.price ? p.price + ' ' + t('lyd') : t('price_tba')
  }</div></div><p class="prod-desc">${E(L(p.desc))}</p>${
    p.status === 'avail'
      ? `<form class="prod-form" data-f="shop" novalidate><input type="hidden" name="pid" value="${E(
          p.id
        )}"><div class="prod-row"><div class="prod-field"><label for="sz_${E(p.id)}">${t(
          'size'
        )} *</label><select id="sz_${E(p.id)}" name="size">${(
          p.sizes || ''
        )
          .split(',')
          .map(x => x.trim())
          .filter(Boolean)
          .map(x => `<option>${E(x)}</option>`)
          .join('')}</select></div><div class="prod-field"><label for="qt_${E(p.id)}">${t(
          'qty'
        )}</label><input id="qt_${E(p.id)}" name="qty" type="number" min="1" max="10" value="1"></div></div><div class="prod-inputs">${inp(
          'name',
          'fname',
          1
        )}${inp('phone', 'phone', 1, 'tel')}<label for="note_${E(p.id)}">${t(
          'note'
        )}</label><textarea id="note_${E(p.id)}" name="note" maxlength="200" rows="2"></textarea></div>${tail(
          'reserve',
          isLive
        )}`
      : `<p class="prod-closed">${t('res_closed')}</p>`
  }</div></article>`;
