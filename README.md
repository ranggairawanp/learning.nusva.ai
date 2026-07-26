# learning.nusva.ai

Front end Nusva Learning. Situs statis, tanpa langkah build, siap di-deploy ke Vercel.
Autentikasi dan data memakai Supabase.

## Isi repo

```
index.html              Landing utama, untuk semua orang yang membuka learning.nusva.ai
masuk.html              Masuk dengan Google atau daftar dengan email, sadar peran learner atau trainer
belajar.html            Beranda learner: Daily Recall, modul saya, progres, katalog
modul.html              Detail modul. Terbuka tanpa akun; bagian bertanda gratis bisa dibuka
perusahaan.html         Untuk pembeli korporat: pemetaan jabatan, kisaran biaya, formulir Bicara untuk tim
dokumen.html            Sertifikat, Paket Bukti Karya, beda Complete dan Kompeten, privasi, posisi produk
trainer.html            Halaman trainer, deck tujuh panel
trainer/modul.html       Alur penyiapan modul, empat langkah sampai gerbang terbit, autosave draf
trainer/dashboard.html  Dashboard trainer: pencairan, sinyal mutu, wawasan peserta
assets/nusva.css        Token dan komponen bersama
assets/app.js           Tema, bahasa, format lokal, sesi Supabase
assets/trainer.js       Bar atas trainer, foto, registry SKKNI, autosave draf
assets/registry/        Registry SKKNI per bidang, diambil hanya saat bidangnya dipilih
assets/nav.js           Navigasi bersama: bar tipis, mega menu, rail thumbnail
assets/sampul.js        Pembangkit sampul modul dan ikon berkas saat gambar belum diunggah
assets/foto/            Tujuh foto WebP: hero beranda, hero trainer, artefak, dan 4 sampul modul
assets/vendor/          supabase-js ter-vendor, bukan dari CDN pihak ketiga
supabase/*.sql          Skema, registry, draf, dan Row Level Security
vercel.json             Clean URL dan header keamanan
```

## Urutan menjalankan SQL

Cukup dua kali tempel di SQL Editor Supabase:

1. `supabase/00-jalankan-dulu.sql` gabungan skema aplikasi, registry, dan draf, dalam urutan yang benar
2. `supabase/seed-registry.sql` isi registry, 165 unit dan 1.019 KUK, dipisah karena besar
3. `supabase/02-permintaan-tim.sql` tabel penampung formulir Bicara untuk tim di `perusahaan.html`

Nomor 3 opsional dan bisa menunggu. Selama belum dijalankan, formulirnya tetap berfungsi tetapi
jatuh ke jalur cadangan berupa aplikasi email dengan isian yang sudah tersusun, jadi tidak ada
permintaan yang hilang diam-diam. Tabel itu sengaja **tidak punya policy select**: siapa pun boleh
mengirim, tidak seorang pun boleh membaca lewat API publik. Tanpa itu, satu kunci publishable cukup
untuk mengunduh seluruh daftar prospek Anda beserta nomor teleponnya.

Sesudahnya, jalankan `supabase/99-cek.sql` untuk memastikan RLS aktif di semua tabel, fungsi penjaga
akses lengkap, trigger profil terpasang, dan registry terisi 165 unit serta 1.019 KUK.

Berkas aslinya tetap ada (`schema.sql`, `schema-registry.sql`, `schema-draft.sql`) untuk dibaca per bagian.
Semuanya aman diulang.

**Jangan jalankan di database yang sudah punya tabel bernama `modules` atau `lessons` dengan arti
berbeda.** `create table if not exists` akan dilewati diam-diam dan foreign key akan menempel ke tabel
yang salah. Itu kerusakan yang tidak memunculkan pesan error. Jalankan hanya di proyek bersih.

Sampai langkah 1 dan 2 dijalankan, alur modul memakai berkas cadangan di `assets/registry/`,
jadi situsnya tetap berfungsi.

## Cara deploy

**1. Unggah ke GitHub.** Buka <https://github.com/ranggairawanp/learning.nusva.ai/upload>, seret seluruh isi
folder ini (bukan foldernya, isinya), lalu commit ke branch `main`.

**2. Import ke Vercel.** Buka halaman import, pilih repo `learning.nusva.ai`. Vercel akan mendeteksi
situs statis, jadi biarkan Framework Preset pada **Other**, Build Command kosong, dan Output Directory kosong.
Klik Deploy.

**3. Pasang domain.** Di Vercel, Settings lalu Domains, tambahkan `learning.nusva.ai`, lalu ikuti
petunjuk DNS-nya di penyedia domain nusva.ai.

## Menyalakan Supabase

**1. Jalankan skema.** Ikuti urutan SQL di atas. Sudah dijalankan pada proyek berjalan, dan
`99-cek.sql` melaporkan tujuh baris LULUS.

**2. Nyalakan Google.** Authentication lalu Providers lalu Google. Isi Client ID dan Client Secret dari
Google Cloud Console. Di Google Cloud, Authorized redirect URI-nya adalah:

```
https://rbectkwpqpwdadrxcaob.supabase.co/auth/v1/callback
```

**3. Daftarkan URL situs.** Authentication lalu URL Configuration:

* Site URL: `https://learning.nusva.ai`
* Redirect URLs: tambahkan `https://learning.nusva.ai/**` dan, selama masih menguji,
  URL pratinjau Vercel serta `http://localhost:*/**`.

Tanpa langkah ini, tautan masuk lewat email akan mengarah balik ke tempat yang salah.

**4. Email.** Untuk pengujian, pengirim bawaan Supabase sudah cukup tetapi berkuota kecil.
Sebelum dibuka ke publik, pasang SMTP sendiri di Authentication lalu Emails.

## Soal kunci

`assets/config.js` memuat **publishable key**, dan kunci jenis itu memang dirancang untuk tampil di
sisi klien. Yang menjaga data adalah Row Level Security di `supabase/schema.sql`, bukan kerahasiaan
kuncinya. Karena itu satu aturan berlaku mutlak:

> Jangan pernah menaruh `service_role` atau secret key di repo ini, di `config.js`, atau di berkas apa
> pun yang terkirim ke browser. Kunci itu melewati seluruh RLS.

Pekerjaan yang butuh service_role, misalnya menandai pembelian menjadi lunas dari webhook Xendit,
harus berjalan di sisi server, sebagai Edge Function Supabase atau Serverless Function Vercel, dengan
kuncinya disimpan sebagai environment variable, bukan di repo.

## Yang sudah jalan dan yang belum

Sudah jalan: landing utama beserta katalog, halaman masuk dengan Google dan tautan email, halaman
detail modul dengan bagian gratis yang bisa dibuka tanpa akun, gerbang masuk saat mulai belajar,
alur trainer empat langkah sampai gerbang terbit, dashboard trainer, tema terang dan gelap, dan
toggle bahasa Indonesia dan Inggris.

Belum jalan: pembayaran Xendit, penulisan modul dari alur trainer ke tabel Supabase, mesin rubrik,
dan penerbitan sertifikat.

Perlu diketahui satu hal soal `assets/config.js`: berkas itu **wajib dimuat lewat tag script biasa di
`<head>` setiap halaman**, sebelum modul mana pun. Kalau tidak, `window.NUSVA` kosong, seluruh lapisan
Supabase mati tanpa satu pun pesan error, dan tombol Masuk cuma menjawab "Supabase belum
dikonfigurasi". Halaman baru harus ikut memasangnya. Katalog di halaman utama masih memakai data contoh di `assets/app.js`,
dan tinggal ditukar ke query Supabase begitu tabel `modules` terisi.

## Aturan yang mengikat isi

Seluruh halaman terikat Nusva Learning Design System dan matriks bahasa klaim di PRD:
Nusva melatih dan tidak menyertifikasi, kata "kompeten" dan "sertifikasi" tidak dipakai untuk peserta,
angka seribu ke atas memakai pemisah titik, data sensitif tersamar secara bawaan, dan tidak ada
streak, poin, papan peringkat, atau hitung mundur di permukaan mana pun.

PT Nusva Digital Talenta.
