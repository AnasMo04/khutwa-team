// Supabase Client and Authentication Service
// Communicates with Supabase using the configured URL and Anon Key.

const CF = window.KHUTWA || {};
export const SUPABASE_URL = CF.url || '';
export const SUPABASE_KEY = CF.anonKey || CF.key || '';
export const IS_LIVE = Boolean(SUPABASE_URL && SUPABASE_KEY);

let supabaseClient = null;

export function getSupabase() {
  if (!IS_LIVE) return null;
  if (!supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'khutwa_supabase_auth'
      }
    });
  }
  return supabaseClient;
}

/**
 * Sign in using Supabase Auth signInWithPassword.
 * Returns { user, session, error }.
 */
export async function signIn(email, password) {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) {
      throw error;
    }
    return data;
  }

  // Fallback REST call if CDN library hasn't loaded
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: email.trim(), password })
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error_description || data.msg || 'Invalid login credentials');
  }
  localStorage.setItem('khutwa_supabase_auth', JSON.stringify({ currentSession: data }));
  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.signOut();
    } catch (e) {
      console.warn('SignOut warning:', e);
    }
  }
  try {
    localStorage.removeItem('khutwa_supabase_auth');
  } catch (e) {}
}

/**
 * Check if the currently authenticated session belongs to an authorized organizer (admins table).
 * Returns boolean.
 */
export async function verifyOrganizerPrivileges() {
  if (!IS_LIVE) return false;
  const sb = getSupabase();
  if (sb) {
    const { data: sessionData } = await sb.auth.getSession();
    const session = sessionData?.session;
    if (!session || !session.user) return false;

    // Check against public.admins table (RLS allows select if public.is_admin())
    const userEmail = (session.user.email || '').toLowerCase();
    const { data, error } = await sb
      .from('admins')
      .select('email')
      .ilike('email', userEmail);

    if (error) {
      console.warn('Admin check error:', error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  return false;
}

/**
 * Get current user email if signed in
 */
export async function getCurrentUserEmail() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data?.user?.email || null;
}
