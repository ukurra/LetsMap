'use strict';
/* ═══════════════════════════════════════════════════════════════════
   Tombol minus pada tiap vertex saat menggambar poligon.

   Leaflet.Draw hanya menyediakan deleteLastVertex(). Di sini titik yang
   BARU dibuat diberi tombol minus. Hanya titik terbaru yang punya tombol —
   kalau semuanya punya, titik pertama jadi sulit diklik untuk menutup poligon.

   Tombol ceklis hanya muncul pada polyline (ukur jarak), yang tidak punya
   cara bawaan untuk mengakhiri. Poligon tetap ditutup dengan mengklik titik
   pertamanya.

   Pakai:
     1. map dibuat        -> LMVertex.install(map, () => drawHandler)
     2. mulai menggambar  -> new L.Draw.Polygon(map, { icon: LMVertex.icon(), ... })
   ═══════════════════════════════════════════════════════════════════ */

window.LMVertex = (() => {
  const MINUS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="3.4" stroke-linecap="round"><path d="M6 12h12"/></svg>';
  const CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="m5 13 4 4L19 7"/></svg>';

  /** Ikon vertex: kotak kecil + tombol minus di pojok kanan atas. */
  function icon() {
    return L.divIcon({
      className: 'lm-vertex',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      html:
        '<span class="lm-vx-box"></span>' +
        `<button class="lm-vx" title="Hapus titik ini" tabindex="-1">${MINUS}</button>` +
        `<button class="lm-ok" title="Selesai" tabindex="-1">${CHECK}</button>`,
    });
  }

  /** Hapus vertex ke-i dari poligon yang sedang digambar.
   *  Meniru deleteLastVertex() milik Leaflet.Draw, tapi untuk indeks mana pun. */
  function removeAt(h, i) {
    if (!h || !h._markers || i < 0 || i >= h._markers.length) return;

    // Leaflet.Draw sendiri menolak menyisakan nol titik; ikuti aturan itu.
    if (h._markers.length <= 1) return;

    if (i === h._markers.length - 1) {
      h.deleteLastVertex(); // jalur bawaan, paling aman
      return;
    }

    const marker = h._markers[i];
    h._markers.splice(i, 1);
    h._markerGroup.removeLayer(marker);

    const lls = h._poly.getLatLngs();
    const removed = lls.splice(i, 1)[0];
    h._poly.setLatLngs(lls);

    if (h._poly.getLatLngs().length < 2) h._map.removeLayer(h._poly);
    if (typeof h._vertexChanged === 'function') h._vertexChanged(removed, false);
  }

  /** Selesaikan bentuk yang sedang digambar.
   *  Dipakai tombol ceklis, karena titik terakhir kini tertutup tombol
   *  sehingga cara bawaan (klik titik terakhir) jadi sulit dilakukan. */
  function finish(h) {
    if (!h || !h._markers) return;
    const need = h instanceof L.Draw.Polygon ? 3 : 2;
    if (h._markers.length < need) return;
    if (typeof h._finishShape === 'function') h._finishShape();
    else if (typeof h.completeShape === 'function') h.completeShape();
  }

  /** Pasang sekali per peta. getHandler() mengembalikan handler yang aktif. */
  function install(map, getHandler) {
    const decorate = () => {
      const h = getHandler();
      if (!h || !h._markers) return;

      const last = h._markers.length - 1;
      // Poligon ditutup dengan mengklik titik PERTAMA, jadi ceklis tidak
      // diperlukan dan hanya menambah kekacauan. Ceklis khusus polyline
      // (ukur jarak), yang memang tidak punya titik penutup.
      const bolehSelesai = !(h instanceof L.Draw.Polygon);

      h._markers.forEach((marker, i) => {
        const el = marker._icon;
        if (!el) return;
        const btn = el.querySelector('.lm-vx');
        if (!btn) return;

        // Minus hanya pada titik terbaru. Kalau semua titik punya tombol,
        // titik pertama jadi sulit diklik untuk menutup poligon.
        el.classList.toggle('lm-vertex-last', i === last);
        el.classList.toggle('lm-can-finish', bolehSelesai);

        // Indeks berubah setiap ada penghapusan, jadi selalu diperbarui.
        btn._lmIndex = i;

        const ok = el.querySelector('.lm-ok');

        if (btn._lmWired) return;
        btn._lmWired = true;

        // PENTING: penanda hanya dipasang pada tombolnya, bukan pada seluruh
        // ikon. Leaflet menelusuri induk elemen lewat _isClickDisabled(), jadi
        // menandai ikonnya akan mematikan klik marker — padahal justru itu
        // cara Leaflet.Draw menutup poligon lewat klik titik pertama.
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', (ev) => {
          L.DomEvent.stop(ev);
          removeAt(getHandler(), btn._lmIndex);
          // Indeks sisa markernya bergeser — segarkan semuanya.
          setTimeout(decorate, 0);
        });

        if (ok) {
          L.DomEvent.disableClickPropagation(ok);
          L.DomEvent.on(ok, 'click', (ev) => {
            L.DomEvent.stop(ev);
            finish(getHandler());
          });
        }
      });
    };

    map.on('draw:drawvertex', decorate);
    return decorate;
  }

  return { icon, install, removeAt, finish };
})();
