/* ═══════════════════════════════════════════════════════════════════
   Ukurra — Auth (Supabase OAuth: Google)
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const CFG = window.LM_CONFIG || {};

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
    };
  }

  const listeners = new Set();
  let current = null;

  function emit(user) {
    current = user;
    listeners.forEach((fn) => {
      try { fn(user); } catch (e) { console.error(e); }
    });
  }

  /* ── satu perangkat aktif ──────────────────────────────────────────
     Login di perangkat baru menulis ID perangkatnya ke profiles.device_web;
     perangkat lama melihat ID-nya sudah berbeda saat mengecek, lalu keluar
     sendiri. Pengecekan hanya saat daring dan dijarangkan — gangguan
     jaringan atau kolom yang belum ada TIDAK pernah membuat siapa pun
     keluar. */
  const KUNCI_ID = 'ukurra.perangkat';
  const KUNCI_KLAIM = 'ukurra.klaimPerangkat';
  const JEDA_CEK = 5 * 60_000;
  let terakhirCek = 0;

  const simpan = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) {
      try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* abaikan */ }
    },
  };

  function idBaru() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function klaim(id) {
    const { error } = await client.rpc('ukurra_claim_device', { app: 'web', device: id });
    if (!error) simpan.set(KUNCI_KLAIM, null);
  }

  async function cekPerangkat(paksa) {
    if (!client || !current || !navigator.onLine) return;
    if (!paksa && Date.now() - terakhirCek < JEDA_CEK) return;
    terakhirCek = Date.now();

    try {
      let lokal = simpan.get(KUNCI_ID);
      // Baru login di sini (atau sesi lama dari sebelum fitur ini ada):
      // perangkat ini yang jadi pemegang akun.
      if (!lokal || simpan.get(KUNCI_KLAIM)) {
        lokal = lokal || idBaru();
        simpan.set(KUNCI_ID, lokal);
        await klaim(lokal);
        return;
      }

      const { data, error } = await client
        .from('profiles').select('device_web').eq('id', current.id).maybeSingle();
      if (error || !data) return;
      if (!data.device_web) return klaim(lokal);
      if (data.device_web === lokal) return;

      simpan.set(KUNCI_ID, null);
      await client.auth.signOut({ scope: 'local' });
      emit(null);
      window.dispatchEvent(new CustomEvent('ukurra:ditendang'));
    } catch { /* luring atau gangguan sesaat — coba lagi nanti */ }
  }

  window.addEventListener('online', () => cekPerangkat(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') cekPerangkat(false);
  });

  const Auth = {
    /** true kalau Supabase sudah dikonfigurasi */
    get configured() { return isConfigured && !!client; },

    /** user saat ini (sinkron, bisa null sebelum init selesai) */
    get user() { return current; },

    /** Ambil sesi aktif. Selalu await ini sebelum menggate UI. */
    async init() {
      if (!client) {
        emit(null);
        return current;
      }
      const { data } = await client.auth.getSession();
      emit(shape(data.session?.user));
      client.auth.onAuthStateChange((_evt, session) => emit(shape(session?.user)));
      cekPerangkat(true);
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
      // Ditandai sebelum pindah ke Google: setelah kembali, perangkat ini
      // yang mengambil alih akun dari perangkat lain.
      simpan.set(KUNCI_KLAIM, '1');
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo || window.location.origin + '/app.html' },
      });
      if (error) throw error;
    },

    async signOut() {
      // scope 'local': keluar dari web saja. Bawaannya 'global' mencabut
      // SEMUA sesi akun ini, termasuk Ukurra Studio di laptop.
      if (client) await client.auth.signOut({ scope: 'local' });
      simpan.set(KUNCI_ID, null);
      emit(null);
    },

    /** Raw client untuk query database misi tersimpan. */
    get db() { return client; },
  };

  window.LMAuth = Auth;
})();
