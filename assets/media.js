/* ---------------------------------------------------------------------------
   Media modul: video dan audio.

   Satu berkas ini dipakai dua permukaan yang berlawanan kepentingannya. Trainer
   memakainya untuk MENGUNGGAH, peserta memakainya untuk MEMUTAR. Keduanya
   ditaruh di sini supaya aturan jalur berkas, batas ukuran, dan cara membaca
   durasi cuma ditulis satu kali. Dua salinan aturan jalur adalah cara paling
   pasti membuat berkas trainer masuk ke folder trainer lain enam bulan lagi.

   Yang WAJIB diingat saat membaca kode di bawah: bucket-nya PRIVAT. Tidak ada
   URL publik yang bisa ditempel di src. Pemutaran selalu lewat signed URL yang
   berumur pendek, dan Storage cuma menerbitkannya kalau kebijakan RLS di
   03-media-modul.sql mengizinkan. Kalau suatu hari ada yang mengganti bucket
   jadi publik supaya "lebih gampang", seluruh beda antara bagian gratis dan
   bagian berbayar hilang tanpa satu pun layar berubah.
   --------------------------------------------------------------------------- */

import { klien, terkonfigurasi } from './app.js';

export const EKST_VIDEO = ['mp4','webm','mov','m4v'];
export const EKST_AUDIO = ['mp3','m4a','wav','ogg'];
export const EKST_MEDIA = EKST_VIDEO.concat(EKST_AUDIO);

/* 500 MB. Angka ini harus sama dengan file_size_limit bucket di 03-media-modul.sql;
   kalau berbeda, penolakannya terjadi di server setelah unggahan berjalan lama,
   dan itu pengalaman terburuk yang bisa diberikan ke orang yang koneksinya pas-pasan. */
export const MAKS_MEDIA = 500 * 1024 * 1024;

/* Batas layanan transkrip, dipakai HANYA untuk memberi tahu lebih awal, bukan
   untuk menolak unggahan. Video besar tetap boleh diunggah, transkripnya saja
   yang tidak akan jalan, dan trainernya perlu tahu itu sebelum menunggu sia-sia. */
export const MAKS_TRANSKRIP = 25 * 1024 * 1024;

export const ekstensi = nama => (nama.split('.').pop() || '').toLowerCase();
export const jenisMedia = nama => {
  const e = ekstensi(nama);
  if(EKST_VIDEO.includes(e)) return 'video';
  if(EKST_AUDIO.includes(e)) return 'audio';
  return null;
};

/* Durasi dibaca dari metadata berkasnya di peramban, sebelum apa pun diunggah.
   Sebelum ini menit tiap bagian cuma angka yang diketik trainer, dan angka
   ketikan selalu meleset ke arah yang sama, yaitu terlalu pendek. */
export function bacaDurasi(file){
  return new Promise(resolve => {
    const jenis = jenisMedia(file.name);
    if(!jenis) return resolve(null);
    const el  = document.createElement(jenis === 'video' ? 'video' : 'audio');
    const url = URL.createObjectURL(file);
    const bersih = nilai => { URL.revokeObjectURL(url); resolve(nilai); };
    el.preload = 'metadata';
    el.onloadedmetadata = () => bersih(isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration) : null);
    el.onerror = () => bersih(null);
    /* Berkas rusak kadang tidak pernah memicu loadedmetadata maupun error, dan
       tanpa batas waktu janji ini menggantung selamanya, membawa serta layar
       yang menunggunya. */
    setTimeout(() => bersih(null), 8000);
    el.src = url;
  });
}

export const jamMenit = detik => {
  if(!detik && detik !== 0) return null;
  const m = Math.floor(detik / 60), d = detik % 60;
  return m + ':' + String(d).padStart(2, '0');
};

/* Jalur SELALU <trainer_id>/<module_id>/<berkas>. Awalan trainer_id itu bukan
   kerapian, itu yang ditegakkan kebijakan storage: seorang trainer secara
   teknis tidak bisa menulis di luar folder ber-uid dirinya sendiri. */
export function jalurMedia(trainerId, moduleId, nama){
  const aman = nama.normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(-120);
  return trainerId + '/' + moduleId + '/' + Date.now() + '-' + aman;
}

/* ---------- unggah ----------
   Mengembalikan { ok, media, alasan }. Tidak pernah melempar, karena pemanggilnya
   adalah layar yang harus tetap hidup dan menjelaskan kegagalan, bukan layar yang
   boleh berhenti di tengah. */
export async function unggahMedia({ file, moduleId, submoduleId = null, trainerId, onKemajuan }){
  const jenis = jenisMedia(file.name);
  if(!jenis) return { ok:false, alasan:'tipe' };
  if(file.size > MAKS_MEDIA) return { ok:false, alasan:'ukuran' };
  if(!terkonfigurasi()) return { ok:false, alasan:'belum-tersambung' };

  const sb = await klien();
  if(!sb) return { ok:false, alasan:'belum-tersambung' };

  const durasi = await bacaDurasi(file);
  const jalur  = jalurMedia(trainerId, moduleId, file.name);

  if(onKemajuan) onKemajuan(0);
  const { error: eUnggah } = await sb.storage.from('modul-media')
    .upload(jalur, file, { contentType: file.type || undefined, upsert: false });
  if(eUnggah) return { ok:false, alasan:'unggah', pesan:eUnggah.message };
  if(onKemajuan) onKemajuan(1);

  const { data, error: eBaris } = await sb.from('media').insert({
    module_id: moduleId, submodule_id: submoduleId, trainer_id: trainerId,
    jalur, nama_asli: file.name, mime: file.type || 'application/octet-stream',
    ukuran_bytes: file.size, durasi_detik: durasi, jenis
  }).select().single();

  /* Kalau barisnya gagal ditulis, berkasnya dihapus lagi. Tanpa ini penyimpanan
     perlahan terisi berkas yatim yang tidak muncul di layar mana pun dan tidak
     ada yang tahu boleh dihapus atau tidak. */
  if(eBaris){
    await sb.storage.from('modul-media').remove([jalur]);
    return { ok:false, alasan:'baris', pesan:eBaris.message };
  }
  return { ok:true, media:data };
}

export async function hapusMedia(media){
  const sb = await klien();
  if(!sb) return false;
  await sb.storage.from('modul-media').remove([media.jalur]);
  const { error } = await sb.from('media').delete().eq('id', media.id);
  return !error;
}

/* ---------- pemutaran ----------
   Signed URL berumur satu jam. Cukup panjang untuk menonton video terpanjang
   yang kita izinkan, cukup pendek supaya tautan yang terlanjur dibagikan mati
   dengan sendirinya. */
export async function tautanPutar(jalur, detik = 3600){
  const sb = await klien();
  if(!sb) return null;
  const { data, error } = await sb.storage.from('modul-media').createSignedUrl(jalur, detik);
  return error ? null : data.signedUrl;
}

export async function mediaModul(moduleId){
  const sb = await klien();
  if(!sb) return [];
  const { data, error } = await sb.from('media')
    .select('*, transkrip(status, teks, galat, diperbarui)')
    .eq('module_id', moduleId)
    .order('dibuat_pada', { ascending: true });
  return error ? [] : (data || []);
}

/* ---------- elemen pemutar ----------
   Dibuat lewat DOM, bukan lewat string HTML, karena src-nya adalah signed URL
   yang mengandung tanda tangan; menyusunnya lewat innerHTML membuka jalan
   penyisipan yang tidak perlu ada. */
export function pemutar(jenis, src, { judul = '' } = {}){
  const el = document.createElement(jenis === 'video' ? 'video' : 'audio');
  el.controls = true;
  el.preload = 'metadata';
  el.playsInline = true;
  el.src = src;
  if(judul) el.setAttribute('aria-label', judul);
  if(jenis === 'video'){ el.style.width = '100%'; el.style.borderRadius = '12px'; el.style.display = 'block'; }
  else { el.style.width = '100%'; }
  return el;
}

/* Label status transkrip. Ditulis di sini supaya kata-katanya sama di wizard dan
   di mana pun ia muncul nanti, dan supaya 'siap' tidak pernah tergoda berubah
   jadi kata yang terdengar seperti sudah diperiksa manusia. */
export const STATUS_TRANSKRIP = {
  menunggu: { id:'Transkrip menunggu antrean',        en:'Transcript queued' },
  diproses: { id:'Transkrip sedang dibuat',           en:'Transcript in progress' },
  siap:     { id:'Draf transkrip siap dibaca ulang',  en:'Draft transcript ready for review' },
  gagal:    { id:'Transkrip gagal',                   en:'Transcript failed' }
};
