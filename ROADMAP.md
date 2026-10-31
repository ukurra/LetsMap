# Ukurra — Roadmap Produk & Bisnis

Dokumen kerja. Urutannya disusun supaya kamu tidak membangun hal yang belum
tentu dibeli orang.

---

## Model bisnis (final)

> **Catatan: harga di bawah ini sudah tidak dipakai di situs sungguhan.**
> `index.html` dan `DEPLOY.md` sekarang memakai dua paket — **Standard**
> Rp 599.000/tahun (atau Rp 69.000/bulan) dan **Organisasi**
> Rp 5.999.000/tahun — bukan satu paket "Ukurra Pro" seperti tertulis di
> bawah. Jatah uji coba gratis (2 misi, 1 proyek) di `quota.js` masih
> sama persis dengan yang direncanakan di sini. Bagian harga di bawah
> perlu ditulis ulang supaya cocok dengan dua paket itu — saya tidak
> menulis ulang sendiri karena ini keputusan bisnis, bukan sekadar
> perbaikan teknis.

Satu produk, satu harga, satu lisensi untuk web **dan** desktop.

```
UJI COBA GRATIS           sekali seumur akun, bukan per bulan
  Mission planner         2 misi
  Olah data               1 proyek

UKURRA PRO                web + desktop terbuka penuh
  Bulanan                 Rp    68.000 / bulan     ← harga yang diiklankan
  Tahunan                 Rp   680.000 / tahun     gratis 2 bulan
  Lifetime                Rp 1.990.000             50 kursi peluncuran, lalu ditutup
```

**Tanpa iklan sama sekali.** Pendapatannya hanya puluhan ribu rupiah per bulan,
sementara skrip AdSense memperlambat aplikasi dan membuat produk terasa
murahan — tepat saat kamu ingin menjual perangkat lunak jutaan rupiah.
Hosting sudah gratis di Cloudflare, jadi tidak ada yang perlu ditutup.

**Login hanya Google**, untuk web maupun desktop. Penetrasi Android di
Indonesia hampir total, jadi satu penyedia sudah cukup dan tidak perlu
mengurus reset password.

### Kenapa tahunan yang diandalkan

**QRIS tidak mendukung penagihan berulang.** Langganan bulanan di Indonesia
bocor karena pembayaran gagal, bukan karena pelanggan kecewa. Dengan paket
tahunan, 50 pelanggan cukup diurus lewat **50 email setahun sekali** — tidak
perlu membangun sistem tagihan berulang sama sekali di awal.

### Pembanding pasar

| Produk | Harga | Catatan |
|---|---|---|
| Agisoft Metashape Standard | ~Rp 2,9jt sekali bayar | **Tidak bisa** ekspor DEM/ortho berskala |
| Agisoft Metashape Pro | ~Rp 57jt sekali bayar | Setara fitur Ukurra Studio |
| Pix4Dmapper | ~Rp 5,7jt/bulan | |
| DroneDeploy | ~Rp 8jt/bulan | |
| Litchi (mission planner saja) | ~Rp 490rb sekali bayar | Pesaing langsung sisi misi |
| Jasa survei stockpile | Rp 3jt–15jt per lokasi | Yang dibayar klien pengguna kamu |

Rp 68rb/bulan itu **sekitar 1,2% dari harga Pix4D**, dan balik modal hanya dengan
satu pekerjaan survei. Harga semurah ini bagus untuk masuk pasar, tapi juga
menarik pengguna paling sensitif harga yang biasanya paling banyak minta
dukungan. **Naikkan setelah punya 3 studi kasus nyata** — menaikkan harga
selalu lebih sulit daripada menurunkan.

### Hitungan dengan 50 pelanggan

| Sumber | Setahun |
|---|---|
| 50 pelanggan bulanan | Rp 40,8jt |
| 50 pelanggan tahunan | Rp 34jt |
| 50 kursi lifetime peluncuran | Rp 99,5jt |

### Konsekuensi dari 2 misi seumur hidup

Mission planner jadi **demo**, bukan corong akuisisi. Setelah dua misi,
pengguna gratis tidak punya alasan kembali. Artinya kontenmu harus menjual
**pengolahan datanya** — volume, DSM, laporan — bukan pembuat misinya.
Sesuaikan judul video dan halaman arahan ke sana.

## Fase 0 — Persiapan (1–2 minggu)

- [ ] Beli **ukurra.com** dan **ukurra.id** (keduanya masih bebas per pengecekan terakhir)
- [ ] Cek merek di [pdki-indonesia.dgip.go.id](https://pdki-indonesia.dgip.go.id), lalu daftarkan kelas 9 (perangkat lunak) dan 42 (jasa TI) — sekitar Rp 1,8jt
- [ ] Amankan handle: `@ukurra` di YouTube, Instagram, TikTok, dan GitHub
- [ ] Isi `assets/js/config.js`: Supabase URL + anon key + CHECKOUT_URL
- [ ] Jalankan `supabase-schema.sql` di Supabase → SQL Editor (tabel profil, jatah, dan fungsi pemakaian)
- [ ] Deploy web ke Cloudflare Pages, pasang domain
- [ ] Aktifkan login Google di Supabase (hanya Google; penyedia lain tidak dipakai)
- [ ] Tulis halaman **Kebijakan Privasi** dan **Syarat Penggunaan** (wajib untuk OAuth Google)
- [ ] **Minta review hukum soal AGPL ODM** sebelum menjual apa pun — ini bukan hal yang bisa ditunda sampai sudah ada pembeli

**Keluaran fase ini:** web gratis bisa diakses publik di domain sendiri.

---

## Fase 1 — Soft launch & konten (minggu 3–8)

Belum jual apa-apa. Tujuannya satu: **bukti bahwa orang mau memakai.**

- [ ] Publikasikan mission planner, gratis tanpa batas
- [ ] Tambahkan **daftar tunggu desktop** di landing page — tombolnya sudah ada, tinggal sambungkan ke tabel Supabase
- [ ] Mulai posting konten (lihat bagian konten di bawah)
- [ ] Masuk komunitas: grup Facebook pilot drone Indonesia, forum DJI, subreddit r/drones, komunitas surveyor
- [ ] Bicara langsung dengan 10 pengguna pertama. Tanya pekerjaan mereka apa, dan apa yang bikin repot

**Target terukur:** 300 pengguna web · 50 email daftar tunggu · 10 percakapan

**Lampu merah:** kalau setelah 8 minggu daftar tunggunya di bawah 20 orang,
berhenti dulu. Masalahnya bukan di produk — pesanmu belum sampai ke orang yang
tepat. Perbaiki itu sebelum lanjut.

---

## Fase 2 — Beta desktop (bulan 3–4)

- [ ] Pilih **10–15 beta tester** dari daftar tunggu. Utamakan yang pekerjaannya
      memang butuh volume: kontraktor, tambang, quarry, konsultan survei
- [ ] Berikan gratis, dengan satu syarat: mereka mau dipanggil video 30 menit
- [ ] Perbaiki apa yang rusak dengan **data mereka yang sebenarnya** — ini jauh
      lebih berharga daripada menambah fitur
- [ ] Kumpulkan **3 studi kasus berangka**: "Stockpile 8.400 m³, diukur 40 menit,
      selisih 1,2% dari survei total station"

Studi kasus inilah barang jualanmu. Tanpa itu, harga berapa pun terasa mahal.

- [ ] Siapkan sistem lisensi (lihat bagian teknis di bawah)
- [ ] Selesaikan installer: nyalakan Developer Mode lalu `npm run build`

**Target:** 10 tester aktif · 3 studi kasus · installer jalan di komputer orang lain

---

## Fase 3 — Monetisasi (bulan 5–6)

- [ ] Buka **Early Bird Lifetime Rp 1.490.000**, dibatasi 50 kursi
- [ ] Pasang pembayaran. Untuk solo tanpa PT: **Mayar.id** atau **Lynk.id** —
      terima QRIS, e-wallet, transfer bank, potongan sekitar 2–5%.
      Naik ke **Midtrans** atau **Xendit** setelah punya badan usaha
- [ ] Umumkan ke daftar tunggu lebih dulu (mereka sudah hangat), baru ke publik
- [ ] Buat video peluncuran: masalah → demo → harga
- [ ] Beri beta tester lisensi lifetime gratis permanen. Mereka akan jadi
      pemasar paling jujurmu

**Target realistis:** 15–30 penjualan Early Bird = **Rp 22jt – 45jt**

---

## Fase 4 — Skala (bulan 7–12)

- [ ] Naikkan harga ke angka normal
- [ ] Tambah fitur berdasarkan permintaan yang **berulang**, bukan yang paling nyaring
- [ ] Jajaki lapis Enterprise untuk perusahaan
- [ ] Pertimbangkan pelatihan berbayar — di Indonesia, kelas sering lebih laku
      daripada perangkat lunaknya sendiri
- [ ] Rekrut bantuan untuk dukungan pengguna kalau sudah lewat ~100 pelanggan

---

## Roadmap konten

### Pembagian peran platform

| Platform | Peran | Format | Irama |
|---|---|---|---|
| **TikTok** | Jangkauan terluas | Vertikal 15–60 detik, hook 3 detik pertama | 4–5×/minggu |
| **Instagram Reels** | Sama + kredibilitas | Posting ulang TikTok tanpa watermark | 4–5×/minggu |
| **YouTube** | Kepercayaan & SEO | Tutorial 8–15 menit | 1×/minggu |
| **YouTube Shorts** | Daur ulang | Potongan dari video panjang | 3×/minggu |

Orang membeli dari YouTube, tapi menemukanmu dari TikTok. Keduanya perlu.

### Empat pilar konten

**1. Bukti hasil (paling mudah viral)**
Perlihatkan transformasinya, jangan jelaskan. Foto mentah → orthofoto →
angka volume muncul. Tanpa narasi panjang.

**2. Tutorial**
Ajarkan sampai tuntas, termasuk hal yang bisa dilakukan tanpa produkmu.
Kepercayaan dulu, jualan belakangan.

**3. Edukasi**
GSD, overlap, aturan penerbangan, kenapa ortho beda dari foto biasa.
Ini yang membuatmu dianggap paham, bukan sekadar jualan.

**4. Membangun di depan umum**
Progres, kegagalan, angka. Orang Indonesia suka mendukung pembuat lokal yang
terbuka. Ini juga membedakanmu dari perangkat lunak asing yang dingin.

### 20 ide video pertama

**Bukti hasil**
1. "Drone Rp 5 juta bisa ukur volume stockpile. Ini buktinya."
2. "200 foto jadi peta presisi dalam 40 menit"
3. "Beda orthofoto vs foto drone biasa — kenapa foto biasa tidak bisa dipakai ukur"
4. "Ukur volume timbunan tanpa turun ke lapangan"
5. "Hasil Ukurra vs ukur manual pakai meteran — selisihnya berapa?"

**Tutorial**
6. "Cara bikin misi mapping otomatis dari HP, 2 menit"
7. "Setting overlap yang benar untuk pemetaan (dan kenapa 75/75)"
8. "Cara pasang misi KMZ ke DJI Fly"
9. "Dari foto drone ke orthofoto, langkah demi langkah"
10. "Cara hitung volume stockpile batubara dari DEM"
11. "Ekspor peta ke format yang diterima konsultan"

**Edukasi**
12. "Apa itu GSD dan kenapa menentukan kualitas petamu"
13. "Aturan terbang drone di Indonesia yang wajib kamu tahu"
14. "DSM vs DTM — bedanya apa, pakai yang mana?"
15. "Kenapa foto drone biasa tidak bisa dipakai mengukur luas"
16. "5 kesalahan pemula saat mapping pakai drone"

**Membangun di depan umum**
17. "Saya bikin aplikasi mapping sendiri karena Agisoft harganya Rp 57 juta"
18. "Bulan pertama rilis: berapa pengguna, berapa pendapatan"
19. "Pengguna pertama saya minta fitur ini — saya bikin dalam 3 hari"
20. "Kenapa aplikasi ini gratis, dan bagaimana saya tetap bisa hidup"

### Pola yang berhasil di TikTok teknis

- **Hook 3 detik**: tunjukkan hasil akhirnya **dulu**, baru ceritakan caranya
- **Angka di judul**: "Rp 5 juta", "40 menit", "selisih 1,2%"
- **Satu video satu gagasan.** Jangan menjejalkan
- **Tulis teks di layar** — mayoritas menonton tanpa suara
- **Tutup dengan pertanyaan**, bukan dengan "link di bio". Komentar menaikkan jangkauan

### Lampu merah konten

Kalau setelah **30 video** belum ada satu pun yang tembus 10.000 tayangan,
masalahnya bukan algoritma. Kemungkinan besar kamu bicara ke sesama pembuat
aplikasi, bukan ke orang yang punya masalah mengukur lahan. Ubah sudutnya:
kurangi "aplikasi saya", perbanyak "masalah di lapangan".

---

## Yang masih harus dibangun

### Sudah dibangun

- `supabase-schema.sql` — tabel profil, jatah, dan fungsi pemakaian.
  Hitungan jatah ada di server, jadi menghapus data peramban tidak
  mereset uji coba.
- `assets/js/quota.js` — gerbang jatah, dipakai web dan nanti desktop
- `assets/js/upgrade.js` — ajakan berlangganan saat jatah habis

### Masih harus dibangun

1. ~~**Login Google di desktop.**~~ **Sudah dibangun** — `LetsMapApp/auth.js`
   (PKCE lewat browser sistem + protokol `ukurra://`, ditangani di
   `main.js`) dan antarmukanya di `renderer/akun.js`. Daftar ini ketinggalan
   zaman di poin ini; tinggal isi `config.js` dengan kredensial Supabase
   yang sama seperti web (lihat `DEPLOY.md` Tahap 5b).
2. ~~**Gerbang jatah di desktop**~~ **Sudah dibangun** — `auth.bolehOlah()`
   dicek sebelum pengolahan mulai, `auth.pakaiJatah()` dipanggil setelah
   selesai (`main.js`), batasnya 1 proyek (`BATAS_PROYEK` di `auth.js`).
   Sama seperti poin 1, tinggal menunggu kredensial Supabase terisi.
3. **Webhook pembayaran.** Untuk awal, jadikan akun Pro secara manual lewat
   SQL Editor (perintahnya ada di bagian bawah `supabase-schema.sql`).
   Otomatiskan setelah penjualan rutin. Ini satu-satunya dari ketiga poin
   yang benar-benar belum ada kodenya.

Jangan berlebihan soal proteksi. Yang terlalu ketat menyusahkan pembeli
jujur, sementara yang mau membajak tetap bisa. Cukup buat "mudah bayar,
agak repot kalau curang".

### Lain-lain

- [ ] Halaman harga di landing page
- [ ] Email onboarding setelah pembelian
- [ ] Dokumentasi pengguna (bisa dari README yang sudah ada)
- [ ] Saluran dukungan — WhatsApp Business cukup untuk awal

---

## Risiko yang perlu diawasi

| Risiko | Seberapa serius | Penanganan |
|---|---|---|
| **AGPL ODM** | Tinggi | Review hukum sebelum rupiah pertama masuk. Pola "panggil sebagai program terpisah" sudah dirancang untuk ini, tapi perlu dipastikan ahli |
| **WebODM gratis & open source** | Sedang | Pembedamu: pemasangan sekali klik, antarmuka ukur, bahasa Indonesia, dukungan nyata. Jual kemudahan, bukan mesinnya |
| **Beban dukungan pengguna** | Sedang | Fotogrametri sering gagal karena foto yang jelek. Siapkan panduan "syarat foto yang baik" sejak awal |
| **Pasar terlalu sempit** | Sedang | Diuji di Fase 1. Kalau daftar tunggu sepi, hentikan sebelum terlanjur jauh |
| **Agisoft/Pix4D turun harga** | Rendah | Mereka mengejar pasar perusahaan, bukan pilot consumer |

---

## Satu hal yang paling menentukan

Sebagian besar risiko di atas bisa diuji dengan murah di **Fase 1**: sebarkan
yang gratis, lihat apakah ada yang mendaftar untuk versi desktop.

Kalau 300 orang memakai mission planner dan hanya 5 yang mendaftar daftar
tunggu, kamu belum punya bisnis — kamu punya alat bantu yang menyenangkan.
Lebih baik tahu itu di bulan kedua daripada setelah setahun membangun.

Kalau 50 orang mendaftar, kamu punya bisnis. Lanjutkan.
