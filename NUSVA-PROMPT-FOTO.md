# Nusva Learning · kebutuhan gambar dan prompt siap tempel

26 Juli 2026 · untuk DALL-E, Midjourney, atau Firefly.

> **Status: ketujuh gambar sudah diproduksi dan terpasang di repo.** Semuanya dikonversi ke WebP
> dan berada di `assets/foto/`. Dokumen ini disimpan sebagai catatan sumber, supaya kalau nanti ada
> modul baru, sampulnya bisa dibuat dengan bahasa visual yang sama. Rincian pemasangannya ada di
> bagian akhir.

---

## Jawab dulu: butuh foto atau tidak

**Butuh, tapi jauh lebih sedikit dari yang biasanya orang kira, dan bukan jenis yang biasa dipakai.**

Rasa Apple datang dari empat hal, dan hanya satu di antaranya fotografi:

1. Ruang kosong yang berani dan grid yang disiplin
2. Tipografi besar dengan tracking rapat dan kalimat pendek
3. Satu subjek per blok, difoto di latar putih bersih
4. Menu yang menyembunyikan kerumitan sampai diminta

Nomor 1, 2, dan 4 sudah terpasang di situs. Nomor 3 adalah masalahnya, karena **Apple punya benda dan Nusva tidak.**

Yang paling sering dilakukan orang di posisi ini adalah menempelkan foto stok orang kantoran tersenyum di depan laptop. Itu justru menurunkan kredibilitas, karena pembaca sudah melihat foto yang sama di ratusan situs lain, dan ia membaca sebagai "produk ini belum punya apa-apa untuk ditunjukkan".

**Pengganti yang benar untuk produk Nusva adalah hasil kerjanya.** Yang membedakan Nusva bukan orangnya, melainkan artefak yang dihasilkan peserta: satu uraian jabatan yang tersusun, satu perhitungan beban kerja yang bisa dipertahankan di depan direksi. Itu yang layak difoto besar-besar di latar putih, persis seperti Apple memotret iPhone.

Urutan prioritas saya:

| Prioritas | Gambar | Kenapa |
| --- | --- | --- |
| **Wajib** | 4 sampul modul | Katalog tanpa gambar terlihat seperti daftar, bukan toko |
| **Wajib** | 1 hero beranda | Satu-satunya tempat foto manusia benar-benar membantu |
| Sebaiknya | 1 artefak kerja di latar putih | Ini pembeda Nusva, dan belum ada yang memakainya |
| Sebaiknya | 1 hero halaman trainer | Panel pembuka deck masih murni tipografi |
| **Tidak perlu** | Placeholder unggahan | Sudah dibangkitkan sendiri, lihat catatan di bawah |
| **Tidak perlu** | Ikon dan spot illustration | SVG inline, lebih tajam dan nol bobot |

---

## Aturan yang berlaku untuk semua prompt

Tempel apa adanya, tapi patuhi lima hal ini atau hasilnya akan terlihat seperti stok:

1. **Jangan minta teks di dalam gambar.** Semua generator masih mengacaukan huruf, dan huruf yang salah di sampul modul terlihat seperti kelalaian. Teks ditambahkan lewat CSS di atas gambar.
2. **Sebutkan konteks Indonesia secara spesifik**, bukan cuma "Asian". Sebut Jakarta, KRL, pabrik di Bekasi, ruang rapat kantor Indonesia.
3. **Cahaya alami, satu sumber, bayangan lembut.** Ini yang membuat foto terbaca mahal.
4. **Larang senyum ke kamera.** Orang yang sedang bekerja tidak menatap lensa. Ini pembeda terbesar antara foto stok dan foto editorial.
5. **Minta ruang kosong yang disengaja** di satu sisi, karena tipografi akan diletakkan di situ.

Tambahkan ekor ini di setiap prompt:

> `No text, no letters, no numbers, no logos, no watermarks. Photorealistic, natural light, soft shadows, muted colour, shot on 35mm, shallow depth of field. Nobody looking at the camera.`

---

## 1. Hero beranda · 1 gambar · 1600 x 1200 px

Satu-satunya tempat foto manusia benar-benar membantu, karena janji halaman ini adalah belajar di sela hidup yang sibuk.

```
A candid editorial photograph taken over the shoulder of a young Indonesian
woman in her late twenties standing inside a crowded Jakarta commuter train
early in the morning. She is holding a phone with one hand, thumb resting on
the screen, the screen glow faint and out of focus. Warm low-angle morning
sunlight comes through the train window on the left, creating soft haze and
long shadows. Other commuters are visible but blurred in the background.
Muted palette of teal, grey and warm skin tones. Generous empty space in the
upper right third of the frame for typography.

No text, no letters, no numbers, no logos, no watermarks. Photorealistic,
natural light, soft shadows, muted colour, shot on 35mm, shallow depth of
field. Nobody looking at the camera.
```

---

## 2. Artefak kerja · 1 gambar · 1600 x 1200 px

Ini yang saya paling dorong. Belum dipakai di mana pun, dan justru inilah proposisi Nusva secara harfiah.

```
A top down product photograph on a seamless pure white background of a single
printed A4 document lying flat, slightly angled, with visible structure of
headings and columns but the text rendered as soft unreadable grey lines. A
simple pencil and a plain ceramic cup of black coffee sit near the edge of the
frame. Clean studio lighting from the upper left, very soft shadow beneath the
paper, no clutter, no props beyond those two. Minimal, calm, expensive looking,
in the visual language of Apple product photography.

No text, no letters, no numbers, no logos, no watermarks. Photorealistic,
natural light, soft shadows, muted colour, shallow depth of field.
```

---

## 3. Hero halaman trainer · 1 gambar · 1600 x 1200 px

```
A candid editorial photograph of an Indonesian man in his forties in a plain
dark shirt, seen from a three quarter angle behind, standing at a window of a
quiet office in the late afternoon while reviewing a stack of printed training
material in his hands. His face is partly turned away and unlit. Warm side
light rakes across the paper. The room behind him is plain and out of focus.
Muted teal and warm grey palette. Large empty space on the left third of the
frame for typography.

No text, no letters, no numbers, no logos, no watermarks. Photorealistic,
natural light, soft shadows, muted colour, shot on 35mm, shallow depth of
field. Nobody looking at the camera.
```

---

## 4. Sampul modul · 4 gambar · 1280 x 800 px (16:10)

Ini yang paling menentukan apakah katalog terlihat hidup. Aturan ketat: **objek pekerjaannya, bukan orangnya.** Satu subjek per gambar, latar hampir kosong, sudut pandang sama untuk keempatnya supaya berbaris rapi di katalog.

### 4a. Menyusun Uraian Jabatan

```
A minimal top down still life on a soft off white surface: several printed
documents arranged in an overlapping fan, one card slightly separated from the
group and placed apart, suggesting one role being defined out of many. Muted
teal accent on a single paper clip. Soft directional daylight from the upper
left, gentle shadows, lots of clean empty space around the subject.

No text, no letters, no numbers, no logos, no watermarks. Photorealistic,
natural light, soft shadows, muted colour, shallow depth of field.
```

### 4b. Melaksanakan Analisis Beban Kerja

```
A minimal top down still life on a soft off white surface: a simple analog
kitchen scale in matte steel, perfectly balanced, with a small neat stack of
plain paper on one side and a few wooden blocks on the other. Nothing else in
frame. Soft directional daylight from the upper left, gentle shadows, generous
empty space around the subject.

No text, no letters, no numbers, no logos, no watermarks. Photorealistic,
natural light, soft shadows, muted colour, shallow depth of field.
```

### 4c. Percakapan Sulit di Tempat Kerja

```
A minimal still life on a soft off white surface photographed at a low angle:
two plain ceramic cups placed close together at the centre of an otherwise
empty table, one slightly turned toward the other. Two empty chairs are barely
suggested and heavily out of focus in the background. Calm, quiet, restrained.
Soft daylight from a window on the left, long gentle shadows.

No text, no letters, no numbers, no logos, no watermarks. Photorealistic,
natural light, soft shadows, muted colour, shot on 35mm, shallow depth of
field. No people in frame.
```

### 4d. Melakukan Administrasi Pengupahan

```
A minimal top down still life on a soft off white surface: a neat grid of
plain envelopes arranged in precise rows, one of them slightly lifted at the
corner. Muted teal accent on a single rubber band. Soft directional daylight
from the upper left, crisp gentle shadows, generous clean space around the
grid.

No text, no letters, no numbers, no logos, no watermarks. Photorealistic,
natural light, soft shadows, muted colour, shallow depth of field.
```

---

## Cara memasangnya di repo (SUDAH DIKERJAKAN)

Berikut yang sudah terpasang, sebagai acuan kalau nanti ada gambar tambahan.

| Berkas | Ukuran | Bobot | Dipakai di |
| --- | --- | --- | --- |
| hero-beranda.webp | 1536x1024 | 75 KB | Hero beranda, kolom kanan penuh tinggi |
| hero-trainer.webp | 1536x1024 | 48 KB | Panel pembuka deck trainer, penuh layar dengan scrim |
| artefak.webp | 900x1200 | 28 KB | Pita "Yang Anda bawa pulang" di beranda |
| sampul-uraian-jabatan.webp | 1280x853 | 24 KB | Katalog, rail, halaman modul |
| sampul-analisis-beban-kerja.webp | 1280x853 | 48 KB | Katalog, rail, halaman modul |
| sampul-komunikasi-sulit.webp | 1280x853 | 17 KB | Katalog, rail, halaman modul |
| sampul-administrasi-pengupahan.webp | 1280x853 | 19 KB | Katalog, rail, halaman modul |

Total 259 KB untuk tujuh gambar, jauh di bawah anggaran 180 KB per gambar.

### Kalau menambah gambar baru

1. Simpan hasilnya ke `assets/foto/` dengan nama: `hero-beranda.jpg`, `hero-trainer.jpg`,
   `artefak.jpg`, `sampul-uraian-jabatan.jpg`, `sampul-analisis-beban-kerja.jpg`,
   `sampul-komunikasi-sulit.jpg`, `sampul-administrasi-pengupahan.jpg`
2. Kompres ke WebP kualitas 80. Target di bawah 180 KB per gambar; di atas itu hero-nya akan
   merusak waktu muat di jaringan seluler.
3. Sampul modul cukup menambah satu baris di `assets/app.js`, di dalam entri KATALOG:

```js
{ slug:'uraian-jabatan', pendek:'Uraian Jabatan',
  sampul:'assets/foto/sampul-uraian-jabatan.webp',   // <- tambahkan baris ini
  judul:'Menyusun Uraian Jabatan', ... }
```

Kode katalog, halaman modul, dan rail sudah membaca kolom `sampul` itu. Selama kolomnya kosong,
sampul dibangkitkan sendiri dari judul modul, jadi Anda bisa memasangnya satu per satu tanpa
tergesa dan tidak ada satu pun layar yang menampilkan kotak kosong.

---

## Placeholder unggahan trainer: sudah ada, dan sengaja bukan foto

Anda menanyakan ini, jawabannya sekarang **sudah ada**, dan sebelumnya memang belum.

Yang dipasang:

* **Sampul modul** punya slotnya sendiri di langkah Detail modul, menerima JPG, PNG, dan WEBP
  maksimal 3 MB, dengan pratinjau langsung. Kalau trainer melewatinya, sampul dibangkitkan dari
  judul modul: gradien dari palet Nusva ditambah inisial judulnya, deterministik sehingga modul
  yang sama selalu mendapat warna yang sama.
* **Daftar berkas unggahan** kini menampilkan gambar kecil, bukan lagi kotak kosong berisi tiga
  huruf. Berkas gambar menampilkan pratinjau isinya yang sungguhan; PDF, DOCX, XLSX, dan PPTX
  menampilkan kartu berwarna sesuai jenisnya.

Kenapa placeholder-nya dibangkitkan dan bukan satu foto ilustrasi: satu gambar yang sama dipakai
berulang di seluruh katalog akan membuat semua modul terlihat identik, dan itu justru memperkuat
kesan katalog kosong. Sampul yang dibangkitkan berbeda-beda warnanya per modul, jadi katalog tetap
terbaca sebagai daftar yang berisi, meski belum satu pun sampul diunggah.
