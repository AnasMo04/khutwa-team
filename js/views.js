import { store } from './data.js';
import { IS_LIVE } from './supabase.js';
import { t, E, L, fmt, U } from './utils.js';
import {
  A,
  sc,
  SH,
  MQ,
  TRK,
  gcal,
  waLink,
  isUpcoming,
  evCard,
  achCard,
  inp,
  tail,
  nextRunBadge,
  tee,
  prod,
  tile,
  IG,
  WA,
  gb
} from './components.js';

export const views = {
  home: () =>
    `<div class="hero dk">${[4]
      .map(
        n =>
          `<div class="sl" style="background-image:${
            (store.db.set.hero && gb(store.db.set.hero)) || 'var(--i' + n + ')'
          }" role="img" aria-label="${t('photo')}"></div>`
      )
      .join('')}<div class="ov"></div>${SH()}<div class="w"><p class="eye">KHUTWA TEAM · ${t(
      'city'
    )}</p><h1>${t('tag')}</h1>${nextRunBadge()}<p>${A(
      'events',
      t('cta1'),
      'btn p'
    )} ${A('join', t('cta2'), 'btn')}</p></div></div>` +
    sc(
      t('upc'),
      `<div class="grid">${store.db.events
        .filter(isUpcoming)
        .sort((a, b) => (a.when < b.when ? -1 : 1))
        .slice(0, 3)
        .map(evCard)
        .join('') || t('empty')}</div>`,
      t('samp'),
      's1'
    ) +
    MQ() +
    sc(
      'KHUTWA TEAM',
      `<p style="max-width:640px;font-size:18px">${t('about_p')}</p>`,
      0,
      'dk s2'
    ) +
    sc(
      t('val_h'),
      `<div class="grid">${[1, 2, 3]
        .map(
          n =>
            `<div class="card"><h3>${t('v' + n)}</h3><p>${t('v' + n + 'p')}</p></div>`
        )
        .join('')}</div>`,
      0,
      's3'
    ) +
    sc(
      t('chl'),
      `<div class="card"><div class="big">312 / 500 ${t(
        'kmu'
      )}</div><div class="bar2"><i style="width:62.4%"></i></div><p class="m">${t(
        'chn'
      )}</p></div>`,
      0,
      's4'
    ) +
    (store.db.shop[0]
      ? sc(
          t('shop_h'),
          `<div class="shopt">${tee(store.db.shop[0])}<div><p style="font-size:18px">${t(
            'home_shop_p'
          )}</p><p>${A('shop', t('reserve'), 'btn p')}</p></div></div>`,
          0,
          'dk s7'
        )
      : '') +
    TRK() +
    sc(
      t('feat'),
      `<div class="grid">${store.db.ach.slice(0, 3).map(achCard).join('')}</div>`,
      0,
      's5'
    ) +
    sc(
      t('acts'),
      `<div class="grid">${store.db.gal.slice(0, 3).map(tile).join('')}</div>`,
      0,
      'dk s6'
    ) +
    `<section class="sec dk cta">${SH()}<div class="w"><h2>${t(
      'cta_h'
    )}</h2><p class="m">${t('cta_p')}</p><p>${A(
      'join',
      t('cta2'),
      'btn p'
    )} <a class="btn" href="${U(IG())}" target="_blank" rel="noopener">Instagram</a> <a class="btn" href="${U(
      WA()
    )}" target="_blank" rel="noopener">WhatsApp</a></p><p class="m">${t(
      'ph'
    )}</p></div></section>`,

  events: () =>
    sc(
      t('events'),
      `<h3>${t('upc')}</h3><div class="grid">${store.db.events
        .filter(isUpcoming)
        .sort((a, b) => (a.when < b.when ? -1 : 1))
        .map(evCard)
        .join('') || t('empty')}</div><h3>${t('past')}</h3><div class="grid">${store.db.events
        .filter(v => !isUpcoming(v))
        .sort((a, b) => (a.when < b.when ? 1 : -1))
        .map(evCard)
        .join('') || t('empty')}</div>`,
      t('samp'),
      's1'
    ),

  event: id => {
    const v = store.db.events.find(x => x.id === id);
    if (!v) {
      return sc(
        t('events'),
        t('empty') + '<br>' + A('events', t('back'), 'btn s')
      );
    }
    const o = store.db.events.filter(
      x => x.status === 'open' && (x.id === id || isUpcoming(x))
    );
    return sc(
      E(L(v.title)),
      `<p><span class="tag">${t(v.type)}</span><span class="tag g">${t(
        v.status
      )}</span>${v.beginner ? `<span class="tag g">${t('beginner')}</span>` : ''}</p><p>${fmt(
        v.when
      )} · ${v.km} ${t('kmu')}</p><p>${E(L(v.desc))}</p><p><b>${t(
        'point'
      )}:</b> ${E(L(v.point))} · <a href="${U(
        v.map
      )}" target="_blank" rel="noopener">${t('mapbtn')}</a></p><p>${A(
        'events',
        t('back'),
        'btn s'
      )} <a class="btn s" href="${E(
        gcal(v)
      )}" target="_blank" rel="noopener">${t('cal')}</a> <a class="btn s" href="${E(
        waLink(v)
      )}" target="_blank" rel="noopener">${t('share')}</a></p><div class="card">${
        v.status === 'open'
          ? `<form data-f="reg" novalidate><h3>${t('reg_h')}</h3><label for="ev">${t(
              'ev'
            )}</label><select id="ev" name="ev">${o
              .map(
                x =>
                  `<option value="${x.id}"${x.id === id ? ' selected' : ''}>${E(
                    L(x.title)
                  )} · ${fmt(x.when)}</option>`
              )
              .join('')}</select>${inp('name', 'fname', 1)}${inp(
              'phone',
              'phone',
              1,
              'tel'
            )}${inp('email', 'email', 0, 'email')}<label for="note">${t(
              'note'
            )}</label><textarea id="note" name="note" maxlength="200" rows="2"></textarea>${tail(
              'submit',
              IS_LIVE
            )}`
          : `<p>${t('closed')}</p>`
      }</div>`
    );
  },

  tools: () =>
    sc(
      t('pc_t'),
      `<div class="card" id="pc"><div class="grid"><label>${t(
        'km'
      )}<input id="pd" type="number" min="0" step="any" value="5" inputmode="decimal"></label><label>${t(
        'tm'
      )}<span style="display:flex;gap:6px"><input id="ph" type="number" min="0" value="0" aria-label="h"><input id="pm" type="number" min="0" value="28" aria-label="m"><input id="ps" type="number" min="0" value="0" aria-label="s"></span></label></div></div><div id="po"></div>`,
      0,
      's4'
    ),

  community: () =>
    sc(
      t('community'),
      `<div class="grid">${store.db.members
        .filter(m => m.pub)
        .map(
          m =>
            `<article class="card"><div class="av"${
              gb(m.photo)
                ? ` style="background-image:${gb(
                    m.photo
                  )};background-size:cover;color:transparent"`
                : ''
            }>${E([...L(m.name)][0])}</div><h3>${E(L(m.name))}</h3><p>${E(
              L(m.bio)
            )}</p><p class="m">${t('interests')}: ${E(
              L(m.interests)
            )}</p><span class="tag g">${t('sample')}</span></article>`
        )
        .join('') || t('empty')}</div>`,
      t('comm_p') + ' ' + t('about_p'),
      's1'
    ) +
    sc(
      t('gal'),
      `<div class="grid">${store.db.gal.map(tile).join('') || t('empty')}</div>`,
      0,
      'dk s6'
    ),

  ach: () =>
    sc(
      t('ach'),
      `<div class="grid">${store.db.ach.map(achCard).join('') || t('empty')}</div>`,
      t('ach_p'),
      's5'
    ),

  routes: () =>
    sc(
      t('routes'),
      `<div class="grid">${store.db.routes
        .map(
          r =>
            `<article class="card"><span class="tag">${t(
              r.level
            )}</span><span class="tag g">${t('sample')}</span><h3>${E(
              L(r.name)
            )}</h3><p class="m">${r.km} ${t('kmu')} · ${t('from')}: ${E(
              L(r.from)
            )}</p><p><b>${t('safety')}:</b> ${E(
              L(r.safety)
            )}</p><a href="${U(r.map)}" target="_blank" rel="noopener">${t(
              'mapbtn'
            )}</a></article>`
        )
        .join('') || t('empty')}</div>`,
      t('routes_p'),
      's4'
    ),

  shop: () =>
    sc(
      t('shop_h'),
      `<div class="steps">${[1, 2, 3, 4]
        .map(
          n =>
            `<div><b class="n">${n}</b><h4>${t('sh' + n)}</h4><p class="m">${t(
              'sh' + n + 'p'
            )}</p></div>`
        )
        .join(
          ''
        )}</div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${store.db.shop
        .map(p => prod(p, IS_LIVE))
        .join('') || t('empty')}</div>`,
      t('shop_p'),
      's1'
    ),

  checkin: () => {
    const c = store.db.set.checkin || {};
    const v = store.db.events.find(x => x.id === c.ev);
    return sc(
      t('ci_h'),
      c.open && v
        ? `<div class="card"><p><b>${E(L(v.title))}</b><br><span class="m">${fmt(
            v.when
          )}</span></p><form data-f="ci" novalidate>${inp(
            'name',
            'ci_name',
            1
          )}${inp('phone', 'phone', 1, 'tel')}<label for="age">${t(
            'ci_age'
          )} *</label><input id="age" name="age" type="number" min="1" max="99" inputmode="numeric" required><input name="hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true"><label class="cb"><input type="checkbox" name="consent" style="width:auto"> ${t(
            'ci_consent'
          )}</label><p class="m">${t('priv')}</p>${
            IS_LIVE ? '' : `<p class="m">${t('demo_note')}</p>`
          }<button class="btn p">${t('ci_btn')}</button><div id="msg" role="status" aria-live="polite"></div></form></div>`
        : `<p>${t('ci_closed')}</p>`,
      0,
      's1'
    );
  },

  join: () =>
    sc(
      t('join_h'),
      `<form class="card" data-f="join" novalidate>${inp(
        'name',
        'fname',
        1
      )}${inp('phone', 'phone', 1, 'tel')}${inp(
        'email',
        'email',
        0,
        'email'
      )}<label for="level">${t('level')}</label><select id="level" name="level">${[
        'lv1',
        'lv2',
        'lv3'
      ]
        .map(k => `<option value="${k}">${t(k)}</option>`)
        .join('')}</select><label for="reason">${t(
        'reason'
      )} *</label><textarea id="reason" name="reason" maxlength="300" rows="3" required></textarea>${tail(
        'submit',
        IS_LIVE
      )}`
    )
};
