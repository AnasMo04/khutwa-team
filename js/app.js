import { $, t, toast, initLang } from './utils.js';
import { IS_LIVE, verifyOrganizerPrivileges } from './supabase.js';
import { store } from './data.js';
import { report } from './log.js';
import { startRouter, render, onLiveData } from './router.js';
import { bindActions } from './actions.js';
import { bindForms } from './forms.js';
import { startLiveUpdates } from './realtime.js';

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(promise).then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function bootstrap() {
  initLang();
  startRouter();
  bindActions();
  bindForms();
  try {
    const theme = localStorage.getItem('khutwa_theme');
    if (theme) document.documentElement.dataset.theme = theme;
  } catch (err) {
    report(err, 'e_save');
  }

  if (IS_LIVE) {
    const app = $('#app');
    if (app) app.innerHTML = '<p class="w boot" style="padding:60px 20px">…</p>';
    try {
      store.isAdmin = await withTimeout(verifyOrganizerPrivileges(), 8000);
      await withTimeout(store.loadFromSupabase(), 12000);
    } catch (err) {
      report(err, 'e_net');
      try {
        store.loadDemo();
      } catch (err2) {
        report(err2, 'e_save');
      }
      render();
      toast(t('e_net'));
      return;
    }
    if (store.isAdmin) startLiveUpdates(onLiveData);
    render();
  } else {
    store.loadDemo();
    render();
  }
}
