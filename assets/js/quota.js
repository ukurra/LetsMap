'use strict';
/* ═══════════════════════════════════════════════════════════════════
   Ukurra — kuota uji coba & status langganan

   Uji coba gratis (sekali seumur akun, BUKAN per bulan):
     • 2 misi
     • 1 proyek pengolahan data

   Hitungannya disimpan di Supabase, bukan di peramban. Kalau disimpan
   lokal, menghapus data peramban akan mereset jatah dan uji cobanya
   jadi tak terbatas.

   Tanpa Supabase (mode tamu saat pengembangan), modul ini membuka semua
   batas supaya aplikasi tetap bisa dites.
   ═══════════════════════════════════════════════════════════════════ */

window.LMQuota = (() => {
  const LIMITS = { missions: 2, projects: 1 };

  let cache = null; // { plan, proUntil, missions, projects }

  const db = () => (window.LMAuth && window.LMAuth.db) || null;

  /** true kalau langganannya masih aktif. */
  function isPro(row) {
    if (!row || row.plan !== 'pro') return false;
    if (!row.pro_until) return true; // lifetime
    return new Date(row.pro_until).getTime() > Date.now();
  }

  /** Ambil status akun. Dibuat sekali lalu disimpan sampai ada perubahan. */
  async function load(force) {
    if (cache && !force) return cache;

    const client = db();
    const user = window.LMAuth && window.LMAuth.user;

    // Tanpa backend atau tanpa login: jangan menghalangi apa pun.
    if (!client || !user || user.guest) {
      cache = { plan: 'dev', pro: true, missions: 0, projects: 0, unlimited: true };
      return cache;
    }

    const { data, error } = await client
      .from('profiles')
      .select('plan, pro_until, missions_used, projects_used')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      // Jangan kunci pengguna karena gangguan jaringan.
      console.warn('[quota] gagal membaca profil:', error.message);
      cache = { plan: 'unknown', pro: false, missions: 0, projects: 0, degraded: true };
      return cache;
    }

    const row = data || {};
    cache = {
      plan: row.plan || 'free',
      pro: isPro(row),
      proUntil: row.pro_until || null,
      missions: row.missions_used || 0,
      projects: row.projects_used || 0,
    };
    return cache;
  }

  /** Sisa jatah untuk satu jenis pemakaian. */
  async function remaining(kind) {
    const s = await load();
    if (s.unlimited || s.pro) return Infinity;
    return Math.max(0, LIMITS[kind] - (s[kind] || 0));
  }

  /**
   * Jalankan `run` kalau jatahnya masih ada, lalu catat pemakaiannya.
   * Kalau habis, panggil `onBlocked` supaya pemanggil menampilkan ajakan upgrade.
   *
   * Pencatatan dilakukan SETELAH `run` berhasil — kalau ekspor gagal,
   * jatah pengguna tidak ikut terpotong.
   */
  async function spend(kind, run, onBlocked) {
    const s = await load();

    if (!s.unlimited && !s.pro) {
      const left = LIMITS[kind] - (s[kind] || 0);
      if (left <= 0) {
        if (onBlocked) onBlocked(kind, LIMITS[kind]);
        return false;
      }
    }

    const result = await run();
    if (result === false) return false; // pemanggil membatalkan

    if (!s.unlimited && !s.pro) await record(kind);
    return true;
  }

  /** Tambah satu pemakaian di server. */
  async function record(kind) {
    const client = db();
    const user = window.LMAuth && window.LMAuth.user;
    if (!client || !user || user.guest) return;

    const column = kind === 'missions' ? 'missions_used' : 'projects_used';
    const { error } = await client.rpc('ukurra_use_quota', { kind: column });

    if (error) {
      console.warn('[quota] gagal mencatat pemakaian:', error.message);
      return;
    }
    if (cache) cache[kind] = (cache[kind] || 0) + 1;
  }

  /** Teks ringkas untuk ditampilkan di antarmuka. */
  async function label() {
    // Kalau i18n belum termuat, label tidak boleh ikut menjatuhkan panel
    // akun — lebih baik menampilkan kunci apa adanya daripada kosong.
    const T = (k, v) => (window.LMI18n ? window.LMI18n.t(k, v) : k);
    const s = await load();
    if (s.unlimited) return T('kuota.dev');
    if (s.pro) {
      if (!s.proUntil) return T('kuota.proSelamanya');
      const d = new Date(s.proUntil);
      // Format tanggal ikut bahasa yang dipilih, bukan selalu Indonesia.
      const loc = window.LMI18n.lang === 'en' ? 'en-GB' : 'id-ID';
      return T('kuota.proSampai', {
        tgl: d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' }),
      });
    }
    const m = Math.max(0, LIMITS.missions - s.missions);
    const p = Math.max(0, LIMITS.projects - s.projects);
    return T('kuota.sisa', { m, p });
  }

  return { load, remaining, spend, label, LIMITS, reset: () => (cache = null) };
})();
