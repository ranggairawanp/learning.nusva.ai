// Nusva Learning · Edge Function transkrip
//
// Menarik pekerjaan dari antrean, mengunduh berkasnya dari bucket privat,
// mengirimkannya ke layanan speech to text, lalu menulis DRAF transkrip.
//
// Deploy dan secret: lihat supabase/CARA-DEPLOY-TRANSKRIP.md
// Penjadwalan: lihat supabase/04-jadwal-transkrip.sql
//
// ---------------------------------------------------------------------------
// EMPAT HAL YANG SENGAJA TIDAK DILAKUKAN DI SINI
//
// 1. Tidak ada transcoding. Berkas dikirim apa adanya ke layanan STT.
//    Menjalankan ffmpeg di dalam Edge Function mengubah fungsi ringan jadi
//    mesin berat yang timeout-nya sulit ditebak, dan itu jenis kegagalan yang
//    baru ketahuan saat trainer sungguhan mengunggah video satu jam.
//
// 2. Tidak ada percobaan ulang tanpa batas. Gagal ditulis sebagai gagal,
//    dengan alasannya, dan trainernya melihat alasan itu. Antrean yang
//    mencoba lagi selamanya akan menghabiskan kuota API pada satu berkas
//    rusak tanpa ada yang tahu.
//
// 3. Hasilnya TIDAK pernah disebut transkrip final. Status 'siap' berarti
//    drafnya ada, bukan bahwa isinya benar. Yang membaca ulang tetap
//    trainernya.
//
// 4. Tidak ada kunci yang ditebak diam-diam. Kalau kunci layanan atau kunci
//    service role tidak ada, fungsinya berhenti dan MENYEBUT perintah yang
//    harus dijalankan. Fungsi yang gagal tanpa bunyi adalah fungsi yang
//    dikira jalan selama berminggu-minggu.
// ---------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const URL_SB = Deno.env.get('SUPABASE_URL') ?? '';

/* Supabase sedang berpindah dari service_role JWT lama ke kunci sb_secret_.
   Selama masa itu, yang disuntikkan otomatis bisa jadi kunci lama yang sudah
   dinonaktifkan pemiliknya, dan gejalanya adalah 401 yang membingungkan. Maka
   urutannya: kunci yang diset pemilik lebih dulu, baru yang disuntikkan. */
const KUNCI_SR =
  Deno.env.get('SB_SECRET_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  (Deno.env.get('SUPABASE_SECRET_KEYS') || '').split(',')[0] ||
  '';

const STT_KEY = Deno.env.get('STT_API_KEY') ?? '';
const STT_URL = Deno.env.get('STT_ENDPOINT') ?? 'https://api.openai.com/v1/audio/transcriptions';
const STT_MDL = Deno.env.get('STT_MODEL') ?? 'gpt-4o-mini-transcribe';

// Batas ukuran layanan STT umumnya 25 MB. Berkas di atas itu ditolak lebih awal
// dengan pesan yang menyebut angkanya, bukan dibiarkan gagal di tengah jalan.
const MAKS_STT = 25 * 1024 * 1024;

// Berapa pekerjaan per panggilan. Dengan cron tiap menit, tiga sudah cukup
// untuk mengejar antrean tanpa mendekati batas waktu eksekusi fungsi.
const PER_PANGGILAN = 3;
const BATAS_DETIK   = 45;

function sb() {
  return createClient(URL_SB, KUNCI_SR, { auth: { persistSession: false } });
}

async function satuPekerjaan(k: ReturnType<typeof sb>) {
  const { data, error } = await k.rpc('ambil_pekerjaan_transkrip');
  if (error) throw new Error('Antrean tidak bisa dibaca: ' + error.message);
  if (!data || data.length === 0) return null;

  const j = data[0] as { transkrip_id: string; media_id: string; jalur: string; mime: string };
  const tandai = (isi: Record<string, unknown>) => k.from('transkrip').update(isi).eq('id', j.transkrip_id);

  try {
    const { data: berkas, error: eUnduh } = await k.storage.from('modul-media').download(j.jalur);
    if (eUnduh || !berkas) throw new Error('Berkasnya tidak bisa diambil dari penyimpanan: ' + (eUnduh?.message ?? 'kosong'));

    if (berkas.size > MAKS_STT) {
      throw new Error(
        'Berkasnya ' + Math.round(berkas.size / 1048576) + ' MB, di atas batas ' +
        Math.round(MAKS_STT / 1048576) + ' MB layanan transkrip. Unggah versi audio saja untuk berkas sepanjang ini.',
      );
    }

    const form = new FormData();
    form.append('file', berkas, j.jalur.split('/').pop() ?? 'media');
    form.append('model', STT_MDL);
    form.append('language', 'id');
    form.append('response_format', 'text');

    const r = await fetch(STT_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + STT_KEY }, body: form });
    if (!r.ok) throw new Error('Layanan transkrip menolak: ' + r.status + ' ' + (await r.text()).slice(0, 300));

    const teks = (await r.text()).trim();
    if (!teks) throw new Error('Layanan transkrip mengembalikan teks kosong. Kemungkinan berkasnya tidak berisi suara.');

    await tandai({ status: 'siap', teks, bahasa: 'id', mesin: STT_MDL, galat: null });
    return { media_id: j.media_id, ok: true, huruf: teks.length };

  } catch (e) {
    const pesan = String((e as Error).message ?? e).slice(0, 500);
    await tandai({ status: 'gagal', galat: pesan });
    return { media_id: j.media_id, ok: false, alasan: pesan };
  }
}

Deno.serve(async () => {
  const kurang: string[] = [];
  if (!KUNCI_SR) kurang.push('SB_SECRET_KEY (isi dengan kunci sb_secret_ dari Settings > API Keys)');
  if (!STT_KEY)  kurang.push('STT_API_KEY (kunci layanan speech to text)');
  if (kurang.length) {
    return Response.json(
      { ok: false, alasan: 'Secret belum lengkap', kurang,
        cara: 'Dashboard > Edge Functions > Secrets, atau: supabase secrets set NAMA=nilai' },
      { status: 503 },
    );
  }

  const k = sb();
  const mulai = Date.now();
  const hasil = [];

  for (let i = 0; i < PER_PANGGILAN; i++) {
    if ((Date.now() - mulai) / 1000 > BATAS_DETIK) break;
    let r;
    try {
      r = await satuPekerjaan(k);
    } catch (e) {
      return Response.json({ ok: false, alasan: String((e as Error).message ?? e), selesai: hasil }, { status: 500 });
    }
    if (!r) break;
    hasil.push(r);
  }

  return Response.json({ ok: true, dikerjakan: hasil.length, hasil });
});
