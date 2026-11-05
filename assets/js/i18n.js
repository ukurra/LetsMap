"use strict";
/* ═══════════════════════════════════════════════════════════════════
   Ukurra — dwibahasa (Indonesia / English)

   Teks statis ditandai di HTML dengan atribut:
     data-i18n       → isi teks elemen
     data-i18n-html  → isi HTML elemen (untuk teks bertag <b>)
     data-i18n-ph    → placeholder
     data-i18n-title → title / tooltip
     data-i18n-aria  → aria-label

   Teks dinamis dari JavaScript dipanggil lewat LMI18n.t('kunci').

   Bahasa Indonesia jadi bawaan karena pasarnya di Indonesia; pengguna
   berbahasa Inggris tinggal menekan sakelar di navbar, dan pilihannya
   diingat di peramban.
   ═══════════════════════════════════════════════════════════════════ */

window.LMI18n = (() => {
  const KEY = "ukurra.lang";

  const DICT = {
    id: {
      /* ── navigasi ── */
      "nav.drone": "Drone",
      "nav.cara": "Cara Pakai",
      "nav.desktop": "Pengolahan Data",
      "nav.harga": "Harga",
      "nav.install": "Pasang App",
      "nav.installTitle": "Pasang Ukurra di perangkat ini",
      "nav.login": "Masuk",
      "nav.buatMisi": "Buat Misi",
      "nav.droneDidukung": "Drone Didukung",
      "nav.pasangHp": "Pasang di HP",
      "nav.bukaPeta": "Buka Peta →",
      "nav.menu": "Menu",

      /* ── hero ── */
      "hero.label":
        "Rencana misi → olah data → peta siap cetak • Rp 599.000/tahun",
      "hero.title": "Bikin misi waypoint<br>semudah <span>menggambar.</span>",
      "hero.sub":
        "Tandai area di peta, Ukurra menyusun seluruh jalur terbang dan titik " +
        "fotonya otomatis. Olah hasilnya jadi orthofoto dan DSM untuk " +
        "mengukur luas dan menghitung volume, lalu cetak jadi peta PDF — " +
        "semuanya dalam satu langganan.",
      "hero.cobaGratis": "Coba Gratis",
      "hero.lihatHarga": "Lihat Harga",
      "hero.chip1": "2 misi uji coba, tanpa kartu kredit",
      "hero.chip2": "1 proyek olah data gratis",
      "hero.chip3": "Tanpa iklan",

      "promo.badge": "Termasuk Ukurra Standard",
      "promo.title": "Olah foto drone jadi<br>orthofoto &amp; DSM.",
      "promo.body":
        "Foto dari misi kamu diproses otomatis jadi peta foto tegak berskala dan " +
        "model permukaan tanah — bahan untuk mengukur luas lahan dan menghitung " +
        "volume galian, timbunan, atau stockpile.",
      "promo.cta": "Mulai pengolahan data",

      /* ── drone ── */
      "drone.label": "Kompatibilitas",
      "drone.title": "Drone yang sudah didukung.",
      "drone.desc":
        "Setiap model punya profil sensor sendiri, jadi perhitungan resolusi tanah " +
        "dan jarak antar jalur menyesuaikan kamera yang kamu pakai.",
      "drone.menit": "menit",
      "drone.kmz": "Dibuka lewat DJI Fly",
      "drone.json": "Dibuka lewat aplikasi Potensic",

      /* ── cara pakai ── */
      "cara.label": "Enam Langkah",
      "cara.title": "Dari lahan kosong ke peta siap cetak.",
      "cara.desc":
        "Tidak perlu latar belakang GIS. Rencanakan misi, terbangkan, olah hasilnya, dan cetak petanya.",
      "cara.1t": "Pilih drone",
      "cara.1d":
        "Tentukan model drone kamu. Spesifikasi sensor dan daya tahan baterai terisi otomatis.",
      "cara.2t": "Gambar area & terbang",
      "cara.2d":
        "Tandai batas lahan di peta, atur parameter misi, ekspor ke drone, lalu terbangkan.",
      "cara.3t": "Olah foto drone",
      "cara.3d":
        "Masukkan foto hasil terbang ke Ukurra Studio. Hasilnya: orthofoto, DSM, dan point cloud.",
      "cara.4t": "Ukur & analisis",
      "cara.4d":
        "Ukur luas lahan, hitung volume galian atau timbunan, dan buat laporan pengukuran.",
      "cara.5t": "Cetak peta",
      "cara.5d":
        "Tata orthofoto jadi peta siap cetak lengkap dengan legenda, skala, dan arah utara. Ekspor PDF.",
      "cara.6t": "Bagikan hasil",
      "cara.6d":
        "Ekspor GeoTIFF untuk GIS, JPG untuk presentasi, atau PDF untuk klien di lapangan.",

      /* ── pengolahan data ── */
      "desk.badge": "Termasuk Ukurra Standard",
      "desk.title": "Dari waypoint jadi orthofoto &amp; DSM.",
      "desk.body":
        "Misi yang kamu buat di sini menghasilkan ratusan foto udara. " +
        "<b>Ukurra Studio</b> mengolahnya di PC sendiri jadi <b>orthofoto</b> — " +
        "peta foto tegak berskala — dan <b>DSM</b>, model permukaan tanah. " +
        "<b>Ukur luas lahan</b>, <b>hitung volume</b> galian atau timbunan, " +
        "lalu tata hasilnya jadi <b>peta siap cetak</b> lengkap dengan legenda " +
        "dan skala. Ekspor ke PDF, GeoTIFF, atau JPG.",
      "desk.c1": "Orthofoto",
      "desk.c2": "DSM",
      "desk.c3": "Point cloud",
      "desk.c4": "Ukur luas",
      "desk.c5": "Hitung volume",
      "desk.c6": "Laporan pengukuran",
      "desk.c7": "Peta siap cetak",
      "desk.cta": "Lihat Paket & Harga",
      "desk.unduh": "Unduh Ukurra Studio",
      "desk.p5": "Ukur & Ekspor Laporan",
      "desk.p6": "Cetak Peta PDF",

      /* ── harga ── */
      "harga.title": "Satu langganan, seluruh alurnya.",
      "harga.desc":
        "Rencanakan misi di HP, olah datanya di laptop, cetak petanya. " +
        "Tidak dijual terpisah, tidak ada biaya per proyek.",

      "harga.ujiCoba": "Uji Coba",
      "harga.gratis": "Gratis",
      "harga.sekaliAkun": "sekali per akun",
      "harga.f1": "<b>2 misi</b> waypoint",
      "harga.f2": "<b>1 proyek</b> olah data",
      "harga.f3": "Ekspor KMZ & JSON",
      "harga.f4": "Semua drone yang didukung",
      "harga.f5": "Tanpa kartu kredit",
      "harga.mulaiUji": "Mulai Uji Coba",

      "harga.palingDipilih": "Paling Dipilih",
      "harga.perTahun": "/tahun",
      "harga.perBulan": "/bulan",
      "harga.setaraBulan": "setara <b>Rp 49.900</b> per bulan",
      "harga.s1": "<b>Misi tanpa batas</b>, semua drone",
      "harga.s2": "Grid silang untuk DSM yang akurat",
      "harga.s3": "Simpan & buka misi kapan saja",
      "harga.s4": "<b>Olah data tanpa batas proyek</b>",
      "harga.s5": "Orthofoto, DSM, point cloud",
      "harga.s6": "Ukur jarak, luas, volume, tinggi",
      "harga.s7": "Peta siap cetak + <b>peta PDF</b>",
      "harga.s8": "Ekspor GeoTIFF, JPG, laporan",
      "harga.langganan": "Mulai Berlangganan",
      "harga.atauBulanan": "atau <b>Rp 69.000/bulan</b>, berhenti kapan saja",

      "harga.limaPemasangan": "<b>untuk 5 pemasangan sekaligus</b>",
      "harga.o1": "<b>Semua fitur Standard</b>",
      "harga.o2": "<b>Olah foto drone</b> jadi orthofoto & DSM",
      "harga.o4": "<b>Garis kontur</b> dari DSM (DXF & GeoJSON)",
      "harga.o5": "Dukungan prioritas",
      "harga.o6": "<b>Buka orthofoto dari luar</b>",
      "harga.o7": "<b>Gabung banyak orthofoto</b> jadi satu peta siap cetak",
      "harga.hubungi": "Hubungi Kami",

      "harga.catatan":
        "Pembayaran lewat QRIS, transfer bank, dan e-wallet.<br>" +
        "Ukurra Studio berjalan di <b>Windows 10 dan 11</b>; perencana misi " +
        "berjalan di peramban mana pun, termasuk HP.",
      /* ── cta & footer ── */
      "cta.title": "Siap memetakan lahan pertama kamu?",
      "cta.desc":
        "Mulai dengan 2 misi gratis dan 1 proyek olah data. Tanpa kartu kredit.",
      "cta.btn": "Coba Gratis Sekarang",
      "foot.about":
        "Perencana misi pemetaan udara untuk pilot drone consumer di Indonesia. " +
        "Dibuat supaya siapa pun bisa menghasilkan peta yang layak dipakai.",
      "foot.produk": "Produk",
      "foot.bantuan": "Bantuan",
      "foot.privasi": "Kebijakan Privasi",
      "foot.syarat": "Syarat Penggunaan",
      "foot.kontak": "Kontak",
      "foot.lapor": "Lapor Masalah",
      "foot.laporSub": "Bug, kendala teknis, atau aduan",
      "foot.peta": "Peta oleh OpenStreetMap & Esri.",
      "foot.dibuat": "Dibuat di Indonesia",

      /* ── login ── */
      "login.judul": "Masuk ke Ukurra",
      "login.sub": "Simpan misi kamu dan buka kembali dari perangkat mana pun.",
      "login.google": "Lanjutkan dengan Google",
      "login.setuju":
        "Dengan melanjutkan kamu menyetujui Syarat Penggunaan dan Kebijakan Privasi Ukurra.",
      "login.tutup": "Tutup",
      "login.belumAktif":
        "Login belum aktif — kredensial Supabase belum diisi di assets/js/config.js. " +
        'Sementara ini pakai "Coba Dulu Tanpa Akun".',
      "login.gagal": "Gagal masuk. Coba lagi.",

      /* ── perencana: panel ── */
      "msg.geoTidakDidukung": "Geolokasi tidak didukung browser ini.",
      "msg.geoGagal": "Gagal mendapatkan lokasi. Pastikan izin lokasi aktif.",
      "msg.polygonTidakAda": "Poligon tidak ditemukan di berkas itu.",
      "msg.cariGagal": "Pencarian gagal. Periksa koneksi internet.",
      "msg.kmzUnduh": "KMZ berhasil diunduh —",
      "msg.jsonUnduh": "JSON berhasil diunduh —",
      "msg.csvUnduh": "CSV berhasil diunduh.",
      "msg.rincianUnduh": "Rincian JSON berhasil diunduh.",
      "msg.eksporGagal": "Ekspor gagal:",
      "app.terbangK": "Terbang",
      "app.eksporKmz": "Ekspor KMZ",
      "app.eksporJson": "Ekspor JSON",
      "app.formatKmz":
        "<b>KMZ (WPML)</b> — salin ke folder misi DJI Fly di perangkat kontrol, lalu buka dari daftar misi.",
      "app.formatJson":
        "<b>JSON</b> — impor lewat aplikasi Potensic pada menu misi waypoint.",
      "app.areaS": "Area",
      "app.gsdL": "GSD cm",
      "app.durasiL": "Durasi",
      "app.luasL": "Luas",
      "app.bateraiL": "Baterai",
      "app.zoomL": "Zoom",
      "app.jalurL": "Jalur",
      "app.jarakL": "Jarak",
      "app.fotoL": "Foto",
      "app.fotoDiambil": "Foto yang diambil",
      "app.kembaliBeranda": "Kembali ke beranda",
      "app.akun": "Akun",
      "app.parameter": "Parameter",
      "app.ekspor": "Ekspor",
      "app.modelDrone": "Model Drone",
      "app.gambarImpor": "Gambar atau Impor",
      "app.gambarPoligon": "Gambar Poligon",
      "app.gambarPoligonSub": "Klik di peta untuk menandai sudut",
      "app.hapusArea": "Hapus Area",
      "app.hapusAreaSub": "Mulai lagi dari nol",
      "app.imporBerkas": "Impor Berkas",
      "app.pilihBerkas": "Pilih berkas KML / KMZ",
      "app.atauSeret": "atau seret ke sini",
      "app.setelahArea":
        "Setelah area jadi, <b>geser titik putih</b> untuk mengubah bentuk.",
      "app.terbang": "Terbang",
      "app.kamera": "Kamera",
      "app.setelahSelesai": "Setelah Selesai",
      "app.hoverNote":
        "<b>Hover</b> — diam di udara menunggu perintah. <b>Continue</b> — lanjut menyelesaikan misi.",
      "app.rincianJson": "Rincian JSON",
      "app.rincianJsonSub": "Parameter lengkap misi",
      "app.eksporWaypoint": "Ekspor Waypoint",
      "app.belumAdaArea": "Belum ada area survei",
      "app.belumAdaAreaSub":
        "Buka tab <b>Area</b> lalu pilih <b>Gambar Poligon</b>, atau impor berkas KML/KMZ yang sudah kamu punya.",
      "app.belumAdaAreaHp":
        "Buka tab <b>Area</b> &rarr; <b>Gambar Poligon</b>, atau impor KML/KMZ.",
      "app.misiTersimpan":
        "Misi kamu tersimpan dan bisa dibuka lagi kapan saja.",
      "app.drone": "Pilih Drone",
      "app.area": "Area Survei",
      "app.param": "Parameter Misi",
      "app.export": "Ekspor Misi",
      "app.cariLokasi": "Cari lokasi…",
      "app.satelit": "Satelit",
      "app.jalan": "Jalan",
      "app.gambarArea": "Gambar Area",
      "app.batalPolygon": "Batalkan Poligon",
      "app.hapus": "Hapus",
      "app.imporKml": "Impor KML / KMZ",
      "app.statusAkun": "Status Akun",
      "app.ringkasan": "Ringkasan Misi",
      "app.formatKeluaran": "Format Keluaran",
      "app.simpanJuga": "Simpan Juga Sebagai",
      "app.tabelCsv": "Tabel CSV",
      "app.tabelCsvSub": "Daftar koordinat waypoint",
      "app.detailJson": "Detail JSON",
      "app.detailJsonSub": "Seluruh parameter misi",
      "app.belumAdaMisi": "Belum ada misi. Gambar area survei terlebih dahulu.",
      "app.memeriksa": "Memeriksa…",
      "app.upgradeBtn": "Berlangganan — Rp 599.000/tahun",

      /* ── perencana: parameter ── */
      "app.ketinggian": "Ketinggian (m)",
      "app.kecepatan": "Kecepatan (m/s)",
      "app.overlapSidelap": "Overlap & Sidelap",
      "app.overlap": "Overlap (%)",
      "app.sidelap": "Sidelap (%)",
      "app.sudutJalur": "Sudut Jalur",
      "app.gridSilang": "Grid Silang",
      "app.misiTersimpan": "Misi Tersimpan",
      "bagi.judul": "Misi dipecah jadi {n} bagian",
      "bagi.sebab":
        "Areanya terlalu luas: {total} waypoint, sedangkan {drone} hanya menerbangkan {maks} per misi.",
      "bagi.bagianKe": "Bagian {n}",
      "bagi.mulaiBagian": "Mulai bagian {n}",
      "bagi.kaki": "Terbangkan berurutan, lalu olah semua fotonya sekaligus.",
      "wp.judul": "{n} waypoint — melebihi batas {maks}",
      "wp.teks":
        "{drone} hanya menerbangkan {maks} waypoint pertama. Sisanya tetap ada di berkas, tapi tidak pernah difoto — tanpa pesan galat apa pun.",
      "wp.saran":
        "Saat diekspor, misi ini otomatis dipecah jadi {bagian} berkas. Terbangkan berurutan, lalu olah semua fotonya sekaligus di Ukurra Studio.",
      "msg.misiDipecah": "Misi dipecah jadi {n} berkas — terbangkan berurutan.",
      "app.misiKe": "Misi {n}",
      "app.hapusMisi": "Hapus misi",
      "app.tampilkanLapisan": "Tampilkan di peta sebagai acuan",
      "app.sembunyikanLapisan": "Sembunyikan dari peta",
      "app.belumAdaMisiTersimpan":
        "Belum ada misi tersimpan. Setiap misi yang diekspor tersimpan di sini secara otomatis.",
      "msg.misiTersimpan": "Misi tersimpan.",
      "msg.simpanPenuh":
        "Penyimpanan peramban penuh. Hapus beberapa misi lama dulu.",
      "app.gridSilangKet":
        "Terbang dua arah tegak lurus. Foto dua kali lipat, tapi DSM dan volume jauh lebih akurat.",
      "app.keamanan": "Keamanan",
      "app.sinyalHilang": "Saat Sinyal Hilang",
      "app.gimbalNote":
        "Gimbal dikunci di <b>−90°, tegak lurus ke bawah</b>. Orthofoto " +
        "butuh bidikan nadir supaya skala peta merata dan bangunan tidak miring.",
      "app.overlapNote":
        "Menentukan jumlah foto yang diambil dan kualitas orthofoto. " +
        "<b>75% / 75%</b> sudah aman.",

      /* ── perencana: statistik ── */
      "app.gsd": "GSD CM",
      "app.durasi": "DURASI",
      "app.luas": "LUAS",
      "app.baterai": "BATERAI",
      "app.jalur": "Jalur",
      "app.jarak": "Jarak",
      "app.foto": "Foto",
      "app.zoom": "Zoom",

      /* ── pesan ── */
      "map.posisiFoto": "Posisi foto",
      "map.mulai": "Mulai",
      "map.selesai": "Selesai",
      "msg.terlaluBanyakFoto":
        "Parameter ini menghasilkan sekitar {n} foto — terlalu banyak. Naikkan ketinggian, atau turunkan overlap dan sidelap.",
      "msg.buatAreaDulu": "Buat area survei dulu sebelum mengekspor.",
      "msg.polygonMin": "Poligon perlu minimal 3 titik.",
      "msg.areaDihapus": "Area dihapus.",
      "msg.misiDibuat": "Misi dibuat.",
      "msg.kmzTersimpan": "Berkas KMZ tersimpan.",
      "msg.jsonTersimpan": "Berkas JSON tersimpan.",
      "msg.csvTersimpan": "Berkas CSV tersimpan.",
      "msg.imporBerhasil": "Area berhasil diimpor.",
      "msg.imporGagal":
        "Gagal membaca berkas. Pastikan KML atau KMZ yang benar.",
      "msg.lokasiTidakDitemukan": "Lokasi tidak ditemukan.",
      "msg.checkoutBelumSiap": "Halaman pembayaran belum disiapkan.",
      "msg.klikTitikPertama": "Klik titik pertama untuk menutup area.",

      /* ── kuota & upgrade ── */
      "kuota.dev": "Mode pengembangan — tanpa batas",
      "pwa.terpasang": "Aplikasi berhasil dipasang di perangkat kamu.",
      "pwa.tanpaToko": "Tanpa unduh dari toko aplikasi",
      "pwa.penjelasan":
        "Setelah terpasang, Ukurra terbuka layar penuh seperti aplikasi biasa dan peta yang pernah dibuka tetap bisa dilihat walau sinyal hilang di lapangan.",
      "pwa.ios.judul": "Pasang lewat Safari",
      "pwa.ios.s1":
        "Ketuk tombol <b>Bagikan</b> — ikon kotak dengan panah ke atas di bilah bawah.",
      "pwa.ios.s2":
        "Gulir ke bawah, lalu pilih <b>Tambahkan ke Layar Utama</b>.",
      "pwa.ios.s3":
        "Ketuk <b>Tambah</b>. Ikon Ukurra akan muncul di layar utama.",
      "pwa.ios.note":
        "Di iPhone dan iPad, pemasangan hanya bisa lewat Safari — bukan Chrome.",
      "pwa.android.judul": "Pasang lewat Chrome",
      "pwa.android.s1": "Ketuk menu <b>tiga titik</b> di pojok kanan atas.",
      "pwa.android.s2":
        "Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke Layar Utama</b>.",
      "pwa.android.s3": "Ketuk <b>Instal</b> untuk mengonfirmasi.",
      "pwa.android.note": "",
      "pwa.desktop.judul": "Pasang di komputer",
      "pwa.desktop.s1":
        "Lihat ujung kanan bilah alamat, cari <b>ikon instal</b> berbentuk monitor dengan panah.",
      "pwa.desktop.s2": "Klik ikon tersebut, lalu pilih <b>Instal</b>.",
      "pwa.desktop.s3":
        "Ukurra akan terbuka di jendelanya sendiri, tanpa bilah peramban.",
      "pwa.desktop.note": "Tersedia di Chrome, Edge, dan Brave.",
      "kuota.sisa": "Uji coba — sisa {m} misi, {p} olah data",
      "kuota.proSelamanya": "Ukurra Standard — selamanya",
      "kuota.proSampai": "Ukurra Standard — sampai {tgl}",
      "up.misiHabis": "Jatah misi uji coba sudah habis",
      "up.misiHabisTeks":
        "Kamu sudah memakai <b>2 misi gratis</b>. Berlangganan Ukurra untuk membuat misi tanpa batas.",
      "up.proyekHabis": "Jatah olah data uji coba sudah habis",
      "up.proyekHabisTeks":
        "Kamu sudah memakai <b>1 proyek gratis</b>. Berlangganan Ukurra untuk mengolah data tanpa batas.",
      "up.manual": "Ukurra Standard",
      "up.manualTeks":
        "Satu langganan untuk <b>mission planner dan aplikasi pengolahan data</b>.",
      "up.bulanan": "Bulanan",
      "up.tahunan": "Tahunan",
      "up.selamanya": "Selamanya",
      "up.perBulan": "per bulan",
      "up.perTahun": "per tahun",
      "up.sekaliBayar": "sekali bayar",
      "up.hemat3Bulan": "Hemat lebih dari 3 bulan",
      "up.terbatas": "Terbatas",
      "up.berlangganan": "Berlangganan Sekarang",
      "up.satuLangganan":
        "Satu langganan membuka <b>mission planner</b> dan <b>Ukurra Studio</b> sekaligus.",
      "up.m1": "Buat misi tanpa batas, semua drone yang didukung",
      "up.m2": "Ekspor KMZ (DJI) dan JSON (Potensic)",
      "up.m3": "Aplikasi desktop Ukurra Studio — orthofoto, DSM, point cloud",
      "up.m4": "Olah data tanpa batas proyek",
      "up.m5": "Ukur jarak, luas, volume, dan tinggi titik",
      "up.m6": "Ekspor laporan pengukuran (HTML, CSV, PDF)",
    },

    en: {
      /* ── navigation ── */
      "nav.drone": "Drones",
      "nav.cara": "How It Works",
      "nav.desktop": "Data Processing",
      "nav.harga": "Pricing",
      "nav.install": "Install App",
      "nav.installTitle": "Install Ukurra on this device",
      "nav.login": "Sign in",
      "nav.buatMisi": "New Mission",
      "nav.droneDidukung": "Supported Drones",
      "nav.pasangHp": "Install on Phone",
      "nav.bukaPeta": "Open Map →",
      "nav.menu": "Menu",

      /* ── hero ── */
      "hero.label": "Plan → process → print-ready map • Rp 599,000/year",
      "hero.title":
        "Plan waypoint missions<br>as easily as <span>drawing.</span>",
      "hero.sub":
        "Mark an area on the map and Ukurra lays out every flight line and photo " +
        "point automatically. Process the results into an orthophoto and DSM to " +
        "measure area and calculate volume, then print it as a map PDF — " +
        "all in one subscription.",
      "hero.cobaGratis": "Start Free",
      "hero.lihatHarga": "See Pricing",
      "hero.chip1": "2 trial missions, no credit card",
      "hero.chip2": "1 free processing project",
      "hero.chip3": "No ads",

      "promo.badge": "Included with Ukurra Standard",
      "promo.title": "Turn drone photos into<br>an orthophoto &amp; DSM.",
      "promo.body":
        "Photos from your mission are processed into a scaled top-down photo map " +
        "and a surface model — everything you need to measure land area and " +
        "calculate cut, fill, or stockpile volume.",
      "promo.cta": "Start processing data",

      /* ── drones ── */
      "drone.label": "Compatibility",
      "drone.title": "Drones we already support.",
      "drone.desc":
        "Every model carries its own sensor profile, so ground resolution and " +
        "line spacing adapt to the camera you actually fly.",
      "drone.menit": "min",
      "drone.kmz": "Opens in DJI Fly",
      "drone.json": "Opens in the Potensic app",

      /* ── how it works ── */
      "cara.label": "Six Steps",
      "cara.title": "From empty field to print-ready map.",
      "cara.desc":
        "No GIS background needed. Plan the mission, fly it, process the results, and print the map.",
      "cara.1t": "Pick your drone",
      "cara.1d":
        "Choose your model. Sensor specs and battery endurance fill in automatically.",
      "cara.2t": "Draw area & fly",
      "cara.2d":
        "Mark the boundary on the map, set mission parameters, export to your drone, and fly.",
      "cara.3t": "Process drone photos",
      "cara.3d":
        "Feed the flight photos into Ukurra Studio. Output: orthophoto, DSM, and point cloud.",
      "cara.4t": "Measure & analyse",
      "cara.4d":
        "Measure land area, calculate cut or fill volumes, and generate measurement reports.",
      "cara.5t": "Print the map",
      "cara.5d":
        "Lay out the orthophoto as a print-ready map with legend, scale, and north arrow. Export as PDF.",
      "cara.6t": "Share the results",
      "cara.6d":
        "Export GeoTIFF for GIS, JPG for presentations, or PDF for clients in the field.",

      /* ── data processing ── */
      "desk.badge": "Included with Ukurra Standard",
      "desk.title": "From waypoints to orthophoto &amp; DSM.",
      "desk.body":
        "The missions you plan here produce hundreds of aerial photos. " +
        "<b>Ukurra Studio</b> processes them on your own PC into an " +
        "<b>orthophoto</b> — a scaled top-down photo map — and a <b>DSM</b>, " +
        "a surface model. <b>Measure land area</b>, <b>calculate volume</b> " +
        "for cut, fill, or stockpiles, then lay the results out as a " +
        "<b>print-ready map</b> with legend and scale. Export to PDF, GeoTIFF, or JPG.",
      "desk.c1": "Orthophoto",
      "desk.c2": "DSM",
      "desk.c3": "Point cloud",
      "desk.c4": "Measure area",
      "desk.c5": "Calculate volume",
      "desk.c6": "Measurement report",
      "desk.c7": "Print-ready maps",
      "desk.cta": "See Plans & Pricing",
      "desk.unduh": "Download Ukurra Studio",
      "desk.p5": "Measure & Export Report",
      "desk.p6": "Print Map PDF",

      /* ── pricing ── */
      "harga.title": "One subscription, the whole workflow.",
      "harga.desc":
        "Plan the flight on your phone, process it on your laptop, print the map. " +
        "Not sold separately, no per-project fees.",

      "harga.ujiCoba": "Free Trial",
      "harga.gratis": "Free",
      "harga.sekaliAkun": "once per account",
      "harga.f1": "<b>2 waypoint missions</b>",
      "harga.f2": "<b>1 processing project</b>",
      "harga.f3": "KMZ & JSON export",
      "harga.f4": "Every supported drone",
      "harga.f5": "No credit card",
      "harga.mulaiUji": "Start Free Trial",

      "harga.palingDipilih": "Most Popular",
      "harga.perTahun": "/year",
      "harga.perBulan": "/month",
      "harga.setaraBulan": "about <b>Rp 49,900</b> a month",
      "harga.s1": "<b>Unlimited missions</b>, every drone",
      "harga.s2": "Cross grid for an accurate DSM",
      "harga.s3": "Save and reopen missions any time",
      "harga.s4": "<b>Unlimited processing projects</b>",
      "harga.s5": "Orthophoto, DSM, point cloud",
      "harga.s6": "Measure distance, area, volume, height",
      "harga.s7": "Print-ready maps + <b>map PDF</b>",
      "harga.s8": "GeoTIFF, JPG and report export",
      "harga.langganan": "Subscribe",
      "harga.atauBulanan": "or <b>Rp 69,000/month</b>, cancel any time",

      "harga.limaPemasangan": "<b>covers 5 installs at once</b>",
      "harga.o1": "<b>Everything in Standard</b>",
      "harga.o2": "<b>Process drone photos</b> into orthophoto & DSM",
      "harga.o4": "<b>Contour lines</b> from the DSM (DXF & GeoJSON)",
      "harga.o5": "Priority support",
      "harga.o6":
        "<b>Open external orthophotos</b> — Agisoft, Pix4D, any GeoTIFF",
      "harga.o7": "<b>Combine many orthophotos</b> into one print-ready map",
      "harga.hubungi": "Contact Us",

      "harga.catatan":
        "Payment by QRIS, bank transfer and e-wallet.<br>" +
        "Ukurra Studio runs on <b>Windows 10 and 11</b>; the mission planner " +
        "runs in any browser, including on a phone.",
      /* ── cta & footer ── */
      "cta.title": "Ready to map your first site?",
      "cta.desc":
        "Start with 2 free missions and 1 processing project. No credit card.",
      "cta.btn": "Start Free Now",
      "foot.about":
        "An aerial mapping mission planner for consumer drone pilots in Indonesia. " +
        "Built so anyone can produce a map worth using.",
      "foot.produk": "Product",
      "foot.bantuan": "Help",
      "foot.privasi": "Privacy Policy",
      "foot.syarat": "Terms of Service",
      "foot.kontak": "Contact",
      "foot.lapor": "Report an Issue",
      "foot.laporSub": "Bugs, technical issues, or complaints",
      "foot.peta": "Maps by OpenStreetMap & Esri.",
      "foot.dibuat": "Made in Indonesia",

      /* ── sign in ── */
      "login.judul": "Sign in to Ukurra",
      "login.sub": "Save your missions and pick them up from any device.",
      "login.google": "Continue with Google",
      "login.setuju":
        "By continuing you agree to Ukurra’s Terms of Service and Privacy Policy.",
      "login.tutup": "Close",
      "login.belumAktif":
        "Sign-in is not active yet — Supabase credentials are missing in " +
        'assets/js/config.js. For now, use "Try Without an Account".',
      "login.gagal": "Sign-in failed. Please try again.",

      /* ── planner: panels ── */
      "msg.geoTidakDidukung": "This browser does not support geolocation.",
      "msg.geoGagal":
        "Could not get your location. Check that location permission is on.",
      "msg.polygonTidakAda": "No polygon found in that file.",
      "msg.cariGagal": "Search failed. Check your internet connection.",
      "msg.kmzUnduh": "KMZ downloaded —",
      "msg.jsonUnduh": "JSON downloaded —",
      "msg.csvUnduh": "CSV downloaded.",
      "msg.rincianUnduh": "JSON details downloaded.",
      "msg.eksporGagal": "Export failed:",
      "app.terbangK": "Flight",
      "app.eksporKmz": "Export KMZ",
      "app.eksporJson": "Export JSON",
      "app.formatKmz":
        "<b>KMZ (WPML)</b> — copy it to the DJI Fly mission folder on your controller, then open it from the mission list.",
      "app.formatJson":
        "<b>JSON</b> — import it through the Potensic app under waypoint missions.",
      "app.areaS": "Area",
      "app.gsdL": "GSD cm",
      "app.durasiL": "Duration",
      "app.luasL": "Area",
      "app.bateraiL": "Batteries",
      "app.zoomL": "Zoom",
      "app.jalurL": "Lines",
      "app.jarakL": "Distance",
      "app.fotoL": "Photos",
      "app.fotoDiambil": "Photos captured",
      "app.kembaliBeranda": "Back to home",
      "app.akun": "Account",
      "app.parameter": "Parameters",
      "app.ekspor": "Export",
      "app.modelDrone": "Drone Model",
      "app.gambarImpor": "Draw or Import",
      "app.gambarPoligon": "Draw Polygon",
      "app.gambarPoligonSub": "Click on the map to mark corners",
      "app.hapusArea": "Clear Area",
      "app.hapusAreaSub": "Start over from scratch",
      "app.imporBerkas": "Import File",
      "app.pilihBerkas": "Choose a KML / KMZ file",
      "app.atauSeret": "or drag it here",
      "app.setelahArea":
        "Once the area exists, <b>drag the white points</b> to reshape it.",
      "app.terbang": "Flight",
      "app.kamera": "Camera",
      "app.setelahSelesai": "When Finished",
      "app.hoverNote":
        "<b>Hover</b> — hold position and wait for a command. <b>Continue</b> — carry on and finish the mission.",
      "app.rincianJson": "JSON Details",
      "app.rincianJsonSub": "Full mission parameters",
      "app.eksporWaypoint": "Export Waypoints",
      "app.belumAdaArea": "No survey area yet",
      "app.belumAdaAreaSub":
        "Open the <b>Area</b> tab and choose <b>Draw Polygon</b>, or import a KML/KMZ file you already have.",
      "app.belumAdaAreaHp":
        "Open the <b>Area</b> tab &rarr; <b>Draw Polygon</b>, or import a KML/KMZ.",
      "app.misiTersimpan":
        "Your missions are saved and can be reopened anytime.",
      "app.drone": "Choose Drone",
      "app.area": "Survey Area",
      "app.param": "Mission Parameters",
      "app.export": "Export Mission",
      "app.cariLokasi": "Search location…",
      "app.satelit": "Satellite",
      "app.jalan": "Streets",
      "app.gambarArea": "Draw Area",
      "app.batalPolygon": "Cancel Polygon",
      "app.hapus": "Clear",
      "app.imporKml": "Import KML / KMZ",
      "app.statusAkun": "Account Status",
      "app.ringkasan": "Mission Summary",
      "app.formatKeluaran": "Output Format",
      "app.simpanJuga": "Also Save As",
      "app.tabelCsv": "CSV Table",
      "app.tabelCsvSub": "List of waypoint coordinates",
      "app.detailJson": "JSON Details",
      "app.detailJsonSub": "Every mission parameter",
      "app.belumAdaMisi": "No mission yet. Draw a survey area first.",
      "app.memeriksa": "Checking…",
      "app.upgradeBtn": "Subscribe — Rp 599,000/year",

      /* ── planner: parameters ── */
      "app.ketinggian": "Altitude (m)",
      "app.kecepatan": "Speed (m/s)",
      "app.overlapSidelap": "Overlap & Sidelap",
      "app.overlap": "Overlap (%)",
      "app.sidelap": "Sidelap (%)",
      "app.sudutJalur": "Line Angle",
      "app.gridSilang": "Cross Grid",
      "app.misiTersimpan": "Saved Missions",
      "bagi.judul": "Mission split into {n} parts",
      "bagi.sebab":
        "The area is too large: {total} waypoints, while the {drone} flies only {maks} per mission.",
      "bagi.bagianKe": "Part {n}",
      "bagi.mulaiBagian": "Part {n} starts here",
      "bagi.kaki": "Fly them in order, then process all the photos together.",
      "wp.judul": "{n} waypoints — over the {maks} limit",
      "wp.teks":
        "The {drone} will fly only the first {maks} waypoints. The rest stay in the file but are never photographed — with no error message at all.",
      "wp.saran":
        "On export this mission is split into {bagian} files automatically. Fly them in order, then process all the photos together in Ukurra Studio.",
      "msg.misiDipecah": "Mission split into {n} files — fly them in order.",
      "app.misiKe": "Mission {n}",
      "app.hapusMisi": "Delete mission",
      "app.tampilkanLapisan": "Show on the map as a reference",
      "app.sembunyikanLapisan": "Hide from the map",
      "app.belumAdaMisiTersimpan":
        "No saved missions yet. Every mission you export is saved here automatically.",
      "msg.misiTersimpan": "Mission saved.",
      "msg.simpanPenuh":
        "Browser storage is full. Delete a few old missions first.",
      "app.gridSilangKet":
        "Flies two perpendicular passes. Twice the photos, but a far more accurate DSM and volume.",
      "app.keamanan": "Safety",
      "app.sinyalHilang": "On Signal Loss",
      "app.gimbalNote":
        "The gimbal is locked at <b>−90°, straight down</b>. Orthophotos need " +
        "nadir shots so map scale stays even and buildings do not lean.",
      "app.overlapNote":
        "Sets how many photos are taken and how good the orthophoto comes out. " +
        "<b>75% / 75%</b> is a safe choice.",

      /* ── planner: stats ── */
      "app.gsd": "GSD CM",
      "app.durasi": "DURATION",
      "app.luas": "AREA",
      "app.baterai": "BATTERIES",
      "app.jalur": "Lines",
      "app.jarak": "Distance",
      "app.foto": "Photos",
      "app.zoom": "Zoom",

      /* ── messages ── */
      "map.posisiFoto": "Photo position",
      "map.mulai": "Start",
      "map.selesai": "End",
      "msg.terlaluBanyakFoto":
        "These settings would produce about {n} photos — far too many. Raise the altitude, or lower the overlap and sidelap.",
      "msg.buatAreaDulu": "Draw a survey area before exporting.",
      "msg.polygonMin": "A polygon needs at least 3 points.",
      "msg.areaDihapus": "Area cleared.",
      "msg.misiDibuat": "Mission generated.",
      "msg.kmzTersimpan": "KMZ file saved.",
      "msg.jsonTersimpan": "JSON file saved.",
      "msg.csvTersimpan": "CSV file saved.",
      "msg.imporBerhasil": "Area imported successfully.",
      "msg.imporGagal":
        "Could not read the file. Make sure it is a valid KML or KMZ.",
      "msg.lokasiTidakDitemukan": "Location not found.",
      "msg.checkoutBelumSiap": "The payment page is not set up yet.",
      "msg.klikTitikPertama": "Click the first point to close the area.",

      /* ── quota & upgrade ── */
      "kuota.dev": "Development mode — unlimited",
      "pwa.terpasang": "The app was installed on your device.",
      "pwa.tanpaToko": "No app store download needed",
      "pwa.penjelasan":
        "Once installed, Ukurra opens full screen like any other app, and maps you have already opened stay viewable even when you lose signal in the field.",
      "pwa.ios.judul": "Install via Safari",
      "pwa.ios.s1":
        "Tap the <b>Share</b> button — the square icon with an arrow pointing up, in the bottom bar.",
      "pwa.ios.s2": "Scroll down and choose <b>Add to Home Screen</b>.",
      "pwa.ios.s3":
        "Tap <b>Add</b>. The Ukurra icon will appear on your home screen.",
      "pwa.ios.note":
        "On iPhone and iPad, installing only works in Safari — not Chrome.",
      "pwa.android.judul": "Install via Chrome",
      "pwa.android.s1":
        "Tap the <b>three-dot</b> menu in the top right corner.",
      "pwa.android.s2":
        "Choose <b>Install app</b> or <b>Add to Home screen</b>.",
      "pwa.android.s3": "Tap <b>Install</b> to confirm.",
      "pwa.android.note": "",
      "pwa.desktop.judul": "Install on your computer",
      "pwa.desktop.s1":
        "Look at the right end of the address bar for the <b>install icon</b>, a monitor with an arrow.",
      "pwa.desktop.s2": "Click it, then choose <b>Install</b>.",
      "pwa.desktop.s3":
        "Ukurra will open in its own window, without browser chrome.",
      "pwa.desktop.note": "Available in Chrome, Edge, and Brave.",
      "kuota.sisa": "Free trial — {m} missions, {p} processing left",
      "kuota.proSelamanya": "Ukurra Standard — lifetime",
      "kuota.proSampai": "Ukurra Standard — until {tgl}",
      "up.misiHabis": "Your trial missions are used up",
      "up.misiHabisTeks":
        "You have used all <b>2 free missions</b>. Unlock Ukurra Standard for unlimited missions.",
      "up.proyekHabis": "Your trial processing is used up",
      "up.proyekHabisTeks":
        "You have used your <b>1 free project</b>. Unlock Ukurra Standard for unlimited processing.",
      "up.manual": "Ukurra Standard",
      "up.manualTeks":
        "One subscription for <b>the mission planner and the processing app</b>.",
      "up.bulanan": "Monthly",
      "up.tahunan": "Yearly",
      "up.selamanya": "Lifetime",
      "up.perBulan": "per month",
      "up.perTahun": "per year",
      "up.sekaliBayar": "one-time",
      "up.hemat3Bulan": "Save over 3 months",
      "up.terbatas": "Limited",
      "up.berlangganan": "Subscribe Now",
      "up.satuLangganan":
        "One subscription unlocks <b>the mission planner</b> and <b>Ukurra Studio</b>.",
      "up.m1": "Unlimited missions, every supported drone",
      "up.m2": "KMZ (DJI) and JSON (Potensic) export",
      "up.m3": "Ukurra Studio desktop app — orthophoto, DSM, point cloud",
      "up.m4": "Unlimited processing projects",
      "up.m5": "Measure distance, area, volume, and point height",
      "up.m6": "Export measurement reports (HTML, CSV, PDF)",
    },
  };

  let lang = "id";
  try {
    const tersimpan = localStorage.getItem(KEY);
    if (tersimpan === "id" || tersimpan === "en") lang = tersimpan;
  } catch {
    /* peramban private mode — pakai bawaan */
  }

  const pendengar = [];

  /** Ambil teks. {var} di dalam teks diganti dari `vars`. */
  function t(kunci, vars) {
    const tabel = DICT[lang] || DICT.id;
    // Kunci yang belum diterjemahkan jatuh ke bahasa Indonesia, bukan
    // jadi kosong — teks asli selalu lebih baik daripada ruang hampa.
    let s = tabel[kunci];
    if (s == null) s = DICT.id[kunci];
    if (s == null) return kunci;
    if (vars) {
      for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    }
    return s;
  }

  /** Terapkan ke seluruh elemen bertanda di dalam `root`. */
  /** Teks untuk sebuah kunci, atau null kalau tidak ada di kamus. */
  function cari(kunci) {
    const tabel = DICT[lang] || DICT.id;
    const s = tabel[kunci] != null ? tabel[kunci] : DICT.id[kunci];
    return s == null ? null : s;
  }

  function apply(root) {
    const r = root || document;

    // Kunci yang tidak ditemukan TIDAK ditulis ke halaman. Kalau kamus
    // tertinggal versi lama — misalnya satu berkas masih dari cache —
    // elemennya dibiarkan apa adanya, sehingga pengguna melihat teks
    // cadangan di HTML, bukan "app.namaKunci" mentah.
    const pasang = (atribut, tulis) => {
      r.querySelectorAll(`[${atribut}]`).forEach((el) => {
        const s = cari(el.getAttribute(atribut));
        if (s != null) tulis(el, s);
      });
    };

    pasang("data-i18n", (el, s) => (el.textContent = s));
    pasang("data-i18n-html", (el, s) => (el.innerHTML = s));
    pasang("data-i18n-ph", (el, s) => (el.placeholder = s));
    pasang("data-i18n-title", (el, s) => (el.title = s));
    pasang("data-i18n-aria", (el, s) => el.setAttribute("aria-label", s));

    document.documentElement.lang = lang;
    // Sakelar di navbar ikut menyesuaikan tanpa perlu diurus pemanggil.
    document.querySelectorAll("[data-lang]").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === lang);
    });
  }

  function set(baru) {
    if (baru !== "id" && baru !== "en") return;
    if (baru === lang) return;
    lang = baru;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* abaikan */
    }
    apply();
    pendengar.forEach((cb) => {
      try {
        cb(lang);
      } catch (e) {
        console.error("[i18n]", e);
      }
    });
  }

  /** Dipanggil ulang setiap bahasa berubah, untuk teks yang digambar JS. */
  function onChange(cb) {
    pendengar.push(cb);
  }

  /** Pasang sakelar EN/ID ke sebuah wadah. */
  function mountSwitch(host) {
    if (!host) return;
    const wrap = document.createElement("div");
    wrap.className = "lang-switch";
    wrap.innerHTML =
      '<button type="button" data-lang="id">ID</button>' +
      '<button type="button" data-lang="en">EN</button>';
    // Kliknya diurus penangan global di bawah, jadi tidak dipasang lagi
    // di sini — kalau dipasang, satu klik akan terhitung dua kali.
    host.appendChild(wrap);
    apply(wrap);
  }

  // Satu penangan untuk semua sakelar, termasuk yang ditulis langsung di
  // HTML — jadi menambah sakelar di halaman baru tidak perlu kode lagi.
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-lang]");
    if (b) set(b.dataset.lang);
  });

  document.addEventListener("DOMContentLoaded", () => apply());

  return {
    t,
    apply,
    set,
    onChange,
    mountSwitch,
    get lang() {
      return lang;
    },
  };
})();
