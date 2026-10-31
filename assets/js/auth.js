/* ═══════════════════════════════════════════════════════════════════
   Ukurra — Auth (Supabase OAuth: Google)

   Jika kredensial Supabase belum diisi di config.js, modul otomatis
   masuk "mode tamu": login disimpan di localStorage supaya aplikasi
   tetap bisa dites tanpa backend.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const CFG = window.LM_CONFIG || {};
  const GUEST_KEY = 'ukurra.guest.session';

  const isConfigured =
    typeof CFG.SUPABASE_URL === 'string' &&
    CFG.SUPABASE_URL.startsWith('http') &&
    typeof CFG.SUPABASE_ANON_KEY === 'string' &&
    CFG.SUPABASE_ANON_KEY.length > 20;

  let client = null;
  if (isConfigured && window.supabase) {
    client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  /* ── normalise a Supabase user into our shape ───────────────────── */
  function shape(user) {
    if (!user) return null;
    const m = user.user_metadata || {};
    return {
      id: user.id,
      email: user.email || '',
      name: m.full_name || m.name || (user.email || '').split('@')[0] || 'Pilot',
      avatar: m.avatar_url || m.picture || '',
      provider: user.app_metadata?.provider || 'email',
      guest: false,
    };
  }

  function readGuest() {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const listeners = new Set();
  let current = null;

  function emit(user) {
    current = user;
    listeners.forEach((fn) => {
      try { fn(user); } catch (e) { console.error(e); }
    });
  }

  const Auth = {
    /** true kalau Supabase sudah dikonfigurasi */
    get configured() { return isConfigured && !!client; },

    /** user saat ini (sinkron, bisa null sebelum init selesai) */
    get user() { return current; },

    /** Ambil sesi aktif. Selalu await ini sebelum menggate UI. */
    async init() {
      if (!client) {
        emit(readGuest());
        return current;
      }
      const { data } = await client.auth.getSession();
      emit(shape(data.session?.user));
      client.auth.onAuthStateChange((_evt, session) => emit(shape(session?.user)));
      return current;
    },

    /** Daftar callback dipanggil setiap status login berubah. */
    onChange(fn) {
      listeners.add(fn);
      if (current !== null) fn(current);
      return () => listeners.delete(fn);
    },

    /** provider: 'google' (satu-satunya yang dipakai) */
    async signIn(provider, redirectTo) {
      if (!client) {
        throw new Error('NOT_CONFIGURED');
      }
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo || window.location.origin + '/app.html' },
      });
      if (error) throw error;
    },

    /** Login tanpa backend — hanya untuk uji coba lokal. */
    signInAsGuest() {
      const u = {
        id: 'guest-' + Math.random().toString(36).slice(2, 10),
        email: '',
        name: 'Pilot Tamu',
        avatar: '',
        provider: 'guest',
        guest: true,
      };
      try { localStorage.setItem(GUEST_KEY, JSON.stringify(u)); } catch {}
      emit(u);
      return u;
    },

    async signOut() {
      try { localStorage.removeItem(GUEST_KEY); } catch {}
      if (client) await client.auth.signOut();
      emit(null);
    },

    /** Raw client untuk query database misi tersimpan. */
    get db() { return client; },
  };

  window.LMAuth = Auth;
})();
