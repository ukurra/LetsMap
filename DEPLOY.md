# Ukurra — Panduan Deploy

Dari nol sampai bisa dipakai orang lain. Ikuti urutannya; tiap tahap
diakhiri sesuatu yang bisa dibuka dan dicek, jadi kalau macet jelas
macetnya di mana.

---

## Pilihan platform

| Kebutuhan | Platform | Biaya |
|---|---|---|
| Hosting web | **Cloudflare Pages** | Rp 0 — bandwidth tak terbatas |
| Login + database | **Supabase** (free tier) | Rp 0 — 50.000 pengguna aktif/bln |
| Domain | **Cloudflare Registrar** | ± Rp 165.000/tahun (harga modal, tanpa markup) |
| Simpan installer `.exe` | **Cloudflare R2** | Rp 0 — 10 GB, unduhan tidak ditagih |
| Pembayaran | **Lynk.id** atau **Mayar.id** | hanya potongan per transaksi |

**Total biaya tetap: ± Rp 165.000/tahun (± Rp 14.000/bulan).** Sisanya
nol sampai pemakaian benar-benar besar.

### Kenapa Cloudflare, bukan Vercel atau Netlify

Keduanya membatasi 100 GB bandwidth/bulan di paket gratis, dan paket
gratis Vercel secara resmi bukan untuk penggunaan komersial. Cloudflare
Pages memberi **bandwidth tak terbatas** dan mengizinkan komersial. Untuk
produk yang trafiknya didorong konten YouTube/TikTok, ini bedanya besar —
satu video viral tidak berubah jadi tagihan.

### Satu jebakan yang harus diketahui sekarang

Cloudflare Pages membatasi **tiap berkas maksimal 25 MiB**
([dokumen resmi](https://developers.cloudflare.com/pages/platform/limits)).
Installer Ukurra Studio jauh di atas itu, jadi **installer tidak boleh
ikut masuk repo web**. Tempatnya di R2 (Tahap 6). Kalau dipaksa, deploy
akan gagal dan penyebabnya tidak kelihatan jelas.

---

## Tahap 1 — Web hidup dulu (± 30 menit, gratis, belum pakai domain)

Tujuannya memastikan hosting jalan sebelum menyentuh login dan domain.

1. Buat akun di [github.com](https://github.com) dan
   [dash.cloudflare.com](https://dash.cloudflare.com).

2. Jadikan folder web ini repo Git lalu dorong ke GitHub. Jalankan di
   `C:\Users\zakiy\Downloads\Proj\LetsMap`:

   ```bash
   git init
   git add .
   git commit -m "Ukurra web — rilis awal"
   git branch -M main
   git remote add origin https://github.com/<akunmu>/ukurra-web.git
   git push -u origin main
   ```

   Repo ini aman dibuat publik: `config.js` hanya memuat *anon key*
   Supabase, yang memang dirancang untuk dipasang di sisi peramban dan
   dijaga oleh RLS. Yang tidak boleh ikut adalah *service role key* —
   dan itu tidak ada di repo ini.

3. Di Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**,
   pilih repo tadi.

4. Isi pengaturan build — ini penting, situs ini tanpa build step:

   | Kolom | Isi |
   |---|---|
   | Framework preset | `None` |
   | Build command | **kosongkan** |
   | Build output directory | `/` |

5. **Save and Deploy.** Satu-dua menit kemudian situs hidup di
   `https://<nama-proyek>.pages.dev`.

**Cek tahap ini:** buka alamat itu di HP. Landing page tampil, dan menu
peramban menawarkan *Add to Home screen*. Login belum jalan — itu normal,
aplikasi sedang di "mode tamu" karena `config.js` masih placeholder.

---

## Tahap 2 — Database dan jatah uji coba (± 20 menit)

1. Buat proyek di [supabase.com](https://supabase.com). Pilih region
   **Southeast Asia (Singapore)** — paling dekat ke Indonesia.

2. Buka **SQL Editor → New query**, tempel seluruh isi
   `supabase-schema.sql`, jalankan.

   Ini membuat tabel `profiles`, pemicu yang mengisi profil tiap kali ada
   pendaftar baru, dan fungsi `ukurra_use_quota()`. Jatah dihitung di
   server, bukan di peramban — jadi menghapus data peramban tidak
   mengembalikan jatah.

3. **Cek tahap ini:** di **Table Editor**, tabel `profiles` ada dan
   kolomnya lengkap (`plan`, `missions_used`, `projects_used`).

> Catatan free tier: proyek Supabase yang tidak disentuh selama 7 hari
> akan dijeda dan harus dibangunkan manual dari dashboard. Begitu ada
> pengguna sungguhan ini tidak akan terjadi, tapi selama masih sepi,
> sempatkan buka dashboard-nya sekali seminggu.

---

## Tahap 3 — Login Google (± 30 menit, paling banyak salah di sini)

Alurnya: peramban → Google → **Supabase** → kembali ke situsmu. Jadi yang
didaftarkan ke Google adalah alamat Supabase, bukan alamat situsmu. Ini
bagian yang paling sering tertukar.

1. Di [console.cloud.google.com](https://console.cloud.google.com), buat
   proyek baru bernama `Ukurra`.

2. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: `Ukurra`, email dukungan: emailmu
   - **Privacy Policy URL** dan **Terms of Service URL** — lihat catatan
     di bawah, dua halaman ini belum ada dan wajib diisi
   - Scope cukup `email`, `profile`, `openid` (tidak perlu review Google)

3. **Credentials → Create Credentials → OAuth client ID**:
   - Type: **Web application**
   - **Authorized redirect URIs** — isi **satu** baris ini saja:

     ```
     https://<ref-proyekmu>.supabase.co/auth/v1/callback
     ```

     `<ref-proyekmu>` ada di Supabase → Project Settings → API.

   Simpan **Client ID** dan **Client Secret**.

4. Di Supabase: **Authentication → Providers → Google**, aktifkan, tempel
   Client ID dan Secret, simpan.

5. Di Supabase: **Authentication → URL Configuration**:

   | Kolom | Isi |
   |---|---|
   | Site URL | `https://<nama-proyek>.pages.dev` |
   | Redirect URLs | `https://<nama-proyek>.pages.dev/**`<br>`ukurra://auth` |

   Baris `ukurra://auth` dipakai aplikasi desktop — tanpa itu, login di
   Ukurra Studio ditolak Supabase.

   Nanti setelah domain terpasang, **tambahkan** `https://ukurra.com/**`
   di sini. Langkah ini yang paling sering terlupa dan membuat login
   "berhasil tapi balik ke halaman kosong".

6. Isi `assets/js/config.js` — ambil keduanya dari Supabase → Project
   Settings → API:

   ```js
   SUPABASE_URL:      'https://<ref-proyekmu>.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```

7. Dorong perubahannya; Cloudflare otomatis deploy ulang:

   ```bash
   git add assets/js/config.js
   git commit -m "Sambungkan Supabase"
   git push
   ```

**Cek tahap ini:** buka situs, login dengan Google. Setelah itu di
Supabase → Table Editor → `profiles` harus muncul satu baris berisi
emailmu, `plan = free`, `missions_used = 0`. Ekspor satu misi, muat ulang
halaman, angka itu jadi `1`. Kalau bertambah, jatah server bekerja.

---

## Tahap 4 — Domain (± 20 menit, ini pengeluaran pertama)

1. Di Cloudflare: **Domain Registration → Register Domain**, cari
   `ukurra.com`. Cloudflare menjual di harga modal, biasanya yang
   termurah. Untuk `.id` Cloudflare tidak menjual — pakai registrar
   Indonesia seperti Domainesia atau Rumahweb, lalu arahkan
   nameserver-nya ke Cloudflare.

2. **Workers & Pages → proyekmu → Custom domains → Set up a custom
   domain**, masukkan `ukurra.com`. Kalau domain dibeli di Cloudflare,
   DNS dan HTTPS terpasang sendiri.

3. **Kembali ke Supabase → Authentication → URL Configuration**, ubah
   Site URL ke `https://ukurra.com` dan tambahkan `https://ukurra.com/**`
   ke Redirect URLs. Tanpa ini, login di domain baru akan gagal.

**Cek tahap ini:** `https://ukurra.com` terbuka dengan kunci HTTPS, dan
login Google masih jalan dari alamat baru.

---

## Tahap 5 — Pembayaran (± 30 menit)

> **Catatan koreksi:** versi lama tahap ini menyebut satu paket "Ukurra
> Pro" (68rb/bln, 680rb/thn, lifetime 1,99jt). Harga itu sudah tidak
> dipakai — situsnya sekarang dua paket: **Standard** (swalayan, lewat
> checkout) dan **Organisasi** (lewat kontak manual, bukan checkout).
> Tahap ini ditulis ulang mengikuti kondisi sekarang.

Keduanya menerima akun perorangan tanpa PT dan sudah mendukung QRIS,
transfer bank, dan e-wallet:

- **[Lynk.id](https://lynk.id)** — paling cepat disiapkan. Buat produk
  digital, dapat tautan, tempel ke `CHECKOUT_URL`. Cocok untuk memulai.
- **[Mayar.id](https://mayar.id)** — ada webhook, jadi status Pro bisa
  aktif otomatis setelah bayar. Pilih ini kalau sudah mulai ramai.

Potongan per transaksi berubah-ubah dan saya tidak menemukan angka
resminya, jadi **cek sendiri halaman harga masing-masing sebelum
memutuskan**.

**Hanya paket Standard yang butuh produk checkout.** Paket Organisasi
dijual lewat tombol "Hubungi Kami" (`mailto:haloukurra@gmail.com`) di
`index.html` — tidak ada pembayaran swalayan untuk itu, jadi tidak perlu
dibuatkan produk di Lynk/Mayar.

Buat **dua produk digital terpisah** untuk Standard — satu per siklus
tagihan, karena Lynk.id/Mayar.id tidak membaca parameter `?plan=` yang
dikirim situs ini (parameter itu hanya untuk catatanmu sendiri, bukan
sesuatu yang diproses otomatis oleh penyedia pembayaran):

| Produk | Harga |
|---|---|
| Ukurra Standard — Tahunan | Rp 599.000 |
| Ukurra Standard — Bulanan | Rp 69.000 |

Tempel tautan produk **Tahunan** (yang ditonjolkan di antarmuka) sebagai
`CHECKOUT_URL` di `config.js`:

```js
CHECKOUT_URL: 'https://lynk.id/<akunmu>/ukurra-standard-tahunan',
```

Kalau nanti webhook/otomatisasi dibangun, baru perlu membedakan produk
Tahunan vs Bulanan dari sisi penyedia pembayaran itu sendiri (nama
produk atau nominal), karena `?plan=` di URL tidak bisa dipakai untuk
itu — ingat ini saat menulis logika webhooknya nanti.

### Mengaktifkan Pro secara manual

Sampai webhook dibuat, aktifkan sendiri setelah pembayaran masuk. Di
Supabase → SQL Editor:

```sql
-- Bulanan
update public.profiles
   set plan = 'pro', pro_until = now() + interval '1 month'
 where email = 'pembeli@contoh.com';

-- Tahunan
update public.profiles
   set plan = 'pro', pro_until = now() + interval '1 year'
 where email = 'pembeli@contoh.com';

-- Lifetime (pro_until null = tanpa batas waktu)
update public.profiles
   set plan = 'pro', pro_until = null
 where email = 'pembeli@contoh.com';
```

Untuk 50 pembeli pertama cara ini masih masuk akal dan tidak perlu kode
tambahan. Di atas itu, baru pasang webhook Mayar.

---

## Tahap 5b — Menyambungkan aplikasi desktop

Ukurra Studio memakai akun Google yang sama, supaya jatah uji coba tidak
bisa diulang dengan berpindah aplikasi.

1. Buka `LetsMapApp/config.js` dan isi dengan nilai yang **sama persis**
   seperti di web:

   ```js
   SUPABASE_URL: 'https://<ref-proyekmu>.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   CHECKOUT_URL: 'https://lynk.id/<akunmu>/ukurra-pro',
   ```

2. Pastikan `ukurra://auth` sudah ada di Redirect URLs Supabase
   (Tahap 3 langkah 5).

3. Bangun ulang installer-nya agar `config.js` yang terisi ikut terpaket.

**Cek tahap ini:** buka Ukurra Studio, klik **Masuk dengan Google**.
Peramban terbuka, setelah menyetujui, jendela aplikasi kembali ke depan
dan pil di kanan atas berisi namamu. Olah satu proyek sampai selesai,
lalu lihat di Supabase → `profiles`: `projects_used` jadi `1`. Coba olah
lagi — ajakan berlangganan harus muncul.

> Selama `config.js` masih placeholder, aplikasi berjalan tanpa login dan
> tanpa batas. Ini sengaja, supaya bisa dikembangkan tanpa backend — tapi
> berarti installer yang dibagikan **harus** sudah terisi.

---

## Tahap 6 — Membagikan installer desktop

Ukuran yang sudah terukur di mesin ini: aplikasi Ukurra Studio **487 MB**
dan OpenDroneMap **1,1 GB** setelah terpasang. Installer gabungannya,
setelah dikompres NSIS, kira-kira 600–800 MB — jadi jauh di atas batas
25 MiB Cloudflare Pages. Dua pilihan:

**Cloudflare R2 — pilihan utama.** 10 GB gratis (cukup untuk beberapa
versi), dan yang menentukan: **unduhan tidak ditagih**. Dengan installer
± 700 MB, 100 pengunduh saja sudah 70 GB trafik. Di penyimpanan objek
lain angka itu berbiaya; di R2 nol.

1. Cloudflare → **R2 → Create bucket**, nama `ukurra-rilis`.
2. Unggah `Ukurra-Studio-Setup.exe`.
3. **Settings → Public access → Connect custom domain**, pakai
   `unduh.ukurra.com`.
4. Tautan unduhannya jadi
   `https://unduh.ukurra.com/Ukurra-Studio-Setup.exe`.

**Tombol di landing page sudah dipasang**, mengarah persis ke tautan di
atas (bagian `#desktop`, tombol "Unduh Ukurra Studio" di sebelah "Lihat
Paket & Harga"). Sebelum bucket R2 dan `unduh.ukurra.com` beres, tombol
itu akan 404 — tidak perlu sentuh kode lagi, cukup selesaikan 4 langkah
di atas dan tautannya langsung hidup.

Unduhannya sengaja **tidak dikunci di balik pembayaran** — siapa pun
boleh mengunduh dan mencoba. Batas 1 proyek olah data gratis sudah
ditegakkan di dalam aplikasi sendiri lewat akun Google + Supabase
(Tahap 5b), jadi mengunci tautan unduhannya hanya akan menyusahkan
pengguna sah tanpa benar-benar mencegah pembajakan.

**GitHub Releases** juga gratis dan tanpa batas bandwidth, tapi tautannya
selalu publik — kurang pas untuk produk berbayar.

Untuk awal, kirim tautan R2 lewat email ke pembeli. Tautan bisa bocor,
tapi aktivasi Pro tetap dicek lewat login Google di aplikasinya, jadi
installer yang bocor tidak otomatis jadi pemakaian gratis. Membangun
unduhan ber-token bisa menyusul.

---

## Yang masih menghalangi peluncuran

Tiga hal ini belum ada dan tidak bisa dilewati:

1. **Halaman Kebijakan Privasi dan Syarat Penggunaan.** Google OAuth
   mewajibkan kedua URL ini di consent screen. Belum ada
   `privacy.html` / `terms.html` di proyek ini. Selama belum dipasang,
   OAuth hanya bisa jalan di mode *Testing* — maksimal 100 akun penguji
   yang harus didaftarkan satu-satu.

2. **Login Google di aplikasi desktop.** Belum dibuat. Harus lewat
   peramban sistem plus protokol `ukurra://`, karena Google menolak
   OAuth di dalam webview aplikasi. Tanpa ini, batas 1 proyek olah data
   tidak bisa ditegakkan di desktop.

3. **Tinjauan hukum lisensi AGPL OpenDroneMap.** ODM berlisensi
   AGPL-3.0. Menjual produk yang memuatnya punya konsekuensi yang perlu
   dipastikan dulu — ini jangan ditunda sampai sudah ada pembeli.

Tahap 1–4 bisa dikerjakan sekarang tanpa menunggu ketiganya; hasilnya web
gratis yang sudah hidup di domain sendiri.
