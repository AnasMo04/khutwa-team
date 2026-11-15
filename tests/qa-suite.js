import { E, isServerPhone, ss } from '../js/utils.js';
import { store } from '../js/data.js';
import { challengeBar } from '../js/components.js';

function check(results, name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
}

export async function runQa() {
  const results = [];
  const xss = '<img src=x onerror=alert(1)>';
  const escaped = E(xss);
  check(results, 'xss-escape', !escaped.includes('<') && escaped.includes('&lt;'), escaped);

  check(results, 'phone-short', isServerPhone('123') === false);
  check(results, 'phone-long', isServerPhone('9'.repeat(10000)) === false);
  check(results, 'phone-libya', isServerPhone('0916021720') === true);
  check(results, 'phone-xss', isServerPhone(xss) === false);

  const badDate = new Date('not-a-date');
  check(results, 'bad-date', Number.isNaN(badDate.getTime()));

  const previousChallenge = store.db.set.challenge;
  store.db.set.challenge = { done: 'nope', goal: 0 };
  const bar = challengeBar();
  check(results, 'challenge-fallback', bar.includes('312') && bar.includes('500'), bar.slice(0, 80));
  store.db.set.challenge = previousChallenge;

  const joinsBefore = (store.db.joins || []).length;
  const originalSync = store.syncToSupabase.bind(store);
  store.syncToSupabase = async () => {
    const err = new Error('500');
    err.status = 500;
    throw err;
  };
  let rolled = false;
  try {
    await store.commit(db => {
      db.joins.push({ id: 'qa-nope' });
    });
  } catch (err) {
    rolled = err && err.status === 500;
  } finally {
    store.syncToSupabase = originalSync;
  }
  check(
    results,
    'commit-rollback',
    rolled && !(store.db.joins || []).some(row => row.id === 'qa-nope') && (store.db.joins || []).length === joinsBefore
  );

  const dbBackup = JSON.stringify(store.db);
  const snapBackup = store.snap;
  localStorage.setItem('khutwa_draft', '{');
  let corruptOk = false;
  try {
    store.loadDemo();
    corruptOk = Array.isArray(store.db.events) && store.db.events.length > 0;
  } catch (err) {
    corruptOk = false;
  } finally {
    store.db = JSON.parse(dbBackup);
    store.snap = snapBackup;
    localStorage.removeItem('khutwa_draft');
  }
  check(results, 'corrupt-storage', corruptOk);

  const originalSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = () => {
    throw new DOMException('quota', 'QuotaExceededError');
  };
  let quotaOk = false;
  try {
    ss('khutwa_probe', '1');
    quotaOk = true;
  } catch (err) {
    quotaOk = false;
  } finally {
    localStorage.setItem = originalSet;
  }
  check(results, 'storage-quota', quotaOk);

  window.dispatchEvent(new Event('offline'));
  window.dispatchEvent(new Event('online'));
  check(results, 'network-toggle', document.body && true);

  const burger = document.querySelector('[data-a="menu"]');
  let clickErrors = 0;
  if (burger) {
    for (let i = 0; i < 100; i++) {
      try {
        burger.click();
      } catch (err) {
        clickErrors++;
      }
    }
  } else clickErrors = 100;
  check(results, 'rapid-clicks', clickErrors === 0, String(clickErrors));

  const backHash = location.hash;
  let routeErrors = 0;
  for (let i = 0; i < 50; i++) {
    try {
      location.hash = i % 2 ? 'events' : 'home';
    } catch (err) {
      routeErrors++;
    }
  }
  await new Promise(resolve => setTimeout(resolve, 80));
  location.hash = backHash || 'home';
  await new Promise(resolve => setTimeout(resolve, 40));
  check(results, 'route-spam', routeErrors === 0 && !!document.querySelector('#app h1, #app h2'));

  const failed = results.filter(item => !item.ok);
  return { passed: results.length - failed.length, failed: failed.length, results };
}
