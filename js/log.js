/**
 * Log a failure and return a translation key. Does not toast.
 * Storage failures inside utils stay local and should not call this.
 * @param {unknown} error
 * @param {string} [code] e_net | e_save | e_valid
 */
export function report(error, code = 'e_net') {
  const key = code || 'e_net';
  console.error('[khutwa]', key, error || '');
  return key;
}
