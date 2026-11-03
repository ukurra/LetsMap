/* ═══════════════════════════════════════════════════════════════════
   Ukurra — Service Worker

   • App shell  : cache-first, diperbarui di belakang layar
   • CDN assets : stale-while-revalidate
   • Tile peta  : cache-first dengan batas jumlah (biar hemat storage)
   • Nominatim  : selalu online, tidak pernah di-cache
   ═══════════════════════════════════════════════════════════════════ */

const VERSION = 'v24';
const SHELL = `ukurra-shell-${VERSION}`;
const VENDOR = `ukurra-vendor-${VERSION}`;
const TILES = `ukurra-tiles-${VERSION}`;

const TILE_LIMIT = 600;

/* Cloudflare Pages mengarahkan "/app.html" → "/app" (307), diam-diam
   diikuti oleh fetch(). Respons hasil pengalihan itu TIDAK BOLEH
   disajikan langsung untuk FetchEvent navigasi — Chrome menolaknya
   ("a redirected response was used for a request whose redirect mode
   is not follow"), situs pun gagal total saat dibuka dari cache SW.
   Dibuat ulang jadi Response segar (tanpa status "redirected") sebelum
   disimpan atau dipakai menjawab permintaan. */
async function bersihkanRedirect(res) {
  if (!res || !res.redirected) return res;
  const body = await res.clone().blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

const SHELL_FILES = [
  './',
  './index.html',
  './app.html',
  './manifest.webmanifest',
  './assets/css/theme.css',
  './assets/css/landing.css',
  './assets/css/app.css',
  './assets/js/i18n.js',
  './assets/js/config.js',
  './assets/js/auth.js',
  './assets/js/pwa.js',
  './assets/js/landing.js',
  './assets/js/quota.js',
  './assets/js/upgrade.js',
  './assets/js/vertex-tools.js',
  './assets/js/app.js',
  './assets/icons/favicon-32.png',
  './assets/icons/icon-192.png',
  './assets/icons/logo.png',
];

/* icon-512.png SENGAJA tidak ada di daftar ini.
   Berkasnya 278 KB dan hanya dipakai saat aplikasi dipasang ke layar
   depan serta untuk layar pembuka — bukan untuk membuka halamannya.
   Dulu ia ikut diunduh setiap pengunjung pertama kali datang, padahal
   kebanyakan belum tentu memasang. Kalau nanti dibutuhkan, ia tetap
   terambil lewat jaringan dan masuk cache runtime seperti berkas lain. */

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      // Per-file (bukan addAll) supaya satu berkas meleset tidak menggagalkan semua.
      // fetch() manual (bukan c.add) karena responsnya perlu dibersihkan dari
      // status "redirected" sebelum disimpan — lihat bersihkanRedirect().
      .then((c) =>
        Promise.all(
          SHELL_FILES.map((f) =>
            fetch(f)
              .then(bersihkanRedirect)
              .then((res) => (res && res.ok ? c.put(f, res) : null))
              .catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('ukurra-') && ![SHELL, VENDOR, TILES].includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Buang entri tercoret kalau cache tile sudah kepenuhan. */
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

const isTile = (url) =>
  url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('server.arcgisonline.com');

const isVendor = (url) =>
  url.hostname.includes('cdnjs.cloudflare.com') ||
  url.hostname.includes('cdn.jsdelivr.net') ||
  url.hostname.includes('fonts.googleapis.com') ||
  url.hostname.includes('fonts.gstatic.com');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Pencarian lokasi harus selalu segar.
  if (
    url.hostname.includes('nominatim.openstreetmap.org') ||
    url.hostname.includes('supabase.co')
  ) {
    return;
  }

  // ── tiles: cache-first, isi cache di belakang layar ──
  if (isTile(url)) {
    e.respondWith(
      caches.open(TILES).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) {
            cache.put(req, res.clone());
            trimCache(TILES, TILE_LIMIT);
          }
          return res;
        } catch {
          return new Response('', { status: 504 });
        }
      })
    );
    return;
  }

  // ── vendor CDN: stale-while-revalidate ──
  if (isVendor(url)) {
    e.respondWith(
      caches.open(VENDOR).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // ── app shell: cache-first dengan refresh diam-diam ──
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const hit = await cache.match(req, { ignoreSearch: true });
        const net = fetch(req)
          .then(bersihkanRedirect)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit || cache.match('./app.html'));
        return hit || net;
      })
    );
  }
});
