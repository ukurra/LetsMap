/* ═══════════════════════════════════════════════════════════════════
   Ukurra — Landing page interactions
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ── toast ───────────────────────────────────────────────────────── */
  let toastTimer;
  function toast(msg, kind) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = ''), 3400);
  }
  window.LMToast = toast;

  /* ── nav border on scroll ────────────────────────────────────────── */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── mobile drawer ───────────────────────────────────────────────── */
  const drawer = $('#nav-drawer');
  $('#burger').addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#nav-drawer a').forEach((a) =>
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    })
  );

  /* ── smooth anchor scroll ────────────────────────────────────────── */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: Math.max(0, target.offsetTop - 70), behavior: 'smooth' });
    });
  });

  /* ── reveal on scroll (satu-satunya animasi masuk) ───────────────── */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
  );
  $$('[data-reveal]').forEach((el) => io.observe(el));

  /* ── daftar drone ────────────────────────────────────────────────── */
  const droneIcon =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9h6v6H9z"/><path d="M9 9 4.5 4.5M15 9l4.5-4.5M9 15l-4.5 4.5M15 15l4.5 4.5"/><circle cx="4.5" cy="4.5" r="2"/><circle cx="19.5" cy="4.5" r="2"/><circle cx="4.5" cy="19.5" r="2"/><circle cx="19.5" cy="19.5" r="2"/></svg>';

  const T = (k, v) => window.LMI18n.t(k, v);

  const grid = $('#drone-grid');
  function buildDrones() {
  grid.innerHTML = '';
  Object.entries(window.DRONES).forEach(([name, d]) => {
    const isDji = d.type === 'dji';
    const card = document.createElement('div');
    card.className = 'drone-card';
    card.innerHTML =
      `<span class="drone-ico">${droneIcon}</span>` +
      `<span class="drone-meta">` +
      `<span class="drone-name">${name}</span>` +
      `<span class="drone-spec">${d.mp} MP &bull; ${d.battMin} ${T('drone.menit')}</span>` +
      `</span>` +
      `<span class="badge ${isDji ? 'badge-kmz' : 'badge-json'}">${isDji ? 'KMZ' : 'JSON'}</span>`;
    grid.appendChild(card);
  });
  }
  buildDrones();

  /* ── tahun di footer ─────────────────────────────────────────────── */
  $('#year').textContent = new Date().getFullYear();

  /* ── login modal ─────────────────────────────────────────────────── */
  const modal = $('#login-modal');
  const note = $('#login-note');

  function openLogin() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLogin() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  $('#nav-login').addEventListener('click', openLogin);
  $('#login-x').addEventListener('click', closeLogin);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLogin();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLogin();
  });

  $$('.oauth-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const provider = btn.dataset.provider;
      if (!window.LMAuth.configured) {
        note.style.display = 'block';
        note.textContent = T('login.belumAktif');
        return;
      }
      btn.disabled = true;
      try {
        const base = location.origin + location.pathname.replace(/index\.html$/, '');
        await window.LMAuth.signIn(provider, base + 'app.html');
      } catch (err) {
        btn.disabled = false;
        toast(T('login.gagal') + ' ' + err.message, 'err');
      }
    });
  });

  $('#btn-guest').addEventListener('click', () => {
    window.LMAuth.signInAsGuest();
    location.href = 'app.html';
  });

  /* ── upgrade ke Pro — dua tombol, dua link checkout terpisah ────────
     Mayar tidak membaca parameter ?plan= di URL, jadi satu-satunya
     cara membedakan paket Tahunan vs Bulanan adalah link produknya
     sendiri (lihat CHECKOUT_URL / CHECKOUT_URL_MONTHLY di config.js). */
  function bukaCheckout(url) {
    if (!url) {
      toast(T('msg.checkoutBelumSiap'), 'warn');
      return;
    }
    window.open(url, '_blank', 'noopener');
  }
  $('#btn-pro').addEventListener('click', () =>
    bukaCheckout(window.LM_CONFIG && window.LM_CONFIG.CHECKOUT_URL)
  );
  $('#btn-pro-monthly').addEventListener('click', () =>
    bukaCheckout(window.LM_CONFIG && window.LM_CONFIG.CHECKOUT_URL_MONTHLY)
  );

  /* ── reflect auth state in nav ───────────────────────────────────── */
  window.LMAuth.onChange((user) => {
    // Opsi "tanpa akun" tidak ditawarkan lagi begitu ada akun sungguhan.
    // Begitu Supabase terpasang, mode tamu disembunyikan sepenuhnya:
    // tanpa akun, jatah uji coba tidak bisa dihitung dan batas 2 misi
    // jadi bisa dilewati hanya dengan menolak login.
    const sembunyi = window.LMAuth.configured || (user && !user.guest);
    $('#guest-wrap').style.display = sembunyi ? 'none' : '';
  });

  window.LMAuth.init().then((user) => {
    if (!user) return;
    const btn = $('#nav-login');
    // Penanda dilepas supaya pergantian bahasa tidak menimpa nama
    // pengguna dengan kata "Masuk" lagi.
    btn.removeAttribute('data-i18n');
    btn.textContent = user.name;
    btn.onclick = () => (location.href = 'app.html');
  });

  window.LMI18n.onChange(buildDrones);

  /* ── service worker ──────────────────────────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
