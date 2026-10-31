'use strict';
/* ═══════════════════════════════════════════════════════════════════
   Ukurra — ajakan berlangganan saat jatah uji coba habis
   ═══════════════════════════════════════════════════════════════════ */

window.LMUpgrade = (() => {
  const T = (k, v) => window.LMI18n.t(k, v);

  /* Tahunan yang ditonjolkan, bukan bulanan.
     Tagihan bulanan menyerahkan sekitar 7% ke biaya gateway yang flat
     per transaksi, dan pelanggan bulanan cenderung berhenti begitu satu
     proyeknya selesai. Paket seumur hidup sengaja tidak ditawarkan:
     biaya pemeliharaannya berjalan terus sementara pembayarannya tidak. */
  const PLANS = () => [
    { id: 'yearly',  nama: T('up.tahunan'), harga: 'Rp 599.000', per: T('up.perTahun'),
      hemat: T('up.hemat3Bulan'), utama: true },
    { id: 'monthly', nama: T('up.bulanan'), harga: 'Rp 69.000',  per: T('up.perBulan'), hemat: '' },
  ];

  // Satu langganan, dua aplikasi — ini yang membedakan dari alat lain
  // yang menjual mission planner dan pengolahan secara terpisah.
  const MANFAAT = () => [
    T('up.m1'), T('up.m2'), T('up.m3'),
    T('up.m4'), T('up.m5'), T('up.m6'),
  ];

  const ALASAN = () => ({
    missions: { judul: T('up.misiHabis'),   teks: T('up.misiHabisTeks') },
    projects: { judul: T('up.proyekHabis'), teks: T('up.proyekHabisTeks') },
    manual:   { judul: T('up.manual'),      teks: T('up.manualTeks') },
  });
;

  let scrim = null;

  let bahasaSaatDibangun = null;

  function build() {
    bahasaSaatDibangun = window.LMI18n.lang;
    scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML = `
      <div class="modal-card" style="max-width:460px">
        <button class="modal-x" data-close aria-label="Tutup">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        <div style="text-align:center;margin-bottom:20px">
          <h3 id="up-judul" style="font-size:20px;font-weight:800;margin-bottom:7px"></h3>
          <p id="up-teks" style="font-size:13.5px;color:var(--dim);line-height:1.65"></p>
        </div>

        <div class="up-plans">${PLANS().map(planCard).join('')}</div>

        <ul class="up-manfaat">${MANFAAT().map(manfaatItem).join('')}</ul>

        <button class="btn btn-accent" id="up-beli" style="width:100%;margin-top:16px">
          ${T('up.berlangganan')}
        </button>
        <p style="font-size:11.5px;color:var(--dim-2);text-align:center;margin-top:12px;line-height:1.6">
          ${T('up.satuLangganan')}
        </p>
      </div>`;
    document.body.appendChild(scrim);

    scrim.querySelector('[data-close]').addEventListener('click', close);
    scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });

    scrim.querySelectorAll('.up-plan').forEach((el) =>
      el.addEventListener('click', () => {
        scrim.querySelectorAll('.up-plan').forEach((x) => x.classList.remove('active'));
        el.classList.add('active');
      })
    );

    scrim.querySelector('#up-beli').addEventListener('click', () => {
      const pilih = scrim.querySelector('.up-plan.active');
      const id = pilih ? pilih.dataset.plan : 'monthly';
      const url = (window.LM_CONFIG && window.LM_CONFIG.CHECKOUT_URL) || '';
      if (!url) {
        if (window.LMToast) window.LMToast(T('msg.checkoutBelumSiap'), 'warn');
        return;
      }
      window.open(url + (url.includes('?') ? '&' : '?') + 'plan=' + id, '_blank', 'noopener');
    });
  }

  function planCard(p) {
    return `
      <button class="up-plan${p.utama ? ' active' : ''}" data-plan="${p.id}">
        <span class="up-nama">${p.nama}${p.hemat ? `<em>${p.hemat}</em>` : ''}</span>
        <span class="up-harga">${p.harga}</span>
        <span class="up-per">${p.per}</span>
      </button>`;
  }

  function manfaatItem(t) {
    return `<li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${t}</li>`;
  }

  /** @param kind 'missions' | 'projects' | 'manual' */
  function show(kind) {
    // Modal dibangun ulang kalau bahasanya sudah berganti sejak terakhir
    // dibuka, supaya kartu paket dan daftar manfaat ikut berubah.
    if (scrim && bahasaSaatDibangun !== window.LMI18n.lang) {
      scrim.remove();
      scrim = null;
    }
    if (!scrim) build();
    const semua = ALASAN();
    const a = semua[kind] || semua.missions;
    scrim.querySelector('#up-judul').textContent = a.judul;
    scrim.querySelector('#up-teks').innerHTML = a.teks;
    scrim.classList.add('open');
  }

  function close() {
    if (scrim) scrim.classList.remove('open');
  }

  return { show, close, PLANS };
})();
