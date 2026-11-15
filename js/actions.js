import { $, t, getLang, setLang, isDark, toast, ss } from './utils.js';
import { IS_LIVE, signOut } from './supabase.js';
import { store } from './data.js';
import {
  openEditForm,
  exportCheckinsCSV,
  exportJoinsCSV,
  exportTable,
  printCheckinPoster,
  uploadGalleryImages,
  uploadImageFile
} from './admin.js';
import { applySearchFilter } from './search.js';
import { stopLiveUpdates } from './realtime.js';
import { report } from './log.js';
import {
  navigate,
  render,
  setMenuOpen,
  askConfirmation,
  takePendingAction,
  noteFocus,
  focusOpenDialog,
  calculatePace
} from './router.js';

let bound = false;
let clickLock = false;

const GUARDED = new Set(['del', 'cancel', 'done', 'ciopen', 'ciclose', 'refresh', 'init', 'yes', 'reset', 'logout']);

async function saved(work) {
  try {
    await work();
    toast(t(IS_LIVE ? 'saved2' : 'saved'));
  } catch (err) {
    toast(t('e_save'));
  }
  render();
}

const actions = {
  back(d, x) {
    x.preventDefault();
    if (window.history.length > 1) window.history.back();
    else navigate(d.backTo || 'home');
  },
  lang() {
    setLang(getLang() === 'ar' ? 'en' : 'ar');
    render();
  },
  theme() {
    const nextTheme = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    ss('khutwa_theme', nextTheme);
    render();
  },
  menu() {
    const nav = $('#nv');
    setMenuOpen(!(nav && nav.classList.contains('open')));
  },
  close(_d, _x, btn) {
    btn.closest('dialog')?.close();
  },
  async yes() {
    const fn = takePendingAction();
    $('#cd')?.close();
    if (fn) await fn();
  },
  edit(d) {
    noteFocus();
    openEditForm(d.c, d.i);
    focusOpenDialog($('#dlg'));
  },
  del(d) {
    const c = d.c;
    const i = d.i;
    askConfirmation(t('sure'), () =>
      saved(async () => {
        await store.commit(db => {
          db[c] = (db[c] || []).filter(row => row.id !== i);
        });
      })
    );
  },
  cancel(d) {
    setEventStatus(d.i, 'cancelled');
  },
  done(d) {
    setEventStatus(d.i, 'completed');
  },
  ciopen() {
    return saved(async () => {
      await store.commit(db => {
        const selectedEv = store.selectedCheckinEvent || (db.events[0] || {}).id || '';
        db.set.checkin = { ev: selectedEv, open: true };
      });
    });
  },
  ciclose() {
    return saved(async () => {
      await store.commit(db => {
        db.set.checkin = {
          ev: (db.set.checkin || {}).ev || store.selectedCheckinEvent,
          open: false
        };
      });
    });
  },
  async refresh() {
    try {
      await store.loadFromSupabase();
      toast(t('saved2'));
      render();
    } catch (err) {
      report(err, 'e_net');
      toast(t('e_net'));
    }
  },
  async logout() {
    stopLiveUpdates();
    await signOut();
    store.isAdmin = false;
    store.db.regs = [];
    store.db.joins = [];
    store.db.orders = [];
    store.db.checkins = [];
    render();
  },
  init() {
    return saved(() => store.initializeDatabase());
  },
  csv(d) {
    if (!d.c) exportCheckinsCSV();
    else exportTable(d.c, 'csv');
  },
  xlsx(d) {
    if (!d.c) exportJoinsCSV();
    else exportTable(d.c, 'xls');
  },
  bootretry() {
    location.reload();
  },
  poster() {
    return printCheckinPoster();
  },
  reset() {
    askConfirmation(t('sure'), async () => {
      store.loadDemo();
      render();
    });
  }
};

function setEventStatus(id, status) {
  askConfirmation(t('sure'), () =>
    saved(async () => {
      await store.commit(db => {
        const item = (db.events || []).find(r => r.id === id);
        if (item) item.status = status;
      });
    })
  );
}

export function bindActions() {
  if (bound) return;
  bound = true;
  document.addEventListener('click', async x => {
    try {
      const nav = $('#nv');
      const menuHit = x.target.closest && x.target.closest('#nv, [data-a="menu"]');
      if (nav && nav.classList.contains('open') && !menuHit) setMenuOpen(false);
      const btn = x.target.closest('[data-go],[data-a]');
      if (!btn) return;
      const d = btn.dataset;
      if (d.go) {
        x.preventDefault();
        navigate(d.go);
        return;
      }
      const run = actions[d.a];
      if (!run) return;
      if (GUARDED.has(d.a)) {
        if (clickLock) return;
        clickLock = true;
        try {
          await run(d, x, btn);
        } finally {
          clickLock = false;
        }
      } else {
        await run(d, x, btn);
      }
    } catch (err) {
      report(err, 'e_save');
      toast(t('e_save'));
    }
  });

  document.addEventListener('input', x => {
    if (x.target.id === 'q') applySearchFilter();
    if (x.target.closest && x.target.closest('#pc')) calculatePace();
  });
  document.addEventListener('search', x => {
    if (x.target.id === 'q') applySearchFilter();
  });
  document.addEventListener('change', async x => {
    const e = x.target;
    if (e.id === 'fs') applySearchFilter();
    if (e.id === 'cis') {
      store.selectedCheckinEvent = e.value;
      render();
    }
    if (e.dataset.st) await changeStatus(e);
    if (e.id === 'fu') await uploadMany(e);
    if (e.classList.contains('f-entity-up') && e.files && e.files[0]) await uploadOne(e);
  });
}

async function changeStatus(e) {
  const listKey = e.dataset.c || 'joins';
  const prev = e.value;
  const current = (store.db[listKey] || []).find(r => r.id === e.dataset.st);
  const previous = current ? current.status : prev;
  try {
    await store.commit(db => {
      const row = (db[listKey] || []).find(r => r.id === e.dataset.st);
      if (row) row.status = e.value;
    });
    const li = e.closest('.li');
    if (li) li.dataset.s = e.value;
  } catch (err) {
    e.value = previous;
    toast(t('e_save'));
  }
}

async function uploadMany(e) {
  try {
    await uploadGalleryImages(e.files);
    await store.syncToSupabase();
    toast(t(IS_LIVE ? 'saved2' : 'saved'));
    render();
  } catch (err) {
    report(err, 'e_save');
    const upm = $('#upm');
    if (upm) upm.textContent = t('upe');
  }
}

async function uploadOne(e) {
  const k = e.dataset.k;
  const scope = e.dataset.scope || 'general';
  const msgEl = $(`#up_${k}_msg`);
  try {
    if (msgEl) msgEl.textContent = '…';
    const record = await uploadImageFile(e.files[0], scope);
    await store.syncToSupabase();
    const selectEl = $(`#sel_${k}`);
    if (selectEl) {
      const opt = document.createElement('option');
      opt.value = record.id;
      opt.textContent = record.id;
      opt.selected = true;
      selectEl.appendChild(opt);
    }
    if (msgEl) msgEl.textContent = '✓ ' + t(IS_LIVE ? 'saved2' : 'saved');
    toast(t(IS_LIVE ? 'saved2' : 'saved'));
  } catch (err) {
    report(err, 'e_save');
    if (msgEl) msgEl.textContent = t('upe');
  }
}
