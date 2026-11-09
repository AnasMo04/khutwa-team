import { getSupabase, IS_LIVE, SUPABASE_URL, SUPABASE_KEY } from './supabase.js';
import { sg, ss, uid } from './utils.js';

export const CONTENT_KINDS = ['events', 'members', 'ach', 'routes', 'gal', 'set', 'shop'];
export const PEOPLE_KINDS = ['regs', 'joins', 'orders', 'checkins'];
export const TABLE_MAP = {
  regs: 'registrations',
  joins: 'join_requests',
  orders: 'orders',
  checkins: 'checkins'
};

function at(dow, w) {
  const d = new Date();
  d.setUTCHours(5, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + (((dow - d.getUTCDay() + 7) % 7) || 7) + 7 * w);
  return d.toISOString();
}

export function seed() {
  const ev = [];
  [-1, 0, 1].forEach((w, i) =>
    [
      [5, 'run5', 5, { en: 'Friday 5K Group Run', ar: 'جري جماعي 5 كم - الجمعة' }],
      [1, 'speed', 6, { en: 'Monday Speed Training', ar: 'تدريب السرعة - الاثنين' }]
    ].forEach(([d, ty, km, ti], j) =>
      ev.push({
        id: 'e' + i + j,
        title: ti,
        when: at(d, w),
        km,
        type: ty,
        point: { en: 'Meeting point to be confirmed', ar: 'نقطة اللقاء تُحدَّد لاحقًا' },
        map: 'https://www.google.com/maps/search/?api=1&query=Misrata',
        desc: {
          en: 'Sample weekly session. Organizers can edit the details.',
          ar: 'جلسة أسبوعية تجريبية. يعدّل المنظّمون التفاصيل.'
        },
        status: w < 0 ? 'completed' : 'open',
        beginner: false
      })
    )
  );

  const A5 = [
    ['first5k', 'Finished a first 5K', 'أنهى أول 5 كم'],
    ['pb', 'New personal best', 'رقم شخصي جديد'],
    ['consist', 'Ran every week this month', 'جرى كل أسبوع هذا الشهر'],
    ['part', 'Joined 4 team runs', 'شارك في 4 جريات'],
    ['monthly', 'Monthly challenge: 50 km', 'تحدي الشهر: 50 كم']
  ];

  const R = (n, km, l) => ({
    id: 'r' + n,
    name: { en: 'Sample Route ' + n + ' (placeholder)', ar: 'مسار تجريبي ' + n + ' (مؤقت)' },
    km,
    from: { en: 'To be confirmed', ar: 'يُحدَّد لاحقًا' },
    map: 'https://www.google.com/maps/search/?api=1&query=Misrata',
    level: l,
    safety: {
      en: 'Placeholder. Check the route in daylight before running.',
      ar: 'مؤقت. تحقق من المسار نهارًا قبل الجري.'
    }
  });

  return {
    events: ev,
    regs: [
      { id: 'g1', name: 'Sample Person 1', phone: '218910000001', ev: 'e01', note: '', date: new Date().toISOString() },
      { id: 'g2', name: 'Sample Person 2', phone: '218920000002', ev: 'e11', note: 'Demo', date: new Date().toISOString() }
    ],
    members: [
      {
        id: 'm1',
        name: { en: 'Sample Runner A', ar: 'عدّاء تجريبي أ' },
        bio: { en: 'Fictional profile. Loves easy morning runs.', ar: 'ملف خيالي. يحب الجري الصباحي الخفيف.' },
        interests: { en: 'Easy runs, 5K', ar: 'جري خفيف، 5 كم' },
        pub: true
      },
      {
        id: 'm2',
        name: { en: 'Sample Runner B', ar: 'عدّاءة تجريبية ب' },
        bio: { en: 'Fictional profile. Training for speed.', ar: 'ملف خيالي. تتدرب على السرعة.' },
        interests: { en: 'Speed work', ar: 'تدريب السرعة' },
        pub: true
      },
      {
        id: 'm3',
        name: { en: 'Sample Runner C', ar: 'عدّاء تجريبي ج' },
        bio: { en: 'No public permission.', ar: 'بدون إذن نشر.' },
        interests: { en: '-', ar: '-' },
        pub: false
      }
    ],
    ach: A5.map((a, i) => ({ id: 'a' + i, cat: a[0], title: { en: a[1], ar: a[2] }, who: 'Sample Runner ' + 'ABCDE'[i] })),
    routes: [R(1, 3, 'easy'), R(2, 5, 'moderate'), R(3, 8, 'hard')],
    gal: [2, 1, 3].map(i => ({ id: 'g' + i, i, cap: { en: 'Team photo', ar: 'صورة الفريق' } })),
    set: {
      ig: 'https://www.instagram.com/khutwateam',
      wa: '',
      phone: '',
      email: '',
      hero: '',
      checkin: { ev: '', open: false }
    },
    shop: [
      {
        id: 'p1',
        name: { en: 'KHUTWA Black Tee', ar: 'تيشيرت خطوة الأسود' },
        price: 0,
        sizes: 'S,M,L,XL,XXL',
        desc: { en: 'Black T-shirt with the KHUTWA logo.', ar: 'تيشيرت أسود عليه شعار خطوة.' },
        img: '',
        status: 'avail'
      }
    ],
    checkins: [],
    orders: [
      {
        id: 'o1',
        pid: 'p1',
        name: 'Sample Customer',
        phone: '218950000001',
        size: 'M',
        qty: 1,
        note: '',
        status: 'new',
        date: new Date().toISOString()
      }
    ],
    joins: [
      {
        id: 'j1',
        name: 'Sample Applicant 1',
        phone: '218930000001',
        email: '',
        level: 'lv1',
        reason: 'Want to start running',
        status: 'pending',
        date: new Date().toISOString()
      },
      {
        id: 'j2',
        name: 'Sample Applicant 2',
        phone: '218940000002',
        email: '',
        level: 'lv2',
        reason: 'Meet other runners',
        status: 'approved',
        date: new Date().toISOString()
      }
    ]
  };
}

export function createEmptyDB() {
  return {
    events: [],
    members: [],
    ach: [],
    routes: [],
    gal: [],
    shop: [],
    set: {
      ig: 'https://www.instagram.com/khutwateam',
      wa: '',
      phone: '',
      email: '',
      hero: '',
      checkin: { ev: '', open: false }
    },
    regs: [],
    joins: [],
    orders: [],
    checkins: []
  };
}

export class Store {
  constructor() {
    this.db = createEmptyDB();
    this.isAdmin = false;
    this.isEmpty = false;
    this.selectedCheckinEvent = '';
    this.snap = {};
  }

  getContent() {
    return Object.fromEntries(CONTENT_KINDS.map(k => [k, this.db[k]]));
  }

  takeSnapshot() {
    const s = {};
    CONTENT_KINDS.forEach(k => {
      const items = k === 'set' ? [{ ...this.db.set, id: 'main' }] : this.db[k];
      s[k] = Object.fromEntries((items || []).map(r => [r.id, JSON.stringify(r)]));
    });
    PEOPLE_KINDS.forEach(k => {
      s[k] = Object.fromEntries((this.db[k] || []).map(r => [r.id, JSON.stringify(r)]));
    });
    this.snap = s;
    return s;
  }

  loadDemo() {
    this.db = seed();
    try {
      const l = JSON.parse(sg('khutwa_loc'));
      if (l) {
        PEOPLE_KINDS.forEach(k => {
          if (l[k]) this.db[k] = l[k];
        });
      }
    } catch (e) {}
    try {
      const d = JSON.parse(sg('khutwa_draft'));
      if (d) {
        CONTENT_KINDS.forEach(k => {
          if (d[k]) this.db[k] = d[k];
        });
      }
    } catch (e) {}
    this.takeSnapshot();
  }

  async loadFromSupabase() {
    const sb = getSupabase();
    if (!sb) {
      this.loadDemo();
      return;
    }

    // 1. Load public site content (events, photos, settings, etc.)
    const { data: rows, error } = await sb
      .from('content')
      .select('kind, id, data, sort')
      .order('sort', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching content:', error);
      throw error;
    }

    this.isEmpty = !rows || rows.length === 0;

    if (this.isEmpty) {
      // If database is brand new and empty, pre-populate default layout in memory
      // so visitor can see default items until admin presses "Initialize"
      this.db = seed();
      this.db.regs = [];
      this.db.joins = [];
      this.db.orders = [];
      this.db.checkins = [];
    } else {
      this.db = createEmptyDB();
      rows.forEach(r => {
        if (r.kind === 'set') {
          this.db.set = { ...this.db.set, ...r.data };
        } else if (CONTENT_KINDS.includes(r.kind) && Array.isArray(this.db[r.kind])) {
          const item = { ...r.data, id: r.id };
          if (r.kind === 'events') {
            if (!item.type) item.type = 'run5';
            if (!item.status) item.status = 'open';
          } else if (r.kind === 'ach') {
            if (!item.cat) item.cat = 'first5k';
            if (!item.who) item.who = '';
          } else if (r.kind === 'routes') {
            if (!item.level) item.level = 'easy';
          }
          this.db[r.kind].push(item);
        }
      });
    }

    // 2. Load private people data if organizer
    if (this.isAdmin) {
      await this.loadPeopleFromSupabase();
    }

    this.takeSnapshot();
  }

  async loadPeopleFromSupabase() {
    const sb = getSupabase();
    if (!sb || !this.isAdmin) return;

    // Concurrently load people tables in parallel for maximum performance
    await Promise.all(
      PEOPLE_KINDS.map(async k => {
        const tableName = TABLE_MAP[k];
        const { data, error } = await sb
          .from(tableName)
          .select('*')
          .order('date', { ascending: false })
          .limit(1000);

        if (!error && Array.isArray(data)) {
          this.db[k] = data;
        }
      })
    );
  }

  async syncToSupabase() {
    if (!IS_LIVE) {
      ss('khutwa_loc', JSON.stringify({
        regs: this.db.regs,
        joins: this.db.joins,
        orders: this.db.orders,
        checkins: this.db.checkins
      }));
      if (this.isAdmin) {
        ss('khutwa_draft', JSON.stringify(this.getContent()));
      }
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    const prevSnap = this.snap;
    const curSnap = {};

    // 1. Sync Content
    for (const k of CONTENT_KINDS) {
      const items = k === 'set' ? [{ ...this.db.set, id: 'main' }] : this.db[k];
      curSnap[k] = {};

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        curSnap[k][item.id] = JSON.stringify(item);

        if (curSnap[k][item.id] !== (prevSnap[k] || {})[item.id]) {
          const { id, ...data } = item;
          const { error } = await sb
            .from('content')
            .upsert({ kind: k, id, data, sort: i }, { onConflict: 'kind,id' });

          if (error) {
            console.error('Error syncing content item:', k, id, error);
            throw error;
          }
        }
      }

      // Check for deletions
      for (const id in (prevSnap[k] || {})) {
        if (!(id in curSnap[k])) {
          const { error } = await sb
            .from('content')
            .delete()
            .match({ kind: k, id });

          if (error) console.error('Error deleting content:', k, id, error);
        }
      }
    }

    // 2. Sync People data (Admin updating status / deleting)
    if (this.isAdmin) {
      for (const k of PEOPLE_KINDS) {
        const tableName = TABLE_MAP[k];
        const rows = this.db[k] || [];
        curSnap[k] = {};

        for (const row of rows) {
          curSnap[k][row.id] = JSON.stringify(row);
          if (prevSnap[k] && prevSnap[k][row.id] && curSnap[k][row.id] !== prevSnap[k][row.id]) {
            const { error } = await sb
              .from(tableName)
              .update(row)
              .eq('id', row.id);

            if (error) console.error('Error updating row:', tableName, row.id, error);
          }
        }

        // Deletions
        for (const id in (prevSnap[k] || {})) {
          if (!(id in curSnap[k])) {
            const { error } = await sb
              .from(tableName)
              .delete()
              .eq('id', id);

            if (error) console.error('Error deleting row:', tableName, id, error);
          }
        }
      }
    }

    this.snap = { ...prevSnap, ...curSnap };
  }

  async initializeDatabase() {
    const s = seed();
    this.db.set = { ...this.db.set, ...s.set };
    this.db.gal = s.gal;
    this.db.shop = s.shop;
    this.db.events = s.events;
    this.db.ach = s.ach;
    this.db.routes = s.routes;
    this.db.members = s.members;
    await this.syncToSupabase();
    this.isEmpty = false;
  }
}

export const store = new Store();
