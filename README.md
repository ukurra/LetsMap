# Ukurra

Perencana misi pemetaan drone berbasis web. Gambar area survei, atur parameter,
lalu ekspor jalur terbang ke **KMZ (WPML)** untuk DJI atau **JSON** untuk Potensic.

Situs statis murni — tidak ada server yang perlu dijalankan.

---

## Struktur

```
Ukurra/
├── index.html                 Landing page (pengenalan + login)
├── app.html                   Mission planner
├── manifest.webmanifest       Manifest PWA
├── sw.js                      Service worker (offline + cache tile peta)
├── _headers                   Header Cloudflare Pages
└── assets/
    ├── css/  theme.css · landing.css · app.css
    ├── js/   config.js · auth.js · ads.js · landing.js · app.js
    └── icons/ icon-192.png · icon-512.png · icon-maskable-512.png
```

Semua kredensial ada di satu tempat: **`assets/js/config.js`**.

---

## Menjalankan di komputer sendiri

Service worker dan login butuh HTTP, tidak bisa dibuka lewat `file://`.

```bash
cd Ukurra
python -m http.server 8123
```

Buka `http://127.0.0.1:8123`.

Selama `config.js` masih berisi placeholder, aplikasi berjalan di **mode tamu** —
tombol "Coba Dulu Tanpa Akun" langsung masuk tanpa backend, dan slot iklan tampil
sebagai kotak kosong. Jadi bisa dites sekarang juga.

---

## Stack & biaya

| Kebutuhan | Layanan | Batas gratis | Biaya |
|---|---|---|---|
| Hosting | Cloudflare Pages | Bandwidth tak terbatas | Rp 0 |
| Login Google/Facebook | Supabase Auth | 50.000 pengguna aktif/bulan | Rp 0 |
| Database misi | Supabase Postgres | 500 MB | Rp 0 |
| Peta | OpenStreetMap + Esri | — | Rp 0 |
| Iklan | Google AdSense | — | menghasilkan |
| Domain | Niagahoster/Cloudflare | — | ~Rp 180rb/th (`.com`) |

Alternatif setara: **Netlify** atau **Vercel** untuk hosting, **Firebase Auth**
untuk login. Cloudflare Pages dipilih karena bandwidth-nya tidak dibatasi —
penting kalau nanti banyak yang memuat tile peta.

---

## 1. Deploy ke Cloudflare Pages

1. Push folder ini ke repository GitHub.
2. Buka **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git**.
3. Pilih repository, lalu isi:
   - Framework preset: **None**
   - Build command: *(kosongkan)*
   - Build output directory: **`/`**
4. **Save and Deploy.** Situs langsung aktif di `namaproyek.pages.dev`.
5. Domain sendiri: tab **Custom domains → Set up a domain**. SSL otomatis.

Setiap `git push` akan men-deploy ulang sendiri.

---

## 2. Login Google & Facebook (Supabase)

1. Buat project di [supabase.com](https://supabase.com) (region **Southeast Asia (Singapore)**
   paling dekat untuk pengguna Indonesia).
2. **Project Settings → API**, salin `Project URL` dan `anon public key`
   ke `assets/js/config.js`:

   ```js
   SUPABASE_URL:      'https://xxxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   ```

   Kunci `anon` memang aman ditaruh di kode frontend — keamanan datanya diatur
   lewat Row Level Security di Supabase, bukan dengan menyembunyikan kunci ini.

3. **Authentication → Providers → Google**: aktifkan, lalu isi Client ID & Secret
   dari [Google Cloud Console](https://console.cloud.google.com) (APIs & Services →
   Credentials → OAuth client ID → Web application).
   Authorized redirect URI yang harus didaftarkan di Google:

   ```
   https://xxxxx.supabase.co/auth/v1/callback
   ```

4. **Authentication → Providers → Facebook**: aktifkan, isi App ID & App Secret dari
   [developers.facebook.com](https://developers.facebook.com). Redirect URI-nya sama
   seperti di atas.

5. **Authentication → URL Configuration**, tambahkan domain kamu ke
   *Site URL* dan *Redirect URLs*:

   ```
   https://ukurra.pages.dev/app.html
   http://127.0.0.1:8123/app.html
   ```

   Kalau langkah ini terlewat, login akan berhasil tapi pengguna dilempar balik ke
   halaman kosong.

### Menyimpan misi pengguna (opsional)

Jalankan di **SQL Editor** Supabase:

```sql
create table missions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  drone       text not null,
  params      jsonb not null,
  polygon     jsonb not null,
  created_at  timestamptz default now()
);

alter table missions enable row level security;

create policy "pengguna hanya melihat misinya sendiri"
  on missions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Client-nya sudah tersedia lewat `LMAuth.db` di `assets/js/auth.js`.

---

## 3. Iklan (AdSense)

Isi di `assets/js/config.js`:

```js
ADSENSE_CLIENT:      'ca-pub-0000000000000000',
ADSENSE_SLOT_FOOTER: '1234567890',
ADSENSE_SLOT_EXPORT: '0987654321',
```

Dua penempatan yang sudah tersedia:
- **Footer landing page** — banner responsif.
- **Sebelum ekspor** — interstitial dengan hitung mundur
  (`EXPORT_AD_SECONDS`, default 6 detik), lalu unduhan jalan otomatis.

> ### Penting soal kebijakan AdSense
>
> AdSense **melarang incentivized ads** — yaitu mewajibkan pengguna menonton iklan
> untuk membuka fitur. Karena itu modal ekspor di sini sengaja dibuat sebagai
> *interstitial*: iklan tampil sebentar, unduhan tetap berjalan sendiri, dan
> pengguna bisa menutupnya. Kalau diubah jadi benar-benar mengunci tombol unduh,
> akun AdSense berisiko disetop.
>
> Kalau memang ingin pola **tonton-iklan-dapat-hadiah** yang sah, pilihannya:
> - **AdSense H5 Games Ads** — satu-satunya rewarded ads resmi Google untuk web,
>   tapi perlu pengajuan khusus.
> - Jaringan lain seperti Adsterra atau PropellerAds yang mengizinkan rewarded ads.
>
> AdSense juga baru menyetujui situs yang sudah punya konten memadai, jadi daftarkan
> setelah situsnya live dan ada trafik.

---

## 4. PWA

Sudah siap pakai: manifest, service worker, dan ikon maskable lengkap.

- **Android/Chrome** — muncul tawaran "Tambahkan ke layar utama" sendiri.
- **iOS/Safari** — Bagikan → "Tambahkan ke Layar Utama".

Service worker menyimpan app shell dan hingga **600 tile peta**, jadi area yang
sudah pernah dibuka tetap terlihat walau sinyal hilang di lapangan.

Setelah mengubah file di `assets/`, naikkan `VERSION` di `sw.js` supaya pengguna
lama mendapat versi baru:

```js
const VERSION = 'v2';
```

---

## Catatan

- **Mode tamu** hanya untuk uji coba — datanya di `localStorage`, tidak tersimpan
  di server dan hilang kalau browser dibersihkan.
- **Pencarian lokasi** memakai Nominatim OpenStreetMap. Gratis, tapi ada batas
  wajar ~1 permintaan/detik. Kalau nanti ramai, pertimbangkan pindah ke
  Photon atau Mapbox Geocoding.
- **Tile Esri** dipakai lewat endpoint publik. Untuk penggunaan komersial serius,
  sebaiknya daftar ArcGIS atau pindah ke Mapbox/MapTiler.
- Folder `UkurraApp/` adalah rintisan aplikasi desktop (pengolahan fotogrametri
  Agisoft Metashape) yang ditunda — tidak ikut ter-deploy dan tidak terhubung
  dengan web ini. Landing page hanya menampilkannya sebagai "Segera Hadir".
