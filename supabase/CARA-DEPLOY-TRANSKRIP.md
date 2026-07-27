# Memasang transkrip otomatis

Tiga hal yang harus ada sebelum transkrip jalan: fungsinya ter-deploy, secretnya terisi,
dan ada yang membangunkannya secara berkala. Urutannya boleh apa saja, tetapi ketiganya
wajib. Kalau salah satu tertinggal, tidak ada yang meledak, antreannya cuma diam.

`00-jalankan-dulu.sql` dan `03-media-modul.sql` dianggap sudah dijalankan.

---

## Langkah 1 · Ambil kunci layanan transkrip

Tanpa kunci ini fungsinya menolak bekerja dan menjawab dengan daftar secret yang kurang,
jadi Anda tidak akan menebak-nebak kenapa diam.

Yang dipakai secara baku adalah Whisper dari OpenAI:

1. Buka `platform.openai.com`, masuk, lalu ke **API keys**
2. **Create new secret key**, salin nilainya sekarang juga karena tidak ditampilkan lagi
3. Pastikan akun itu punya saldo. Kunci tanpa saldo menjawab 429, dan fungsinya akan
   mencatat itu sebagai gagal beserta pesan aslinya

Layanan lain boleh dipakai tanpa mengubah kode, cukup ganti dua secret `STT_ENDPOINT`
dan `STT_MODEL` di Langkah 3.

---

## Langkah 2 · Deploy fungsinya

Ada dua jalan. Pilih salah satu.

### Jalan A · Lewat dashboard, tanpa memasang apa pun

Paling cepat kalau Anda cuma perlu ini jalan hari ini.

1. Buka **Edge Functions** di dashboard proyek Anda
2. **Deploy a new function** lalu pilih menulis langsung di editor
3. Namanya harus persis `transkrip`. Nama ini dipakai di URL, dan
   `04-jadwal-transkrip.sql` memanggil `/functions/v1/transkrip`
4. Hapus contoh yang muncul, tempel seluruh isi
   `supabase/functions/transkrip/index.ts`
5. **Deploy**

### Jalan B · Lewat CLI, kalau Anda ingin ini masuk repo

Sekali disiapkan, deploy berikutnya cuma satu perintah.

```bash
# pasang CLI
npm install -g supabase          # atau: brew install supabase/tap/supabase

# dari folder yang berisi map supabase/
supabase login                   # membuka peramban
supabase link --project-ref rbectkwpqpwdadrxcaob
supabase functions deploy transkrip
```

`--project-ref` adalah bagian pertama URL proyek Anda,
yaitu bagian sebelum `.supabase.co`.

---

## Langkah 3 · Isi secretnya

Lewat dashboard: **Edge Functions → Secrets**, lalu tambahkan satu per satu.
Lewat CLI: `supabase secrets set NAMA=nilai`.

| Nama | Isi | Wajib |
| --- | --- | --- |
| `STT_API_KEY` | kunci dari Langkah 1 | ya |
| `SB_SECRET_KEY` | kunci `sb_secret_...` dari **Settings → API Keys** | ya |
| `STT_ENDPOINT` | dibiarkan kosong berarti Whisper OpenAI | tidak |
| `STT_MODEL` | dibiarkan kosong berarti `whisper-1` | tidak |

`SB_SECRET_KEY` perlu diisi sendiri meskipun Supabase menyuntikkan
`SUPABASE_SERVICE_ROLE_KEY` otomatis. Alasannya: selama perpindahan dari kunci lama
ke kunci `sb_secret_`, yang disuntikkan bisa jadi kunci lama yang sudah Anda
nonaktifkan, dan gejalanya adalah 401 yang tidak menjelaskan apa pun. Fungsinya
membaca `SB_SECRET_KEY` lebih dulu, jadi mengisinya menutup seluruh kemungkinan itu.

**Jangan** menaruh kunci mana pun dari tabel ini di `assets/config.js` atau di berkas
lain yang ikut ke repo. Kunci `sb_secret_` melewati seluruh Row Level Security.

---

## Langkah 4 · Uji sekali dengan tangan

```bash
curl -X POST "https://rbectkwpqpwdadrxcaob.supabase.co/functions/v1/transkrip" \
  -H "Authorization: Bearer KUNCI_PUBLISHABLE_ANDA"
```

Yang mungkin Anda terima:

| Jawaban | Artinya |
| --- | --- |
| `{"ok":true,"dikerjakan":0,...}` | Fungsinya hidup, antreannya memang kosong. Ini hasil yang benar sebelum ada video diunggah |
| `{"ok":true,"dikerjakan":1,...}` | Satu berkas selesai. Cek `select status from public.transkrip` |
| `{"ok":false,"alasan":"Secret belum lengkap","kurang":[...]}` | Langkah 3 belum selesai, dan `kurang` menyebut mana yang belum |
| `401` | Header `Authorization` salah atau kuncinya bukan milik proyek ini |
| `404` | Nama fungsinya bukan `transkrip` |

---

## Langkah 5 · Jadwalkan

Buka `supabase/04-jadwal-transkrip.sql`, ganti dua nilai di blok SETTING, lalu jalankan
di SQL Editor. Berkas itu menolak jalan kalau Anda lupa menggantinya, jadi tidak ada
jadwal yang diam-diam menunjuk ke alamat contoh.

Setelah itu antreannya berjalan sendiri tiap menit, tiga berkas per panggilan.

---

## Kalau antreannya diam padahal ada video

Periksa berurutan, berhenti di yang pertama mencurigakan:

```sql
-- 1. apakah pekerjaannya memang ada
select status, count(*) from public.transkrip group by status;

-- 2. apakah ada yang gagal, dan apa alasannya
select m.nama_asli, t.galat, t.diperbarui
  from public.transkrip t join public.media m on m.id = t.media_id
 where t.status = 'gagal' order by t.diperbarui desc;

-- 3. apakah cron-nya benar-benar memanggil
select status, return_message, start_time
  from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'nusva-transkrip')
 order by start_time desc limit 20;
```

Baris yang macet di `diproses` berarti fungsinya berhenti di tengah, misalnya kena
batas waktu. Kembalikan ke antrean:

```sql
update public.transkrip set status = 'menunggu'
 where status = 'diproses' and diperbarui < now() - interval '15 minutes';
```

---

## Biayanya

Whisper sekitar 0,006 dolar per menit audio, sekali per berkas, bukan per penonton.
Seratus modul dengan rata-rata dua puluh menit video berarti sekitar dua ribu menit,
jadi kira-kira dua belas dolar untuk seluruh katalog itu.

Yang jauh lebih besar justru bandwidth pemutaran, karena ia naik mengikuti jumlah
penonton dan bukan jumlah modul. Itu perhitungan terpisah dan perlu diputuskan
sebelum penonton bertambah banyak, bukan sesudah.
