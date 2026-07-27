/* ---------------------------------------------------------------------------
   Panduan, penunjuk arah belajar.

   Ini BUKAN asesmen kompetensi. Tidak ada nilai, tidak ada level yang diberikan,
   tidak ada yang dikirim ke pihak mana pun. Yang dikerjakan cuma satu: mengurutkan
   katalog memakai tiga hal yang orangnya sendiri paling tahu, yaitu posisinya
   sekarang, bidang yang mau dikuatkan, dan seberapa jauh dia sudah menjalankannya.

   Alasannya sederhana. Dengan empat modul, diagnostik sungguhan akan bohong: tidak
   ada cukup soal untuk mengukur apa pun, dan hasil ukur yang tipis justru membuat
   orang percaya pada angka yang tidak berhak dipercaya. Laporan diri itu jujur,
   cepat, dan sudah cukup untuk memotong pilihan dari sekian modul jadi satu.

   Saat katalog sudah cukup besar dan bank soalnya sudah ada, fungsi skor() di
   bawah ini yang diganti, bukan layarnya.
   --------------------------------------------------------------------------- */

export const KUNCI_PANDUAN = 'nusva.panduan.v1';

/* Urutan tingkat dipakai untuk menghitung jarak, bukan untuk memberi peringkat orang. */
const TINGKAT = ['Dasar', 'Menengah', 'Lanjut'];

/* Tiga pilihan laporan diri, dipetakan ke tingkat modul. Kalimatnya sengaja tentang
   apa yang sudah dikerjakan, bukan tentang seberapa pintar orangnya. */
export const TAHAP = [
  { id:'baru',  tingkat:'Dasar',
    t:{ id:'Belum pernah mengerjakannya', en:'I have not done it yet' },
    k:{ id:'Saya tahu istilahnya, tapi belum pernah menggarapnya sendiri.',
        en:'I know the term, but I have never worked on it myself.' } },
  { id:'pernah', tingkat:'Menengah',
    t:{ id:'Pernah, ingin dirapikan', en:'I have, and I want it tidier' },
    k:{ id:'Sudah pernah saya kerjakan, hasilnya jalan tapi caranya masih coba-coba.',
        en:'I have done it, it works, but the method is still trial and error.' } },
  { id:'rutin', tingkat:'Lanjut',
    t:{ id:'Rutin, ingin memperdalam', en:'Routinely, and I want to go deeper' },
    k:{ id:'Ini bagian dari pekerjaan saya sekarang dan saya cari yang lebih dalam.',
        en:'This is part of my job now and I am looking for something deeper.' } }
];

/* ---------------------------------------------------------------------------
   Skor. Bobotnya sengaja dibuat bisa dibaca orang, bukan hasil pelatihan model.
   Bidang paling berat karena itu yang paling menentukan relevansi; peran kedua;
   tahap ketiga dan tidak pernah mematikan sebuah modul, cuma menurunkannya.
   --------------------------------------------------------------------------- */
function skor(m, j){
  let n = 0;
  const alasan = [];

  if(j.bidang && m.bidang === j.bidang){
    n += 4;
    alasan.push({ id:'sesuai bidang yang Anda pilih', en:'it sits in the field you picked' });
  }

  if(j.peran && Array.isArray(m.untuk) && m.untuk.includes(j.peran)){
    n += 3;
    alasan.push({ id:'ditujukan untuk ' + j.peran.toLowerCase(), en:'it is written for ' + j.peran });
  }

  const th = TAHAP.find(t => t.id === j.tahap);
  if(th){
    const jarak = Math.abs(TINGKAT.indexOf(th.tingkat) - TINGKAT.indexOf(m.tingkat));
    if(jarak === 0){
      n += 3;
      alasan.push({ id:'setingkat dengan titik Anda sekarang', en:'it matches where you are now' });
    }else if(jarak === 1){
      n += 1;
    }
  }

  /* Modul yang punya bagian gratis dinaikkan sedikit, supaya saran pertama selalu
     bisa dicoba dulu sebelum ada uang berpindah. */
  const gratis = (m.bagian || []).filter(b => b.buka).length;
  if(gratis){
    n += 1;
    alasan.push({ id:gratis + ' bagian bisa dibuka gratis',
                  en:'it has ' + gratis + (gratis > 1 ? ' parts' : ' part') + ' you can open for free' });
  }

  /* Pemecah seri: yang lebih pendek didahulukan, karena modul pertama yang selesai
     jauh lebih berguna daripada modul terbaik yang tidak pernah dibuka. */
  n += Math.max(0, (120 - (m.menit || 60)) / 1000);

  return { n, alasan };
}

/* Mengembalikan seluruh katalog dalam urutan saran, lengkap dengan alasannya.
   Tidak ada modul yang disembunyikan. Orang tetap boleh memilih yang lain. */
export function urutkan(katalog, jawaban){
  return katalog
    .map(m => { const s = skor(m, jawaban); return { modul:m, skor:s.n, alasan:s.alasan }; })
    .sort((a, b) => b.skor - a.skor);
}

/* Daftar bidang dan peran diambil dari isi katalog, tidak pernah ditulis tangan,
   supaya modul bidang apa pun yang masuk besok langsung muncul di pertanyaannya. */
export function bidangDari(katalog){
  return [...new Set(katalog.map(m => m.bidang).filter(Boolean))];
}

const URUT_PESERTA = ['Profesional','Praktisi','Pekerja','Entrepreneur','Dosen','Mahasiswa/i','Fresh Graduate'];
export function peranDari(katalog){
  const ada = new Set();
  katalog.forEach(m => (m.untuk || []).forEach(x => ada.add(x)));
  const baku = URUT_PESERTA.filter(x => ada.has(x));
  return baku.concat([...ada].filter(x => !URUT_PESERTA.includes(x)));
}

/* Jawaban disimpan di perangkat orangnya sendiri. Tidak ada yang dikirim ke server
   selama fitur ini belum tersambung ke akun, dan itu memang disengaja. */
export function simpanJawaban(j){
  try{ localStorage.setItem(KUNCI_PANDUAN, JSON.stringify(j)); }catch(e){}
}
export function bacaJawaban(){
  try{
    const s = localStorage.getItem(KUNCI_PANDUAN);
    if(!s) return null;
    const j = JSON.parse(s);
    return (j && j.peran && j.bidang && j.tahap) ? j : null;
  }catch(e){ return null; }
}
export function hapusJawaban(){
  try{ localStorage.removeItem(KUNCI_PANDUAN); }catch(e){}
}
