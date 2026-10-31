/* ═══════════════════════════════════════════════════════════════════
   Ukurra — Pemasangan aplikasi (PWA)

   • Menangkap event `beforeinstallprompt` (Chrome/Edge/Android) supaya
     tombol "Pasang Aplikasi" bisa memunculkan dialog instal asli.
   • Safari iOS tidak punya event itu, jadi ditampilkan panduan manual.
   • Elemen ber-atribut:
       data-install        → hanya tampil kalau benar-benar bisa dipasang
       data-install-open   → mengklik memicu pemasangan / panduan
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const T = (k, v) => window.LMI18n.t(k, v);

  let deferred = null;
  let modal = null;

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Mac/.test(ua) && 'ontouchend' in document);
  const isAndroid = /android/i.test(ua);

  function isInstalled() {
    const standalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
    return standalone || window.navigator.standalone === true;
  }

  /** Tombol ber-atribut data-install hanya muncul kalau relevan. */
  function sync() {
    const show = !isInstalled() && (deferred !== null || isIOS);
    document.querySelectorAll('[data-install]').forEach((el) => {
      el.style.display = show ? '' : 'none';
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // tahan dulu, munculkan lewat tombol kita sendiri
    deferred = e;
    sync();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    sync();
    close();
    if (window.LMToast) window.LMToast(T('pwa.terpasang'), 'ok');
  });

  /* ── panduan manual per peramban ─────────────────────────────────── */
  function guide() {
    const sisi = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
    return {
      title: T('pwa.' + sisi + '.judul'),
      steps: [1, 2, 3].map((i) => T('pwa.' + sisi + '.s' + i)),
      note: T('pwa.' + sisi + '.note'),
    };
  }


  /* ── modal panduan ───────────────────────────────────────────────── */
  function build() {
    const g = guide();
    modal = document.createElement('div');
    modal.className = 'modal-scrim';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:380px">
        <button class="modal-x" data-close aria-label="Tutup">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <img src="assets/icons/icon-192.png" alt="" width="46" height="46" style="border-radius:12px;flex-shrink:0">
          <div>
            <div style="font-size:17px;font-weight:800;line-height:1.25">${g.title}</div>
            <div style="font-size:12.5px;color:var(--dim-2)">${T('pwa.tanpaToko')}</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--dim);line-height:1.65;margin-bottom:16px">
          ${T('pwa.penjelasan')}
        </p>
        <ol style="list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:${g.note ? '14px' : '4px'}">
          ${g.steps
            .map(
              (s, i) => `
            <li style="display:flex;gap:11px;align-items:flex-start">
              <span style="width:22px;height:22px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;background:var(--accent-wash);color:var(--accent-d);font-family:var(--mono);font-size:11px;font-weight:600">${i + 1}</span>
              <span style="font-size:13px;line-height:1.6;color:var(--dim)">${s}</span>
            </li>`
            )
            .join('')}
        </ol>
        ${
          g.note
            ? `<p style="font-size:11.5px;color:var(--dim-2);line-height:1.6;padding-top:12px;border-top:1px solid var(--line)">${g.note}</p>`
            : ''
        }
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('[data-close]').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  function openGuide() {
    if (!modal) build();
    modal.classList.add('open');
  }

  function close() {
    if (modal) modal.classList.remove('open');
  }

  /** Munculkan dialog instal asli; kalau tidak ada, tampilkan panduan. */
  async function install() {
    if (isInstalled()) {
      if (window.LMToast) window.LMToast('Aplikasi sudah terpasang di perangkat ini.', 'ok');
      return;
    }
    if (!deferred) {
      openGuide();
      return;
    }
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null; // event hanya bisa dipakai sekali
    sync();
    if (outcome === 'dismissed' && window.LMToast) {
      window.LMToast('Pemasangan dibatalkan. Bisa dicoba lagi kapan saja.');
    }
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-install-open]');
    if (!trigger) return;
    e.preventDefault();
    install();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  sync();
  window.LMInstall = { install, openGuide, get installed() { return isInstalled(); } };
})();
