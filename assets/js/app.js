/* ═══════════════════════════════════════════════════════════════════
   Ukurra — Mission Planner
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const T = (k, v) => window.LMI18n.t(k, v);

  /* ── state ───────────────────────────────────────────────────────── */
  // gimbal dikunci nadir (-90): orthofoto butuh bidikan tegak lurus ke bawah.
  const P = { altitude: 120, speed: 12.7, overlap: 75, sidelap: 75, direction: 0, gimbal: -90, silang: false };

  // Batas kewajaran, bukan batas teknis. Misi sungguhan jarang lewat
  // beberapa ribu foto; di atas ini hampir pasti parameternya keliru
  // (ketinggian kerendahan atau overlap kelewat tinggi).
  const MAKS_FOTO = 12000;
  let selectedDrone = 'DJI Lito X1';
  let CAM = Object.assign({}, window.DRONES[selectedDrone]);

  let currentPoly = null;
  let flightLayer = null;

  // SATU permukaan kanvas dipakai seumur hidup peta, dibuat sekali saat
  // pertama dibutuhkan.
  //
  // Dulu L.canvas() dipanggil di dalam renderMission, jadi tiap kali
  // parameter diubah lahir kanvas baru. Melepas flightLayer hanya
  // melepas garis dan titiknya — perender-nya sendiri tetap menempel di
  // peta. Satu kanvas seukuran layar memakan ~35 MB, sehingga setelah
  // belasan kali mengutak-atik overlap tertimbun ratusan MB. Begitu
  // peramban kehabisan memori grafis, isi kanvas dibuang dan titik-titik
  // waypoint hilang dari layar — justru pada nilai overlap rapat, karena
  // di situ pemakaian memorinya paling besar.
  let kanvas = null;
  const perender = () => (kanvas = kanvas || L.canvas({ padding: 0.3 }));
  let drawHandler = null;
  let missionData = null;

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

  /* ═══ MAP ════════════════════════════════════════════════════════ */
  const B = window.BASEMAPS;
  const tiles = {
    sat: L.tileLayer(B.sat.url, { attribution: B.sat.attribution, maxZoom: B.sat.maxZoom }),
    osm: L.tileLayer(B.osm.url, { attribution: B.osm.attribution, maxZoom: B.osm.maxZoom }),
  };

  const map = L.map('map', {
    center: [-2.5, 118],
    zoom: 5,
    layers: [tiles.sat],
    zoomControl: false,
    attributionControl: true,
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Begitu peta dibuka dan belum ada area yang digambar, coba pusatkan
  // ke lokasi pengguna daripada tampilan default seluruh Indonesia.
  // Diam-diam gagal kalau izinnya ditolak/tak tersedia — jangan
  // mengganggu dengan pesan galat untuk sesuatu yang opsional, dan
  // jangan menimpa tampilan kalau pengguna sudah mulai menggambar
  // sebelum browser sempat menjawab.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (currentPoly) return;
        map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      },
      () => {},
      { timeout: 6000, maximumAge: 300000 }
    );
  }

  // Titik biru lokasi saat ini + lingkaran akurasi, mengikuti posisi
  // selama aktif (watchPosition) — mirip tombol lokasi bawaan MapLibre/
  // Google Maps, bukan sekali tembak lalu hilang.
  let meMarker = null;
  let meCircle = null;
  let meWatchId = null;

  const meIcon = L.divIcon({
    className: 'me-dot-wrap',
    html: '<div class="me-dot"><div class="me-pulse"></div></div>',
    iconSize: [14, 14],
  });

  const LocControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control loc-btn');
      btn.title = 'Lokasi saya';
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>';

      const stop = () => {
        if (meWatchId !== null) navigator.geolocation.clearWatch(meWatchId);
        meWatchId = null;
        if (meMarker) map.removeLayer(meMarker);
        if (meCircle) map.removeLayer(meCircle);
        meMarker = meCircle = null;
        btn.classList.remove('active', 'loading');
      };

      L.DomEvent.on(btn, 'click', L.DomEvent.stopPropagation);
      L.DomEvent.on(btn, 'click', () => {
        if (!navigator.geolocation) return toast(T('msg.geoTidakDidukung'), 'err');

        // Sudah aktif: klik lagi untuk mematikan pelacakan.
        if (meWatchId !== null) return stop();

        btn.classList.add('loading');
        let sudahZoom = false;

        meWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            const ll = [pos.coords.latitude, pos.coords.longitude];
            btn.classList.remove('loading');
            btn.classList.add('active');

            if (!meMarker) {
              meMarker = L.marker(ll, { icon: meIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);
              meCircle = L.circle(ll, {
                radius: pos.coords.accuracy,
                color: '#0EA5E9',
                weight: 1,
                fillColor: '#0EA5E9',
                fillOpacity: 0.12,
                interactive: false,
              }).addTo(map);
            } else {
              meMarker.setLatLng(ll);
              meCircle.setLatLng(ll).setRadius(pos.coords.accuracy);
            }

            if (!sudahZoom) {
              map.flyTo(ll, 16, { duration: 1.2 });
              sudahZoom = true;
            }
          },
          () => {
            toast(T('msg.geoGagal'), 'err');
            stop();
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
      return btn;
    },
  });
  new LocControl().addTo(map);

  const drawnItems = new L.FeatureGroup().addTo(map);

  // Tombol minus di tiap vertex saat menggambar.
  LMVertex.install(map, () => drawHandler);

  function setBasemap(key) {
    Object.values(tiles).forEach((t) => map.removeLayer(t));
    tiles[key].addTo(map);
    tiles[key].bringToBack();
    $$('.seg button').forEach((b) => b.classList.toggle('active', b.dataset.bm === key));
    if (flightLayer) flightLayer.bringToFront();
    drawnItems.bringToFront();
  }
  $$('.seg button').forEach((b) => b.addEventListener('click', () => setBasemap(b.dataset.bm)));

  /* ═══ HELPERS ════════════════════════════════════════════════════ */
  function haversine([la1, ln1], [la2, ln2]) {
    const R = 6371000,
      dLa = ((la2 - la1) * Math.PI) / 180,
      dLn = ((ln2 - ln1) * Math.PI) / 180;
    const a =
      Math.sin(dLa / 2) ** 2 +
      Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLn / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function shoelace(p) {
    let a = 0;
    for (let i = 0; i < p.length - 1; i++) a += p[i][0] * p[i + 1][1] - p[i + 1][0] * p[i][1];
    return Math.abs(a) / 2;
  }
  // Kotak statistik hanya selebar ~56px, jadi nilainya harus ringkas
  // bahkan pada misi raksasa. Tanpa ini "328m 47s" dan "1234.56 ha"
  // terpotong di tengah angka.
  const fmtDur = (s) => {
    if (!s || !isFinite(s)) return '–';
    const menit = Math.floor(s / 60);
    if (menit >= 60) {
      const jam = Math.floor(menit / 60);
      return `${jam}${LMI18n.lang === 'en' ? 'h' : 'j'} ${menit % 60}m`;
    }
    return `${menit}m ${Math.round(s % 60)}s`;
  };
  const fmtArea = (m) => {
    if (!m) return '–';
    if (m < 10000) return Math.round(m) + ' m²';
    const ha = m / 10000;
    return (ha >= 1000 ? Math.round(ha) : ha.toFixed(2)) + ' ha';
  };
  const fmtDist = (m) => (m > 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m');

  /* ═══ MISSION GENERATION ═════════════════════════════════════════ */
  function generateMission(polyLayer) {
    const lls = polyLayer.getLatLngs()[0];
    if (lls.length < 3) return null;
    const coords = lls.map((ll) => [ll.lng, ll.lat]);

    // Cincin ditutup kalau titik terakhir belum sama dengan yang pertama.
    //
    // Dulu yang dibandingkan hanya BUJUR-nya. Begitu titik pertama dan
    // terakhir kebetulan sebujur — lumrah pada persegi yang sejajar
    // sumbu — poligonnya dikira sudah tertutup, padahal satu sisi masih
    // menganga. Akibatnya luasnya salah hitung dan garis pindai kehilangan
    // satu perpotongan, sehingga sebagian jalur tidak menghasilkan
    // waypoint sama sekali.
    const awal = coords[0];
    const akhir = coords[coords.length - 1];
    if (awal[0] !== akhir[0] || awal[1] !== akhir[1]) coords.push([...awal]);

    const gsd = (CAM.sw * P.altitude * 100) / (CAM.fl * CAM.iw);
    const fw = (CAM.iw * gsd) / 100; // footprint width (m) — cross-track
    const fh = (CAM.ih * gsd) / 100; // footprint height (m) — along-track
    const stripSp = Math.max(fw * (1 - P.sidelap / 100), 1);
    const photoSp = Math.max(fh * (1 - P.overlap / 100), 1);

    // Local equirectangular projection (metres) around the polygon centroid.
    const cLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    const cLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const mLng = Math.cos((cLat * Math.PI) / 180) * 111320,
      mLat = 111320;
    const toM = (lng, lat) => [(lng - cLng) * mLng, (lat - cLat) * mLat];
    const fromM = (x, y) => [cLng + x / mLng, cLat + y / mLat];
    const poly = coords.map(([lng, lat]) => toM(lng, lat));

    // Taksir dulu jumlah fotonya — sekali bagi, bukan membangun jalurnya.
    //
    // Ini mencegah pembekuan saat mengetik: untuk mencapai "100", kolom
    // ketinggian harus melewati "10", yang masih sah tapi di area 77 ha
    // menghasilkan ~127.000 foto. Membangunnya lebih dulu baru menyerah
    // sudah terlambat — peramban keburu menggantung berpuluh detik.
    const luas = Math.abs(shoelace(poly));
    // Grid silang terbang dua kali, jadi taksirannya ikut dua kali lipat.
    // Tanpa ini pengaman MAKS_FOTO meloloskan misi yang sebenarnya
    // dua kali lebih besar dari yang dikira.
    const perkiraan = Math.ceil(luas / (stripSp * photoSp)) * (P.silang ? 2 : 1);
    if (perkiraan > MAKS_FOTO) return { terlaluBanyak: true, perkiraan };

    function runGrid(theta) {
      const d = [Math.sin(theta), Math.cos(theta)],
        n = [Math.cos(theta), -Math.sin(theta)];
      const pr = poly.map((p) => p[0] * n[0] + p[1] * n[1]);
      const pMin = Math.min(...pr),
        pMax = Math.max(...pr);

      // Jalur dibagi RATA sepanjang bentang area, bukan melangkah tetap
      // dari tepi. Dengan langkah tetap, sisa jarak yang tidak habis
      // dibagi stripSp menumpuk di satu sisi, sehingga grid terlihat
      // miring ke tepi dan berpindah sisi begitu arah jalur diputar.
      //
      // Jumlah celah dibulatkan ke atas supaya jarak antar jalur selalu
      // ≤ stripSp — sidelap hasilnya tidak pernah lebih renggang dari
      // yang diminta, hanya bisa lebih rapat sedikit.
      const span = pMax - pMin;
      const positions = [];
      if (span < 1e-6) {
        positions.push(pMin);
      } else {
        const celah = Math.max(1, Math.ceil(span / stripSp));
        const langkah = span / celah;
        for (let i = 0; i <= celah; i++) positions.push(pMin + i * langkah);
      }

      const wps = [],
        lines = [],
        stripAwal = [];
      let si = 0;
      for (const s of positions) {
        const atMax = Math.abs(s - pMax) < 1e-6;
        const tV = [];
        for (let i = 0; i < poly.length - 1; i++) {
          const a = poly[i],
            b = poly[i + 1];
          const pa = a[0] * n[0] + a[1] * n[1],
            pb = b[0] * n[0] + b[1] * n[1];
          if (Math.abs(pa - pb) < 1e-9) continue;
          // Half-open at top normally; closed at top for pMax so the far edge is captured.
          const crosses = atMax
            ? (pa < s && s <= pb) || (pb < s && s <= pa)
            : (pa <= s && s < pb) || (pb <= s && s < pa);
          if (!crosses) continue;
          const u = (s - pa) / (pb - pa);
          const ix = a[0] + u * (b[0] - a[0]),
            iy = a[1] + u * (b[1] - a[1]);
          tV.push(ix * d[0] + iy * d[1]);
        }
        tV.sort((a, b) => a - b);
        if (tV.length < 2) continue;
        for (let k = 0; k + 1 < tV.length; k += 2) {
          const t1 = tV[k],
            t2 = tV[k + 1];
          if (t2 - t1 < 0.01) continue;
          const q = [s * n[0], s * n[1]];
          const strip = [];
          for (let t = t1; ; t += photoSp) {
            const tc = Math.min(t, t2);
            const [lng, lat] = fromM(q[0] + tc * d[0], q[1] + tc * d[1]);
            strip.push([lat, lng]);
            if (tc >= t2) break;
          }
          if (strip.length < 2) continue;
          if (si % 2 === 1) strip.reverse();
          stripAwal.push(wps.length);
          wps.push(...strip);
          lines.push([strip[0], strip[strip.length - 1]]);
          si++;
        }
      }
      return { wps, lines, si, stripAwal };
    }

    /* ── grid silang ────────────────────────────────────────────────
       Misi grid satu arah dengan kamera menunduk lurus menghasilkan
       kesalahan sistematis berbentuk kubah: bagian tengah peta terangkat
       atau tenggelam beberapa puluh sentimeter terhadap tepinya.

       Sebabnya, dengan semua foto menghadap ke bawah dari ketinggian
       yang sama, perhitungan tidak punya cukup informasi untuk
       memisahkan distorsi lensa dari bentuk tanah — keduanya terlihat
       sama. Orthofotonya tetap tampak bagus; yang rusak diam-diam adalah
       DSM dan perhitungan volume.

       Terbang kedua pada arah tegak lurus menghilangkan hampir seluruh
       efek itu. Harganya foto dan waktu terbang dua kali lipat. */
    const theta = (P.direction * Math.PI) / 180;
    const utama = runGrid(theta);
    let allWps = utama.wps, allLines = utama.lines, numStrips = utama.si;
    let stripAwal = utama.stripAwal;

    if (P.silang) {
      const kedua = runGrid(theta + Math.PI / 2);
      // Jalur kedua disambung setelah yang pertama selesai, bukan
      // disisipkan: drone menyelesaikan satu arah dulu, baru berputar.
      const geser = allWps.length;
      allWps = allWps.concat(kedua.wps);
      allLines = allLines.concat(kedua.lines);
      stripAwal = stripAwal.concat(kedua.stripAwal.map((i) => i + geser));
      numStrips += kedua.si;
    }
    if (allWps.length < 2) return null;

    let dist = 0;
    for (let i = 1; i < allWps.length; i++) dist += haversine(allWps[i - 1], allWps[i]);
    const dur = dist / P.speed;
    const area = shoelace(poly);
    return {
      waypoints: allWps,
      stripLines: allLines,
      stripAwal,
      numStrips,
      numPhotos: allWps.length,
      numPoints: numStrips * 2,
      gsd: gsd.toFixed(2),
      dur,
      area,
      batteries: Math.max(1, Math.ceil(dur / (CAM.battMin * 60))),
      dist: Math.round(dist),
    };
  }

  /* ═══ RENDER ═════════════════════════════════════════════════════ */
  const C = { poly: '#0EA5E9', path: '#F59E0B', turn: '#FB923C', start: '#10B981', end: '#EF4444' };

  // Di atas jumlah ini, keterangan saat kursor menyentuh titik dilepas.
  // Titiknya sendiri tetap digambar semua.
  const TOOLTIP_MAKS = 600;

  /* Warna tiap bagian saat misi dipecah. Dipilih supaya tetap terbaca di
     atas citra satelit dan jelas berbeda satu sama lain — bukan sekadar
     gradasi, karena pengguna harus bisa menyebut "yang ungu" tanpa ragu
     saat menerbangkan bagian ketiga. */
  const WARNA_BAGIAN = ['#F59E0B', '#22D3EE', '#C084FC', '#A3E635', '#FB7185', '#FFFFFF'];
  const warnaBagian = (i) => WARNA_BAGIAN[i % WARNA_BAGIAN.length];

  /** Bagian keberapa sebuah waypoint berada. */
  function petaBagian(bagian, jml) {
    const milik = new Array(jml).fill(0);
    bagian.forEach((b, i) => {
      for (let k = b.mulai; k < b.selesai && k < jml; k++) milik[k] = i;
    });
    return milik;
  }

  function renderMission(m) {
    if (flightLayer) {
      flightLayer.remove();
      flightLayer = null;
    }
    if (!m) {
      // Area dihapus atau misinya gagal dibentuk: kartu pemecahan ikut
      // ditutup, kalau tidak ia tetap menerangkan misi yang sudah tiada.
      gambarKartuBagi(null);
      return;
    }
    flightLayer = L.layerGroup().addTo(map);

    // Seluruh misi digambar di SATU permukaan kanvas. Penanda bawaan
    // Leaflet memakai SVG — satu elemen DOM per titik — sehingga misi
    // ratusan foto membuat peta berat. Dengan kanvas, ribuan titik
    // digambar di satu elemen dan peta tetap lancar.
    const kanvas = perender();

    const wps = m.waypoints;
    /* Kalau misinya dipecah, tiap bagian diberi warnanya sendiri. Satu
       bagian saja tetap memakai warna tunggal seperti sebelumnya. */
    const bagian = pecahMisi(m, batasWp());
    const banyak = bagian.length > 1;
    const milik = banyak ? petaBagian(bagian, wps.length) : null;
    const warnaDi = (i) => (banyak ? warnaBagian(milik[i]) : C.path);

    // Garis jalur diwarnai menurut bagian titik pangkalnya.
    const indeksTitik = new Map();
    wps.forEach((w, i) => {
      const k = JSON.stringify(w);
      if (!indeksTitik.has(k)) indeksTitik.set(k, i);
    });
    m.stripLines.forEach(([a, b]) => {
      const i = indeksTitik.has(JSON.stringify(a)) ? indeksTitik.get(JSON.stringify(a)) : 0;
      L.polyline([a, b], {
        color: warnaDi(i), weight: 2.6, opacity: 0.95, renderer: kanvas,
      }).addTo(flightLayer);
    });

    const stripSet = new Set(m.stripLines.map((sl) => JSON.stringify([sl[0], sl[1]])));
    for (let i = 1; i < wps.length; i++) {
      const k1 = JSON.stringify([wps[i - 1], wps[i]]);
      const k2 = JSON.stringify([wps[i], wps[i - 1]]);
      if (!stripSet.has(k1) && !stripSet.has(k2)) {
        // Lompatan ANTAR bagian tidak digambar: drone mendarat dulu,
        // ganti baterai, baru terbang lagi. Menariknya sebagai garis
        // belok membuat seolah ia terbang menyeberang.
        if (banyak && milik[i] !== milik[i - 1]) continue;
        L.polyline([wps[i - 1], wps[i]], {
          color: banyak ? warnaDi(i) : C.turn,
          weight: 1.6,
          opacity: 0.7,
          dashArray: '5 5',
          renderer: kanvas,
        }).addTo(flightLayer);
      }
    }

    // Titik foto selalu digambar. Dulu dilewati diam-diam di atas 800
    // titik, sehingga misi besar terlihat seperti gagal diimpor padahal
    // baik-baik saja. Dengan kanvas, batas itu tidak lagi diperlukan.
    //
    // Tooltip dibatasi karena ITU yang mahal: tiap tooltip memasang
    // penangan peristiwa dan elemen DOM sendiri. Titiknya tetap tampil
    // lengkap, hanya keterangan saat disentuh yang dilepas.
    const pakaiTooltip = wps.length <= TOOLTIP_MAKS;

    wps.forEach((wp, i) => {
      const titik = L.circleMarker(wp, {
        radius: 3,
        color: warnaDi(i),
        fillColor: '#fff',
        fillOpacity: 0.92,
        weight: 1.5,
        renderer: kanvas,
      });
      if (pakaiTooltip) titik.bindTooltip(T('map.posisiFoto'), { sticky: true });
      titik.addTo(flightLayer);
    });

    L.circleMarker(wps[0], {
      radius: 8, color: C.start, fillColor: C.start,
      fillOpacity: 1, weight: 2.5, renderer: kanvas,
    })
      .bindTooltip(T('map.mulai'), { permanent: true, direction: 'right', offset: [10, 0] })
      .addTo(flightLayer);

    L.circleMarker(wps[wps.length - 1], {
      radius: 8,
      color: C.end,
      fillColor: C.end,
      fillOpacity: 1,
      weight: 2.5,
      renderer: kanvas,
    })
      .bindTooltip(T('map.selesai'))
      .addTo(flightLayer);

    /* Titik awal tiap bagian lanjutan ditandai, supaya terlihat di mana
       bagian berikutnya dimulai setelah ganti baterai. */
    if (banyak) {
      bagian.slice(1).forEach((b, i) => {
        L.circleMarker(wps[b.mulai], {
          radius: 6, color: warnaBagian(i + 1), fillColor: '#fff',
          fillOpacity: 1, weight: 3, renderer: kanvas,
        })
          .bindTooltip(T('bagi.mulaiBagian', { n: i + 2 }), { direction: 'top' })
          .addTo(flightLayer);
      });
    }

    gambarKartuBagi(bagian);
  }

  /* ── kartu keterangan pemecahan misi ───────────────────────────
     Peringatan di panel Ekspor hanya terlihat kalau panelnya dibuka.
     Pemecahan mengubah apa yang terlihat DI PETA — jalurnya tiba-tiba
     berwarna-warni — jadi keterangannya harus ada di peta juga,
     lengkap dengan legenda warnanya. */
  function gambarKartuBagi(bagian) {
    const kartu = $('#kartu-bagi');
    if (!kartu) return;

    if (!bagian || bagian.length < 2) {
      kartu.hidden = true;
      return;
    }

    const maks = batasWp();
    const total = missionData ? missionData.waypoints.length : 0;
    const baris = bagian.map((b, i) =>
      '<div class="kb-baris">' +
        '<span class="kb-warna" style="background:' + warnaBagian(i) + '"></span>' +
        '<span class="kb-nama">' + esc(T('bagi.bagianKe', { n: i + 1 })) + '</span>' +
        '<span class="kb-jml">' + (b.selesai - b.mulai) + '</span>' +
      '</div>').join('');

    kartu.hidden = false;
    kartu.innerHTML =
      '<div class="kb-kepala">' +
        '<b>' + esc(T('bagi.judul', { n: bagian.length })) + '</b>' +
      '</div>' +
      '<p class="kb-sebab">' + esc(T('bagi.sebab', {
        total, maks, drone: selectedDrone,
      })) + '</p>' +
      '<div class="kb-legenda">' + baris + '</div>' +
      '<p class="kb-kaki">' + esc(T('bagi.kaki')) + '</p>';
  }

  /* ═══ STATS ══════════════════════════════════════════════════════ */
  function setStat(key, val) {
    $$('[data-stat="' + key + '"]').forEach((el) => (el.textContent = val));
  }
  function setHud(key, val) {
    $$('[data-hud="' + key + '"]').forEach((el) => (el.textContent = val));
  }

  function updateStats() {
    const gsd = (CAM.sw * P.altitude * 100) / (CAM.fl * CAM.iw);

    if (!missionData) {
      setStat('gsd', gsd.toFixed(2));
      ['dur', 'area', 'bat', 'photos', 'jalur'].forEach((k) => setStat(k, '–'));
      ['strips', 'dist', 'photos'].forEach((k) => setHud(k, '–'));
      gambarBatasWp();
      /* Kartu pemecahan ditutup DI SINI, bukan hanya di renderMission:
         clearAll() melepas lapisan petanya sendiri tanpa memanggil
         renderMission, jadi penjagaan di sana tidak pernah kena. Yang
         pasti dilewati setiap misi hilang adalah updateStats. */
      gambarKartuBagi(null);
      $('#export-summary').textContent = T('app.belumAdaMisi');
      return;
    }

    const m = missionData;
    setStat('gsd', m.gsd);
    setStat('dur', fmtDur(m.dur));
    setStat('area', fmtArea(m.area));
    setStat('bat', m.batteries + '×');
    setStat('jalur', m.numStrips);
    // Tiap waypoint memotret sekali, jadi jumlah foto = jumlah titik.
    setStat('photos', m.numPhotos);
    setHud('strips', m.numStrips);
    setHud('dist', fmtDist(m.dist));
    setHud('photos', m.numPhotos);
    gambarBatasWp();

    $('#export-summary').innerHTML =
      `<b>${selectedDrone}</b><br>` +
      `${m.numPhotos} ${T('app.fotoL').toLowerCase()} • ${m.numStrips} ` +
      `${T('app.jalurL').toLowerCase()} • GSD ${m.gsd} cm/px<br>` +
      `${T('app.terbangK')} ${fmtDur(m.dur)} • ${fmtArea(m.area)} • ` +
      `${m.batteries}× ${T('app.bateraiL').toLowerCase()}`;
  }

  function updateMission() {
    if (!currentPoly) {
      missionData = null;
      updateStats();
      return;
    }
    let hasil = null;
    try {
      hasil = generateMission(currentPoly);
    } catch (e) {
      console.error(e);
    }

    // Parameternya menghasilkan misi yang tidak masuk akal. Jalurnya
    // sengaja TIDAK dibangun, jadi peta tetap responsif dan pengguna
    // bisa langsung membetulkan angkanya.
    if (hasil && hasil.terlaluBanyak) {
      missionData = null;
      renderMission(null);
      updateStats();
      hideEmpty();
      setStat('gsd', ((CAM.sw * P.altitude * 100) / (CAM.fl * CAM.iw)).toFixed(2));
      const pesan = T('msg.terlaluBanyakFoto', {
        n: hasil.perkiraan.toLocaleString(LMI18n.lang === 'en' ? 'en-US' : 'id-ID'),
      });
      $('#export-summary').textContent = pesan;
      toast(pesan, 'warn');
      return;
    }

    missionData = hasil;
    renderMission(missionData);
    updateStats();
    hideEmpty();
  }

  /* ═══ DRAW ═══════════════════════════════════════════════════════ */
  const polyStyle = { color: C.poly, fillColor: C.poly, fillOpacity: 0.14, weight: 2.6 };

  const drawBar = $('#draw-bar');

  function stopDraw() {
    if (drawHandler) {
      drawHandler.disable();
      drawHandler = null;
    }
    $('#btn-draw').classList.remove('active');
    drawBar.classList.add('hidden');
  }

  function startDraw() {
    clearAll();
    hideEmpty();
    const vxIcon = LMVertex.icon();
    drawHandler = new L.Draw.Polygon(map, {
      shapeOptions: polyStyle,
      showArea: true,
      allowIntersection: false,
      icon: vxIcon,
      touchIcon: vxIcon,
    });
    drawHandler.enable();
    $('#btn-draw').classList.add('active');
    drawBar.classList.remove('hidden');
    if (isMobile()) snapTo('peek');
  }

  function toggleDraw() {
    if (drawHandler) stopDraw();
    else startDraw();
  }
  $('#db-cancel').addEventListener('click', stopDraw);

  map.on(L.Draw.Event.CREATED, (e) => {
    if (e.layerType !== 'polygon') return;
    if (currentPoly) drawnItems.removeLayer(currentPoly);
    currentPoly = e.layer;
    currentPoly.setStyle(polyStyle);
    drawnItems.addLayer(currentPoly);
    currentPoly.on('edit', updateMission);
    drawHandler = null;
    stopDraw();
    updateMission();
    if (isMobile()) snapTo('half');
    showPane('param');
  });

  map.on(L.Draw.Event.EDITED, updateMission);

  /* Kartu "belum ada area survei" hanya muncul sekali di awal — begitu
     ditutup atau begitu menggambar dimulai, tidak pernah tampil lagi. */
  function hideEmpty() {
    $('#empty').classList.add('gone');
  }

  function clearAll() {
    // Batalkan juga poligon yang masih setengah jadi, bukan cuma yang sudah tertutup.
    stopDraw();
    if (currentPoly) {
      drawnItems.removeLayer(currentPoly);
      currentPoly = null;
    }
    if (flightLayer) {
      flightLayer.remove();
      flightLayer = null;
    }
    missionData = null;
    updateStats();
  }

  $('#btn-draw').addEventListener('click', toggleDraw);
  $('#btn-clear').addEventListener('click', clearAll);
  $('#empty-x').addEventListener('click', hideEmpty);

  /* ═══ PARAMETERS ═════════════════════════════════════════════════ */
  let debounce;
  function queueUpdate(ms) {
    clearTimeout(debounce);
    debounce = setTimeout(updateMission, ms == null ? 200 : ms);
  }

  // Jeda sengaja panjang untuk kolom angka: mengetik "200" melewati "2"
  // dan "20" dulu. Dengan jeda pendek, ketiganya ikut dihitung dan peta
  // sempat menggambar misi untuk ketinggian 2 m. Jeda baru dimulai
  // setiap ketukan, jadi selama masih mengetik tidak ada yang diproses.
  const JEDA_KETIK = 800;

  const numInputs = {
    'in-alt': { key: 'altitude', min: 10, max: 500 },
    'in-spd': { key: 'speed', min: 1, max: 15 },
    'in-ovl': { key: 'overlap', min: 10, max: 95 },
    'in-sdl': { key: 'sidelap', min: 10, max: 95 },
  };

  Object.entries(numInputs).forEach(([id, { key, min, max }]) => {
    const el = $('#' + id);

    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      // Kolom kosong atau angka di luar batas dibiarkan dulu — pengguna
      // mungkin masih di tengah mengetik. Nilainya baru dipakai kalau
      // sudah masuk akal.
      if (!isNaN(v) && v >= min && v <= max) {
        P[key] = v;
        queueUpdate(JEDA_KETIK);
      }
    });

    // Saat kolom ditinggalkan atau Enter ditekan, nilainya ditetapkan:
    // yang di luar batas ditarik ke batas terdekat, yang kosong
    // dikembalikan ke nilai terakhir yang sah.
    const tetapkan = () => {
      const v = parseFloat(el.value);
      P[key] = isNaN(v) ? P[key] : Math.min(max, Math.max(min, v));
      el.value = P[key];
      queueUpdate(0);
    };
    el.addEventListener('change', tetapkan);
    el.addEventListener('blur', tetapkan);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
  });

  $('#c-silang').addEventListener('change', (e) => {
    P.silang = e.target.checked;
    queueUpdate(0);
  });

  $('#s-dir').addEventListener('input', (e) => {
    P.direction = +e.target.value;
    $('#v-dir').textContent = e.target.value + '°';
    queueUpdate(110);
  });

  /* ═══ MEMECAH MISI YANG MELEBIHI BATAS WAYPOINT ══════════════════
     Aplikasi penerbang DJI punya batas jumlah waypoint per misi. Yang
     melebihi batas TIDAK ditolak — berkasnya diterima, lalu titik-titik
     terakhir diam-diam tidak diterbangkan. Akibatnya sebagian area tidak
     terfoto, dan baru ketahuan saat pengolahan gagal menyatu.

     Pemecahannya mengikuti batas JALUR, bukan sekadar memotong tiap N
     titik: membelah jalur di tengah membuat drone berhenti di tengah
     lintasan, dan bagian selanjutnya dimulai dari titik yang janggal.
     ═══════════════════════════════════════════════════════════════ */

  /** Batas waypoint drone yang sedang dipilih. */
  const batasWp = () => (CAM && CAM.maxWp) || 200;

  /**
   * @returns {Array<{wps:Array, mulai:number, selesai:number}>}
   *   Satu bagian kalau misinya masih muat.
   */
  function pecahMisi(m, maks) {
    const total = m.waypoints.length;
    if (total <= maks) return [{ wps: m.waypoints, mulai: 0, selesai: total }];

    // Batas jalur, ditambah penutup di akhir supaya jalur terakhir ikut.
    const batas = (m.stripAwal && m.stripAwal.length ? m.stripAwal : [0]).concat([total]);

    const bagian = [];
    let awal = 0;
    for (let i = 1; i < batas.length; i++) {
      const berikut = batas[i];
      if (berikut - awal > maks) {
        // Jalur sebelumnya adalah potongan terakhir yang masih muat.
        const potong = batas[i - 1];
        if (potong > awal) {
          bagian.push({ wps: m.waypoints.slice(awal, potong), mulai: awal, selesai: potong });
          awal = potong;
        }
        // Satu jalur sendirian lebih panjang dari batas — jarang, tapi
        // mungkin pada area sangat panjang. Di sini terpaksa dibelah.
        while (berikut - awal > maks) {
          bagian.push({ wps: m.waypoints.slice(awal, awal + maks), mulai: awal, selesai: awal + maks });
          awal += maks;
        }
      }
    }
    if (awal < total) bagian.push({ wps: m.waypoints.slice(awal), mulai: awal, selesai: total });
    return bagian;
  }

  /** Perbarui peringatan batas waypoint di panel Ekspor. */
  function gambarBatasWp() {
    const kotak = $('#batas-wp');
    if (!kotak) return;
    if (!missionData) {
      kotak.hidden = true;
      return;
    }
    const maks = batasWp();
    const n = missionData.waypoints.length;
    if (n <= maks) {
      kotak.hidden = true;
      return;
    }
    const bagian = pecahMisi(missionData, maks);
    kotak.hidden = false;
    kotak.innerHTML =
      '<b>' + esc(T('wp.judul', { n, maks })) + '</b>' +
      '<span>' + esc(T('wp.teks', { drone: selectedDrone, maks })) + '</span>' +
      '<span class="wp-saran">' + esc(T('wp.saran', { bagian: bagian.length })) + '</span>';
  }

  /* ═══ MISI TERSIMPAN ═════════════════════════════════════════════
     Disimpan di localStorage peramban, bukan di server: misi adalah
     milik penggunanya sendiri, dan menyimpannya di sini berarti fitur
     ini tetap jalan tanpa akun dan tanpa sinyal.

     Yang disimpan hanya poligon dan parameternya — bukan hasil
     perhitungannya. Waypoint dihitung ulang saat dibuka, sehingga misi
     lama ikut menerima setiap perbaikan rumus di kemudian hari.
     ═══════════════════════════════════════════════════════════════ */
  const MATA_BUKA =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7' +
    '-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  const MATA_TUTUP =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.1 10.1 0 0 1 ' +
    '12 19c-6 0-10-7-10-7a18 18 0 0 1 5.1-5.9m3.2-1A10.1 10.1 0 0 1 12 5c6 0 10 7 10 7' +
    'a18 18 0 0 1-2.2 3.2M1 1l22 22"/></svg>';

  const KUNCI_MISI = 'ukurra.misi';
  const MAKS_MISI = 50;

  function bacaMisi() {
    try {
      const v = JSON.parse(localStorage.getItem(KUNCI_MISI) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];   // penyimpanan rusak atau diblokir — mulai dari kosong
    }
  }

  function tulisMisi(daftar) {
    try {
      localStorage.setItem(KUNCI_MISI, JSON.stringify(daftar.slice(0, MAKS_MISI)));
      return true;
    } catch (e) {
      toast(T('msg.simpanPenuh'), 'err');
      return false;
    }
  }

  /* ── misi tersimpan sebagai lapisan acuan ───────────────────────
     Saat memecah area besar jadi beberapa misi, batas misi sebelumnya
     harus terlihat sambil menggambar yang berikutnya — kalau tidak,
     antar bagian akan bercelah atau bertumpang terlalu jauh.

     Digambar di bawah area yang sedang dikerjakan, dengan garis putus
     dan warna pudar supaya tidak tertukar dengan yang aktif. */
  const lapisanMisi = L.layerGroup().addTo(map);
  const GAYA_ACUAN = {
    color: '#64748B', fillColor: '#64748B', fillOpacity: 0.06,
    weight: 1.8, dashArray: '6 5',
  };

  function gambarLapisan() {
    lapisanMisi.clearLayers();
    const daftar = bacaMisi();
    const tampil = new Set(bacaTampil());

    daftar.forEach((m) => {
      if (!tampil.has(m.id)) return;
      const poly = L.polygon(m.titik.map(([lat, lng]) => [lat, lng]), GAYA_ACUAN);
      poly.bindTooltip(m.nama, { permanent: false, direction: 'center', sticky: true });
      lapisanMisi.addLayer(poly);
    });
    lapisanMisi.eachLayer((l) => l.bringToBack());
    if (overlayAktif()) overlayAktif().bringToBack();
  }

  const overlayAktif = () => null;   // tidak ada basemap overlay di perencana

  /* Pilihan tampil disimpan terpisah dari misinya sendiri: menyembunyikan
     sebuah lapisan bukan perubahan pada misinya, dan tidak boleh ikut
     tersimpan sebagai bagian dari data misi. */
  const KUNCI_TAMPIL = 'ukurra.misi.tampil';

  function bacaTampil() {
    try {
      const v = JSON.parse(localStorage.getItem(KUNCI_TAMPIL) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function setTampil(id, on) {
    const kini = new Set(bacaTampil());
    if (on) kini.add(id);
    else kini.delete(id);
    try {
      localStorage.setItem(KUNCI_TAMPIL, JSON.stringify([...kini]));
    } catch (e) { /* penyimpanan penuh — tampilannya tetap jalan sesi ini */ }
    gambarLapisan();
  }

  /** Bentuk misi saat ini, untuk disimpan dan dibandingkan. */
  function rekamMisi() {
    if (!currentPoly) return null;
    return {
      titik: currentPoly.getLatLngs()[0].map((ll) => [
        +ll.lat.toFixed(7), +ll.lng.toFixed(7),
      ]),
      luas: missionData ? missionData.area : 0,
      drone: selectedDrone,
      P: {
        altitude: P.altitude, speed: P.speed, overlap: P.overlap,
        sidelap: P.sidelap, direction: P.direction, gimbal: P.gimbal,
        silang: !!P.silang,
      },
    };
  }

  const samaDengan = (a, b) =>
    !!a && !!b &&
    a.drone === b.drone &&
    JSON.stringify(a.titik) === JSON.stringify(b.titik) &&
    JSON.stringify(a.P) === JSON.stringify(b.P);

  /** Simpan misi yang baru diekspor.
   *
   *  Tidak ada tombol simpan terpisah: kalau sebuah misi sampai
   *  diekspor, itu misi yang sungguh dipakai dan layak disimpan.
   *  Menuntut pengguna menekan tombol kedua hanya menghasilkan misi
   *  yang hilang karena lupa.
   *
   *  Ekspor berulang dari misi yang sama — KMZ lalu JSON, atau misi
   *  terpecah yang mengunduh beberapa berkas — tidak menumpuk entri:
   *  yang identik dengan entri terbaru dilewati. */
  function simpanMisi() {
    const kini = rekamMisi();
    if (!kini) return;

    const daftar = bacaMisi();
    if (samaDengan(daftar[0], kini)) return;

    daftar.unshift({
      id: 'm' + Date.now().toString(36),
      nama: T('app.misiKe', { n: daftar.length + 1 }),
      dibuat: new Date().toISOString(),
      ...kini,
    });
    if (!tulisMisi(daftar)) return;
    gambarDaftarMisi();
    gambarLapisan();
    toast(T('msg.misiTersimpan'), 'ok');
  }

  function bukaMisi(id) {
    const m = bacaMisi().find((x) => x.id === id);
    if (!m) return;

    // Drone dipilih lebih dulu: mengubahnya menimpa kecepatan, jadi
    // kalau dibalik, kecepatan tersimpan akan hilang tertimpa.
    if (m.drone && window.DRONES[m.drone] && m.drone !== selectedDrone) changeDrone(m.drone);

    Object.assign(P, m.P);
    $('#in-alt').value = P.altitude;
    $('#in-spd').value = P.speed;
    $('#in-ovl').value = P.overlap;
    $('#in-sdl').value = P.sidelap;
    $('#s-dir').value = P.direction;
    $('#v-dir').textContent = P.direction + '°';
    $('#c-silang').checked = !!P.silang;

    applyPolygon(m.titik.map(([lat, lng]) => ({ lat, lng })));
  }

  function hapusMisi(id) {
    tulisMisi(bacaMisi().filter((x) => x.id !== id));
    gambarDaftarMisi();
    gambarLapisan();
  }

  function namaiMisi(id, nama) {
    const daftar = bacaMisi();
    const m = daftar.find((x) => x.id === id);
    if (!m) return;
    m.nama = String(nama).slice(0, 60).trim() || m.nama;
    tulisMisi(daftar);
  }

  function gambarDaftarMisi() {
    const kotak = $('#daftar-misi');
    if (!kotak) return;
    const daftar = bacaMisi();

    if (!daftar.length) {
      kotak.innerHTML = '<div class="misi-kosong" data-i18n="app.belumAdaMisiTersimpan">' +
        esc(T('app.belumAdaMisiTersimpan')) + '</div>';
      return;
    }

    const lokal = LMI18n.lang === 'en' ? 'en-GB' : 'id-ID';
    const tampil = new Set(bacaTampil());
    kotak.innerHTML = daftar.map((m) => {
      const tgl = new Date(m.dibuat).toLocaleDateString(lokal, {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      const terlihat = tampil.has(m.id);
      return '<div class="misi-baris' + (terlihat ? ' tampil' : '') + '">' +
        '<button class="misi-mata" data-mata="' + m.id + '" ' +
          'title="' + esc(T(terlihat ? 'app.sembunyikanLapisan' : 'app.tampilkanLapisan')) + '">' +
          (terlihat ? MATA_BUKA : MATA_TUTUP) +
        '</button>' +
        '<button class="misi-buka" data-buka="' + m.id + '">' +
          '<b contenteditable="true" spellcheck="false" data-namai="' + m.id + '">' +
            esc(m.nama) + '</b>' +
          '<small>' + esc(tgl) + ' · ' + esc(fmtArea(m.luas)) +
            (m.P && m.P.silang ? ' · ' + esc(T('app.gridSilang')) : '') + '</small>' +
        '</button>' +
        '<button class="misi-hapus" data-hapusmisi="' + m.id + '" ' +
          'title="' + esc(T('app.hapusMisi')) + '">&times;</button>' +
      '</div>';
    }).join('');
  }

  const esc = (t) =>
    String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  $('#daftar-misi').addEventListener('click', (e) => {
    // Mengetik nama tidak boleh ikut membuka misinya.
    if (e.target.closest('[data-namai]')) return;
    const mata = e.target.closest('[data-mata]');
    if (mata) {
      const id = mata.dataset.mata;
      setTampil(id, !new Set(bacaTampil()).has(id));
      gambarDaftarMisi();
      return;
    }
    const hapus = e.target.closest('[data-hapusmisi]');
    if (hapus) return hapusMisi(hapus.dataset.hapusmisi);
    const buka = e.target.closest('[data-buka]');
    if (buka) bukaMisi(buka.dataset.buka);
  });

  $('#daftar-misi').addEventListener('input', (e) => {
    const el = e.target.closest('[data-namai]');
    if (el) namaiMisi(el.dataset.namai, el.textContent);
  });

  $('#daftar-misi').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('[data-namai]')) {
      e.preventDefault();
      e.target.blur();
    }
  });

  LMI18n.onChange(gambarDaftarMisi);
  gambarDaftarMisi();
  gambarLapisan();

  /* ═══ DRONE LIST ═════════════════════════════════════════════════ */
  const droneIcon =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9h6v6H9z"/><path d="M9 9 4.5 4.5M15 9l4.5-4.5M9 15l-4.5 4.5M15 15l4.5 4.5"/><circle cx="4.5" cy="4.5" r="2"/><circle cx="19.5" cy="4.5" r="2"/><circle cx="4.5" cy="19.5" r="2"/><circle cx="19.5" cy="19.5" r="2"/></svg>';
  const checkIcon =
    '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>';

  function buildDroneList() {
    const list = $('#drone-list');
    list.innerHTML = '';
    Object.entries(window.DRONES).forEach(([name, d]) => {
      const btn = document.createElement('button');
      btn.className = 'drone-opt' + (name === selectedDrone ? ' active' : '');
      btn.dataset.drone = name;
      btn.innerHTML = `
        <span style="width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:var(--accent-d);background:var(--accent-wash);flex-shrink:0">${droneIcon}</span>
        <span class="dn"><b>${name}</b><span>${d.mp} MP &bull; ${d.speed} m/s &bull; ${d.battMin} mnt</span></span>
        ${checkIcon}`;
      btn.addEventListener('click', () => changeDrone(name));
      list.appendChild(btn);
    });
  }

  function changeDrone(name) {
    selectedDrone = name;
    CAM = Object.assign({}, window.DRONES[name]);
    P.speed = CAM.speed;
    $('#in-spd').value = CAM.speed;
    $$('.drone-opt').forEach((b) => b.classList.toggle('active', b.dataset.drone === name));

    const isDji = CAM.type === 'dji';
    $('#drone-note').innerHTML =
      `<b>${name}</b> mengekspor ke <b>${isDji ? 'KMZ (WPML)' : 'JSON'}</b>. ` +
      `Sensor ${CAM.sw}×${CAM.sh} mm, lensa ${CAM.fl} mm, ${CAM.iw}×${CAM.ih} piksel.`;
    $('#export-format').innerHTML = T(isDji ? 'app.formatKmz' : 'app.formatJson');
    $('#export-label').textContent = T(isDji ? 'app.eksporKmz' : 'app.eksporJson');

    updateMission();
  }

  /* ═══ KML / KMZ IMPORT ═══════════════════════════════════════════ */
  function parseKML(text) {
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    const els = xml.querySelectorAll('Polygon coordinates,outerBoundaryIs coordinates,coordinates');
    for (const el of els) {
      const pts = el.textContent
        .trim()
        .split(/\s+/)
        .map((p) => {
          const [lng, lat] = p.split(',').map(Number);
          return { lat, lng };
        })
        .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
      if (pts.length >= 3) return pts;
    }
    return null;
  }

  function applyPolygon(pts) {
    if (!pts || pts.length < 3) return toast(T('msg.polygonTidakAda'), 'err');
    clearAll();
    currentPoly = L.polygon(pts.map((p) => [p.lat, p.lng]), polyStyle);
    drawnItems.addLayer(currentPoly);
    currentPoly.on('edit', updateMission);
    map.fitBounds(currentPoly.getBounds(), { padding: [60, 60] });
    updateMission();
    showPane('param');
    toast(T('msg.imporBerhasil'), 'ok');
  }

  /* ── JSZip dimuat belakangan ────────────────────────────────────
     JSZip hanya dipakai saat mengimpor KMZ dan mengekspor KMZ, tapi
     dulu diunduh di setiap kali halaman dibuka — 95 KB yang ikut
     menunda aplikasi siap dipakai, padahal banyak pengguna hanya
     melihat-lihat.

     Tetap DIPRA-AMBIL saat peramban sedang senggang, bukan hanya saat
     dibutuhkan: aplikasi ini dipakai di lapangan dan ekspor harus
     tetap jalan tanpa sinyal. Dengan pra-ambil, berkasnya sudah masuk
     cache service worker sebelum dibutuhkan. */
  const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  let jszipJanji = null;

  function muatJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!jszipJanji) {
      jszipJanji = new Promise((lanjut, gagal) => {
        const el = document.createElement('script');
        el.src = JSZIP_URL;
        el.onload = () => (window.JSZip ? lanjut(window.JSZip) : gagal(new Error('JSZip kosong')));
        el.onerror = () => {
          jszipJanji = null;   // biar percobaan berikutnya mulai bersih
          gagal(new Error('JSZip gagal dimuat'));
        };
        document.head.appendChild(el);
      });
    }
    return jszipJanji;
  }

  // Pra-ambil saat senggang. Kalau peramban tidak punya requestIdleCallback,
  // cukup ditunda sebentar — yang penting tidak ikut antre saat memuat.
  const praAmbil = () => muatJSZip().catch(() => {});
  if (window.requestIdleCallback) requestIdleCallback(praAmbil, { timeout: 4000 });
  else setTimeout(praAmbil, 2500);

  async function readFile(f) {
    if (!f) return;
    try {
      if (f.name.toLowerCase().endsWith('.kmz')) {
        const zip = await (await muatJSZip()).loadAsync(f);
        const kml = Object.values(zip.files).find((x) => x.name.endsWith('.kml'));
        if (!kml) throw new Error('KML tidak ditemukan di dalam KMZ');
        applyPolygon(parseKML(await kml.async('text')));
      } else {
        applyPolygon(parseKML(await f.text()));
      }
    } catch (err) {
      toast(T('msg.imporGagal') + ' ' + err.message, 'err');
    }
  }

  const drop = $('#drop');
  const fileInput = $('#file-input');
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    readFile(e.target.files[0]);
    e.target.value = '';
  });
  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add('over');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove('over');
    })
  );
  drop.addEventListener('drop', (e) => readFile(e.dataTransfer.files[0]));

  /* ═══ SEARCH ═════════════════════════════════════════════════════ */
  $('#search').addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim();
    if (!q) return;
    e.target.blur();
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const d = await r.json();
      if (d.length) map.flyTo([+d[0].lat, +d[0].lon], 15, { duration: 1.4 });
      else toast(T('msg.lokasiTidakDitemukan'), 'warn');
    } catch {
      toast(T('msg.cariGagal'), 'err');
    }
  });

  /* ═══ EXPORT ═════════════════════════════════════════════════════ */
  function download(content, name, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const slug = () => selectedDrone.toLowerCase().replace(/\s+/g, '-');

  async function exportWPMZ(bagian) {
    const wps = (bagian && bagian.wps) || missionData.waypoints;
    const ts = Date.now();
    const finMap = { rth: 'goHome', hover: 'hover' };
    const sigMap = { rth: 'goBack', hover: 'hover', continue: 'goContinue' };
    const finAct = finMap[$('#sel-finish').value] || 'goHome';
    const sigAct = sigMap[$('#sel-signal').value] || 'goBack';

    const missionCfg = `  <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>${finAct}</wpml:finishAction>
      <wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${sigAct}</wpml:executeRCLostAction>
      <wpml:takeOffSecurityHeight>1.2</wpml:takeOffSecurityHeight>
      <wpml:globalTransitionalSpeed>${P.speed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>`;

    const templateKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.uav.com/wpmz/1.0.2">
  <Document>
    <wpml:author>Ukurra</wpml:author>
    <wpml:createTime>${ts}</wpml:createTime>
    <wpml:updateTime>${ts}</wpml:updateTime>
    ${missionCfg}
  </Document>
</kml>`;

    let gid = 0,
      aid = 0;

    // Setiap waypoint mengunci gimbal ke nadir secara ABSOLUT.
    //
    // Sebelumnya hanya waypoint pertama yang diatur, waypoint tengah
    // dibiarkan manual, dan waypoint terakhir memakai gimbalEvenlyRotate
    // ke 0°. Akibatnya gimbal perlahan terangkat sepanjang misi dan foto
    // terakhir menghadap ke depan, bukan ke bawah — terbukti di Mavic 3
    // Pro. Mengulang perintah absolut di tiap titik membuat setiap foto
    // tegak lurus, berapa pun jumlah waypoint-nya.
    const aksiGimbal = (idx) => `
        <wpml:actionGroup>
          <wpml:actionGroupId>${gid++}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${idx}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${idx}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger><wpml:actionTriggerType>reachPoint</wpml:actionTriggerType></wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>${aid++}</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalHeadingYawBase>aircraft</wpml:gimbalHeadingYawBase>
              <wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode>
              <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
              <wpml:gimbalPitchRotateAngle>${P.gimbal}</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
              <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
              <wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
              <wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle>
              <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
              <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
          <wpml:action>
            <wpml:actionId>${aid++}</wpml:actionId>
            <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
              <wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>`;

    const pms = wps
      .map((wp, idx) => {
        const ag = aksiGimbal(idx);

        return `      <Placemark>
        <Point>
          <coordinates>${wp[1].toFixed(14)},${wp[0].toFixed(14)}</coordinates>
        </Point>
        <wpml:index>${idx}</wpml:index>
        <wpml:executeHeight>${P.altitude}</wpml:executeHeight>
        <wpml:waypointSpeed>${P.speed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>0</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>toPointAndStopWithContinuityCurvature</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>0</wpml:useStraightLine>${ag}
        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>${P.gimbal}</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
      </Placemark>`;
      })
      .join('\n');

    const waylinesWpml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.uav.com/wpmz/1.0.2">
  <Document>
    ${missionCfg}
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:distance>0</wpml:distance>
      <wpml:duration>0</wpml:duration>
      <wpml:autoFlightSpeed>${P.speed}</wpml:autoFlightSpeed>
${pms}
    </Folder>
  </Document>
</kml>`;

    try {
      const JSZipLib = await muatJSZip();
      const zip = new JSZipLib();
      const wpmz = zip.folder('wpmz');
      wpmz.file('template.kml', templateKml);
      wpmz.file('waylines.wpml', waylinesWpml);
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = bagian && bagian.ke
        ? `ukurra_${slug()}_bagian${bagian.ke}-dari-${bagian.dari}.kmz`
        : `ukurra_${slug()}.kmz`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      if (!bagian || !bagian.ke) toast(T('msg.kmzUnduh') + ' ' + selectedDrone, 'ok');
    } catch (e) {
      toast(T('msg.eksporGagal') + ' ' + e.message, 'err');
    }
  }

  function exportPotensicJSON(bagian) {
    const wps = (bagian && bagian.wps) || missionData.waypoints;
    const endpointSet = new Set();
    missionData.stripLines.forEach(([a, b]) => {
      endpointSet.add(a[0].toFixed(10) + ',' + a[1].toFixed(10));
      endpointSet.add(b[0].toFixed(10) + ',' + b[1].toFixed(10));
    });
    const isEndpoint = (wp) => endpointSet.has(wp[0].toFixed(10) + ',' + wp[1].toFixed(10));

    const out = wps.map((wp, i) => ({
      action: i === 0 || i === wps.length - 1 || isEndpoint(wp) ? 'NONE' : 'PHOTO',
      gimbalPitch: P.gimbal,
      gimbalType: 'DEFINE',
      height: P.altitude,
      hoverTime: 0,
      lat: +wp[0].toFixed(14),
      lng: +wp[1].toFixed(14),
      poiHeight: 50,
      poiLat: 0,
      poiLng: 0,
      poiType: 0,
      speed: P.speed,
      speedType: 'GLOBAL',
      yaw: 0,
      yawType: 'TO_WAYPOINT',
      zoomRatio: 1,
      zoomType: 'HAND',
    }));

    const nama = bagian && bagian.ke
      ? `ukurra_${slug()}_bagian${bagian.ke}-dari-${bagian.dari}.json`
      : `ukurra_${slug()}.json`;
    download(JSON.stringify(out, null, 2), nama, 'application/json');
    toast(T('msg.jsonUnduh') + ' ' + selectedDrone, 'ok');
  }

  function exportCSV() {
    download(
      'index,latitude,longitude,altitude_m,speed_ms,gimbal_pitch\n' +
        missionData.waypoints
          .map((wp, i) => `${i + 1},${wp[0].toFixed(7)},${wp[1].toFixed(7)},${P.altitude},${P.speed},${P.gimbal}`)
          .join('\n'),
      `ukurra_${slug()}.csv`,
      'text/csv'
    );
    toast(T('msg.csvUnduh'), 'ok');
  }

  function exportDetailJSON() {
    download(
      JSON.stringify(
        {
          drone: selectedDrone,
          created: new Date().toISOString(),
          params: {
            ...P,
            signalLost: $('#sel-signal').value,
            finishAction: $('#sel-finish').value,
          },
          estimation: {
            gsd: missionData.gsd + ' cm/px',
            photos: missionData.numPhotos,
            strips: missionData.numStrips,
            duration: fmtDur(missionData.dur),
            area: fmtArea(missionData.area),
            distance: fmtDist(missionData.dist),
            batteries: missionData.batteries,
          },
          waypoints: missionData.waypoints.map((wp, i) => ({
            index: i + 1,
            lat: +wp[0].toFixed(7),
            lng: +wp[1].toFixed(7),
            altitude: P.altitude,
            speed: P.speed,
            gimbalPitch: P.gimbal,
          })),
        },
        null,
        2
      ),
      `ukurra_${slug()}_detail.json`,
      'application/json'
    );
    toast(T('msg.rincianUnduh'), 'ok');
  }

  /** Semua ekspor lewat gerbang kuota uji coba. */
  async function runExport(fn) {
    if (!missionData) {
      toast(T('msg.buatAreaDulu'), 'warn');
      showPane('area');
      return;
    }

    /* Misi yang melebihi batas waypoint drone dipecah menjadi beberapa
       berkas. Satu berkas besar akan diterima aplikasi penerbang lalu
       dipotong diam-diam di titik ke-N, dan sisanya tidak pernah
       diterbangkan. */
    const maks = batasWp();
    const bagian = pecahMisi(missionData, maks);

    const jalankan = async () => {
      if (bagian.length === 1) return fn();
      for (let i = 0; i < bagian.length; i++) {
        await fn({ ...bagian[i], ke: i + 1, dari: bagian.length });
        // Jeda antar unduhan: peramban membatalkan unduhan beruntun
        // yang datang terlalu rapat.
        if (i < bagian.length - 1) await new Promise((r) => setTimeout(r, 450));
      }
      toast(T('msg.misiDipecah', { n: bagian.length }), 'ok');
    };

    // Jatah baru dipotong setelah ekspornya benar-benar berhasil.
    await LMQuota.spend('missions', async () => {
      await jalankan();
      simpanMisi();
    }, (kind) => LMUpgrade.show(kind));
    paintQuota();
  }

  /** Tampilkan sisa jatah di panel ekspor. */
  async function paintQuota() {
    const el = $('#quota-label');
    if (el) el.textContent = await LMQuota.label();

    // Tombol upgrade hanya muncul untuk akun yang masih uji coba —
    // pelanggan Pro tidak perlu melihat tawaran berlangganan lagi.
    const btn = $('#btn-upgrade');
    if (btn) {
      const sisa = await LMQuota.remaining('missions');
      btn.style.display = sisa === Infinity ? 'none' : '';
    }
  }

  const btnUpgrade = $('#btn-upgrade');
  if (btnUpgrade) btnUpgrade.addEventListener('click', () => LMUpgrade.show('manual'));

  $('#btn-export').addEventListener('click', () =>
    runExport(CAM.type === 'potensic' ? exportPotensicJSON : exportWPMZ)
  );
  $('#btn-csv').addEventListener('click', () => runExport(exportCSV));
  $('#btn-json').addEventListener('click', () => runExport(exportDetailJSON));

  /* ═══ PANES ══════════════════════════════════════════════════════ */
  const PANE_KEY = { drone: 'app.drone', area: 'app.area', param: 'app.param', export: 'app.export' };
  let activePane = 'drone';

  function showPane(name) {
    activePane = name;
    $$('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + name));
    $$('.rail-btn').forEach((b) => b.classList.toggle('active', b.dataset.pane === name));
    $$('#m-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.pane === name));
    $('#dock-h').textContent = T(PANE_KEY[name]);
    $('#dock').classList.remove('hidden');

    // Tiap pane berbagi satu dock-body yang sama — tanpa ini, posisi
    // gulir tab sebelumnya terbawa ke pane baru dan bagian atasnya
    // (mis. tombol "Gambar Poligon") tampak hilang/tertutup.
    $('.dock-body').scrollTop = 0;

    if (isMobile()) {
      // Pane Parameter paling panjang (Terbang, Overlap/Sidelap,
      // Safety, Kamera) — di posisi "half" bagian bawahnya terpotong.
      // Buka penuh supaya semua field kebagian ruang.
      if (name === 'param') snapTo('full');
      else if (sheetState === 'peek') snapTo('half');
    }
  }

  $$('.rail-btn').forEach((b) =>
    b.addEventListener('click', () => {
      if (activePane === b.dataset.pane && !$('#dock').classList.contains('hidden')) {
        $('#dock').classList.add('hidden');
        $$('.rail-btn').forEach((x) => x.classList.remove('active'));
      } else {
        showPane(b.dataset.pane);
      }
    })
  );
  $$('#m-tabs button').forEach((b) => b.addEventListener('click', () => showPane(b.dataset.pane)));

  $('#dock-close').addEventListener('click', () => {
    if (isMobile()) snapTo('peek');
    else {
      $('#dock').classList.add('hidden');
      $$('.rail-btn').forEach((x) => x.classList.remove('active'));
    }
  });

  /* ═══ BOTTOM SHEET (mobile) ══════════════════════════════════════ */
  const dock = $('#dock');
  const grip = $('#grip');
  const isMobile = () => window.matchMedia('(max-width:860px)').matches;
  let sheetState = 'half';

  function headHeight() {
    return grip.offsetHeight + $('.dock-head').offsetHeight;
  }

  function snapPoints() {
    const h = dock.offsetHeight;
    return {
      peek: h - headHeight(),
      half: Math.max(0, h - Math.round(window.innerHeight * 0.52)),
      full: 0,
    };
  }

  function snapTo(state) {
    if (!isMobile()) return;
    sheetState = state;
    dock.dataset.sheet = state; // dipakai CSS untuk tombol tutup — lihat .dock-close
    const y = snapPoints()[state];
    dock.style.setProperty('--sheet-y', y + 'px');
    document.documentElement.style.setProperty('--peek', headHeight() + 'px');
  }

  let dragStartY = 0,
    dragStartOffset = 0,
    dragging = false,
    moved = false;

  function onDown(e) {
    if (!isMobile()) return;
    dragging = true;
    moved = false;
    dragStartY = e.clientY;
    dragStartOffset = snapPoints()[sheetState];
    dock.classList.add('dragging');
    grip.setPointerCapture(e.pointerId);
  }

  function onMove(e) {
    if (!dragging) return;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dy) > 4) moved = true;
    const pts = snapPoints();
    const y = Math.min(pts.peek, Math.max(0, dragStartOffset + dy));
    dock.style.setProperty('--sheet-y', y + 'px');
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    dock.classList.remove('dragging');
    try { grip.releasePointerCapture(e.pointerId); } catch {}

    if (!moved) {
      snapTo(sheetState === 'peek' ? 'half' : 'peek');
      return;
    }

    const current = parseFloat(getComputedStyle(dock).getPropertyValue('--sheet-y')) || 0;
    const pts = snapPoints();
    let best = 'half',
      bestDist = Infinity;
    Object.entries(pts).forEach(([k, v]) => {
      const d = Math.abs(v - current);
      if (d < bestDist) {
        bestDist = d;
        best = k;
      }
    });
    snapTo(best);
  }

  grip.addEventListener('pointerdown', onDown);
  grip.addEventListener('pointermove', onMove);
  grip.addEventListener('pointerup', onUp);
  grip.addEventListener('pointercancel', onUp);

  // Lanjutan scroll di dalam isi pane: kalau lembar belum "full" dan
  // isinya sudah mentok digulir sampai bawah, geser jari ke atas sekali
  // lagi membuka lembar jadi full — sama seperti pola bottom sheet di
  // Google Maps / Apple Maps. Pasif (tidak preventDefault) supaya tombol,
  // input, dan scroll biasa di dalamnya tetap bekerja normal.
  const dockBody = $('.dock-body');
  let sentuhAwalY = null;
  dockBody.addEventListener(
    'touchstart',
    (e) => { sentuhAwalY = e.touches[0].clientY; },
    { passive: true }
  );
  dockBody.addEventListener(
    'touchmove',
    (e) => {
      if (sentuhAwalY === null || !isMobile() || sheetState === 'full') return;
      const dy = sentuhAwalY - e.touches[0].clientY; // positif = jari geser ke atas
      const mentok = dockBody.scrollTop + dockBody.clientHeight >= dockBody.scrollHeight - 2;
      if (dy > 12 && mentok) {
        snapTo('full');
        sentuhAwalY = null;
      }
    },
    { passive: true }
  );

  /* ═══ MAP EVENTS ═════════════════════════════════════════════════ */
  map.on('mousemove', (e) => {
    setHud('coord', e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5));
  });
  map.on('zoomend', () => setHud('zoom', map.getZoom()));

  /* ═══ AUTH ═══════════════════════════════════════════════════════ */
  const gate = $('#gate');
  const acct = $('#acct');

  function paintUser(u) {
    const av = $('#avatar');
    const initial = (u.name || 'P').trim().charAt(0).toUpperCase();
    if (u.avatar) {
      av.style.backgroundImage = `url("${u.avatar}")`;
      av.textContent = '';
      $('#acct-av').style.backgroundImage = `url("${u.avatar}")`;
      $('#acct-av').textContent = '';
    } else {
      av.textContent = initial;
      $('#acct-av').textContent = initial;
    }
    $('#acct-name').textContent = u.name;
    $('#acct-mail').textContent = u.email;
  }

  $$('#gate .oauth-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const provider = btn.dataset.provider;
      if (!window.LMAuth.configured) {
        const n = $('#gate-note');
        n.style.display = 'block';
        n.textContent =
          'Login ' + provider + ' belum aktif — kredensial Supabase belum diisi di assets/js/config.js.';
        return;
      }
      btn.disabled = true;
      try {
        await window.LMAuth.signIn(provider, location.href);
      } catch (err) {
        btn.disabled = false;
        toast(T('login.gagal') + ' ' + err.message, 'err');
      }
    });
  });

  /** Status paket (jenis akun, berlaku sampai kapan, sisa jatah uji coba). */
  async function paintAcctStatus() {
    const el = $('#acct-status');
    const up = $('#acct-upgrade');
    if (!el) return;
    await LMQuota.load(true); // paksa baca ulang — bisa berubah lewat webhook pembayaran
    el.textContent = await LMQuota.label();
    if (up) {
      const s = await LMQuota.load();
      up.style.display = s.unlimited || s.pro ? 'none' : '';
    }
  }
  $('#avatar').addEventListener('click', () => {
    acct.classList.add('open');
    paintAcctStatus();
  });
  const acctUpgrade = $('#acct-upgrade');
  if (acctUpgrade) acctUpgrade.addEventListener('click', () => {
    acct.classList.remove('open');
    LMUpgrade.show('manual');
  });
  $('#acct-x').addEventListener('click', () => acct.classList.remove('open'));
  acct.addEventListener('click', (e) => {
    if (e.target === acct) acct.classList.remove('open');
  });
  $('#btn-signout').addEventListener('click', async () => {
    await window.LMAuth.signOut();
    acct.classList.remove('open');
    gate.classList.remove('hidden');
  });

  /* ═══ INIT ═══════════════════════════════════════════════════════ */
  buildDroneList();
  changeDrone(selectedDrone);
  setHud('zoom', map.getZoom());
  updateStats();

  // Teks yang digambar JavaScript tidak tersentuh LMI18n.apply(), jadi
  // harus digambar ulang sendiri setiap bahasa berganti.
  window.LMI18n.onChange(() => {
    buildDroneList();
    changeDrone(selectedDrone);  // judul format & tombol ekspor
    $('#dock-h').textContent = T(PANE_KEY[activePane]);
    paintQuota();
  });

  window.addEventListener('resize', () => {
    if (isMobile()) snapTo(sheetState);
    else dock.style.removeProperty('--sheet-y');
  });

  window.LMAuth.init().then((user) => {
    if (user) {
      paintUser(user);
      gate.classList.add('hidden');
      LMQuota.reset();
      paintQuota();
    } else {
      gate.classList.remove('hidden');
    }
    if (isMobile()) requestAnimationFrame(() => snapTo('half'));
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
