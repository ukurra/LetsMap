/* ═══════════════════════════════════════════════════════════════════
   Ukurra — Configuration
   Isi kredensial di bawah setelah membuat project Supabase.
   Selama masih placeholder, login Google tidak bisa dipakai sama
   sekali (tombolnya menampilkan pesan "belum dikonfigurasi").
   ═══════════════════════════════════════════════════════════════════ */

window.LM_CONFIG = {
  // ── Supabase (https://supabase.com → Project Settings → API) ──────
  SUPABASE_URL:      'https://kncxgifppwjtrnflradt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY3hnaWZwcHdqdHJuZmxyYWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NjczMTYsImV4cCI6MjEwOTA0MzMxNn0.umyubqAQgmRldFwk-7cZ5H0aKTQbyyCmJ7ndkdWGfeU',

  // ── Halaman pembayaran (Mayar.id) ──────────────────────────────────
  // Dua link terpisah — Mayar tidak membaca parameter ?plan= di URL,
  // jadi satu-satunya cara membedakan paket adalah produk/link itu sendiri.
  CHECKOUT_URL: 'https://ukurra.myr.id/pl/ukurra-standard-tahunan',
  CHECKOUT_URL_MONTHLY: 'https://ukurra.myr.id/pl/ukurra-standard-bulanan',

};

/* ═══════════════════════════════════════════════════════════════════
   DRONE DATABASE
   sw/sh = sensor width/height (mm), iw/ih = resolusi (px),
   fl = focal length (mm), battMin = menit terbang efektif per baterai.
   type menentukan format export: dji → KMZ (WPML), potensic → JSON.

   maxWp = batas waypoint per misi. Melebihinya membuat sebagian titik
   terakhir TIDAK diterbangkan — aplikasi penerbangnya menerima
   berkasnya, lalu diam-diam memotong sisanya, sehingga sebagian area
   tidak terfoto tanpa pesan galat apa pun.

   Angka 200 terkonfirmasi untuk Mavic 4 Pro di DJI Fly. Model lain
   memakai angka yang sama sebagai batas aman — tolong diverifikasi
   per model sebelum dijadikan janji ke pengguna.
   ═══════════════════════════════════════════════════════════════════ */

window.DRONES = {
  'DJI Lito X1':         {speed:12.7,sw:6.4,  sh:4.8,  iw:4056,ih:3040,fl:4.5, battMin:25,type:'dji',      mp:12,maxWp:200},
  'DJI Air 3':           {speed:12.7,sw:6.17, sh:4.63, iw:8064,ih:6048,fl:6.7, battMin:35,type:'dji',      mp:48,maxWp:200},
  'DJI Air 3S':          {speed:12.8,sw:13.2, sh:8.8,  iw:8192,ih:5464,fl:8.0, battMin:38,type:'dji',      mp:50,maxWp:200},
  'DJI Mavic 3':         {speed:12.8,sw:17.3, sh:13.0, iw:5280,ih:3956,fl:12.3,battMin:40,type:'dji',      mp:20,maxWp:200},
  'DJI Mavic 3 Classic': {speed:12.8,sw:17.3, sh:13.0, iw:5280,ih:3956,fl:12.3,battMin:40,type:'dji',      mp:20,maxWp:200},
  'DJI Mavic 3 Pro':     {speed:12.8,sw:17.3, sh:13.0, iw:5280,ih:3956,fl:12.3,battMin:40,type:'dji',      mp:20,maxWp:200},
  'DJI Mavic 4 Pro':     {speed:11.0,sw:17.3, sh:13.0, iw:8064,ih:6048,fl:12.5,battMin:40,type:'dji',      mp:100,maxWp:200},
  'DJI Mini 4 Pro':      {speed:12.7,sw:6.17, sh:4.63, iw:8064,ih:6048,fl:6.7, battMin:28,type:'dji',      mp:48,maxWp:200},
  'DJI Mini 5 Pro':      {speed:12.8,sw:6.17, sh:4.63, iw:8064,ih:6048,fl:6.7, battMin:30,type:'dji',      mp:50,maxWp:200},
  'Potensic Atom 2':     {speed:12.4,sw:4.51, sh:3.38, iw:4000,ih:3000,fl:4.0, battMin:22,type:'potensic', mp:12,maxWp:200},
  'Potensic Atom 3':     {speed:13.0,sw:4.51, sh:3.38, iw:4000,ih:3000,fl:4.0, battMin:25,type:'potensic', mp:12,maxWp:200},
};

/* ═══════════════════════════════════════════════════════════════════
   BASEMAP
   ═══════════════════════════════════════════════════════════════════ */

window.BASEMAPS = {
  sat:{
    name:'Satelit',
    url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:'&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom:21,
  },
  osm:{
    name:'Jalan',
    url:'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:'&copy; OpenStreetMap Contributors',
    maxZoom:19,
  },
};
