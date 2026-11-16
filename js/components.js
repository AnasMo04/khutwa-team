import { store } from './data.js';
import { t, E, L, fmt, U } from './utils.js';

function cssUrl(u) {
  const s = String(u || '').trim();
  if (!/^https?:\/\/[^\s"'()<>\\]+$/i.test(s) && !/^blob:[^\s"'()<>\\]+$/i.test(s)) return '';
  return `url('${s}')`;
}

export function safeSrc(u) {
  const s = String(u || '').trim();
  if (/^https?:\/\/[^\s"'<>\\]+$/i.test(s)) return s;
  if (/^img\/img-[1-4]\.jpg$/i.test(s)) return s;
  return '';
}

export function imageSrc(g) {
  const url = g && safeSrc(g.url);
  if (url) return url;
  if (g && /^[1-4]$/.test(String(g.i ?? ''))) return `img/img-${g.i}.jpg`;
  return '';
}

export function bgImage(g) {
  const url = g && cssUrl(g.url);
  if (url) return url;
  if (g && /^[1-4]$/.test(String(g.i ?? ''))) return `var(--i${g.i})`;
  return '';
}

export const gi = bgImage;

/** Kilometers already run and the monthly goal. Missing or invalid settings fall back to 312 / 500. */
export function challengeBar() {
  const raw = (store.db.set && store.db.set.challenge) || {};
  const done = Number(raw.done);
  const goal = Number(raw.goal);
  const km = Number.isFinite(done) && done >= 0 ? done : 312;
  const target = Number.isFinite(goal) && goal > 0 ? goal : 500;
  const pct = Math.max(0, Math.min(100, (km / target) * 100));
  return `<div class="card"><div class="big">${km} / ${target} ${t(
    'kmu'
  )}</div><div class="bar2"><i style="width:${pct}%"></i></div><p class="m">${t('chn')}</p></div>`;
}
export const gb = id => {
  const g = store.db.gal.find(x => x.id === id);
  return g ? gi(g) : '';
};
export const srcFor = id => {
  const g = id && store.db.gal.find(x => x.id === id);
  return g ? imageSrc(g) : '';
};
export const tile = g => {
  const src = imageSrc(g);
  const alt = E(L(g.cap) || t('photo'));
  return src
    ? `<img class="ph im" src="${E(src)}" alt="${alt}" width="515" height="765" loading="lazy" decoding="async">`
    : `<div class="ph" role="img" aria-label="${alt}"></div>`;
};

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
  const start = new Date(v && v.when);
  if (Number.isNaN(start.getTime())) return '#';
  const z = d => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '');
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
    encodeURIComponent('KHUTWA TEAM: ' + L(v.title)) +
    '&dates=' +
    z(start) +
    '/' +
    z(start.getTime() + 36e5) +
    '&location=Misrata'
  );
};

export const waLink = v =>
  'https://wa.me/?text=' +
  encodeURIComponent('KHUTWA TEAM: ' + L(v.title) + ' · ' + fmt(v.when));

export const isUpcoming = v =>
  v.status !== 'completed' && new Date(v.when) > new Date();

export const evCard = v => {
  const cover = srcFor(v.img);
  return `<article class="card ev-card">${
    cover
      ? `<img class="cov" src="${E(cover)}" alt="" width="800" height="450" loading="lazy" decoding="async">`
      : ''
  }<span class="tag">${t(v.type)}</span><span class="tag g">${t(v.status)}</span>${
    v.beginner ? `<span class="tag g">${t('beginner')}</span>` : ''
  }<h3>${E(L(v.title))}</h3><p class="m">${fmt(v.when)} · ${v.km} ${t('kmu')}<br>${E(
    L(v.point)
  )}</p><p class="clip">${E(L(v.desc))}</p><div class="card-act">${A(
    'event-' + v.id,
    t('details'),
    'btn s'
  )}</div></article>`;
};

export const achCard = a => {
  const catLabel = a.cat ? t(a.cat) : '';
  const whoText = a.who ? E(a.who) : '';
  return `<article class="card">${
    catLabel ? `<span class="tag">${catLabel}</span>` : ''
  }<h3>${E(L(a.title))}</h3>${whoText ? `<p class="m">${whoText}</p>` : ''}</article>`;
};

export const inp = (k, l, r, ty = 'text') => {
  const ac = ty === 'tel' ? 'tel' : ty === 'email' ? 'email' : k === 'name' ? 'name' : 'on';
  const mode = ty === 'tel' ? 'tel' : ty === 'email' ? 'email' : 'text';
  return `<label for="${k}">${t(l)}${r ? ' *' : ''}</label><input id="${k}" name="${k}" type="${ty}" autocomplete="${ac}" inputmode="${mode}"${
    r ? ' required' : ''
  } maxlength="80">`;
};

export const tail = (bt = 'submit', isLive = false) =>
  `<input class="hp" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="m">${t('priv')}</p>${
    isLive ? '' : `<p class="m">${t('demo_note')}</p>`
  }<button class="btn p" type="submit">${t(bt)}</button><div id="msg" role="status" aria-live="polite"></div></form>`;

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
  const src = srcFor(p.img);
  const alt = E(L(p.name));
  return `<div class="tee">${
    src
      ? `<img src="${E(src)}" alt="${alt}" width="800" height="600" loading="lazy" decoding="async">`
      : `<div class="tee-placeholder" role="img" aria-label="${alt}"><svg viewBox="0 0 200 200" aria-hidden="true"><path d="M70 20l-50 22 16 40 24-8v106h80V74l24 8 16-40-50-22c-6 14-18 22-30 22S76 34 70 20z" fill="#111" stroke="#3a3a3a" stroke-width="2"/></svg><span class="lgo"></span><small>${t(
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
