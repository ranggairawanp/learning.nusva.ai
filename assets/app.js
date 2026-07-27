/* Nusva Learning · lapisan bersama untuk seluruh halaman.
   Isi: tema, bahasa, format lokal, toast, klien Supabase, sesi, dan gerbang masuk.
   Dimuat sebagai modul: <script type="module" src="assets/app.js"></script> */

/* supabase-js di-vendor ke assets/vendor/supabase.js supaya situs tidak bergantung pada CDN pihak
   ketiga saat berjalan. Dimuat malas: halaman yang tidak butuh auth tidak ikut menanggung biayanya,
   dan kalau berkasnya gagal dimuat, katalog serta seluruh isi statis TETAP tampil. */
const CFG = window.NUSVA || {};
export const terkonfigurasi = () => Boolean(CFG.supabaseUrl && CFG.supabaseKey);

let _sb = null, _gagal = false, _muat = null;
export function klien(){
  if(_sb || _gagal) return Promise.resolve(_sb);
  if(!terkonfigurasi()){ _gagal = true; return Promise.resolve(null); }
  if(!_muat){
    _muat = import(new URL('vendor/supabase.js', import.meta.url).href)
      .then(m => { _sb = m.createClient(CFG.supabaseUrl, CFG.supabaseKey); return _sb; })
      .catch(e => { _gagal = true; console.warn('Supabase tidak dapat dimuat:', e); return null; });
  }
  return _muat;
}

/* ---------- format lokal (aturan DS: pemisah ribuan titik, Rp tanpa spasi) ---------- */
export const nf = n => new Intl.NumberFormat('id-ID').format(Math.round(n));
export const rp = n => 'Rp' + nf(n);
export const menit = n => n + (bahasa() === 'en' ? ' min' : ' mnt');

/* ---------- bahasa ---------- */
export function bahasa(){ return document.documentElement.lang === 'en' ? 'en' : 'id'; }
export function T(id, en){ return bahasa() === 'en' ? en : id; }
export function pasangBahasa(btn){
  const ke = bahasa() === 'id' ? 'en' : 'id';
  document.documentElement.lang = ke;
  try{ localStorage.setItem('nusva.lang', ke); }catch(e){}
  document.querySelectorAll('[data-en]').forEach(n => { const s = n.innerHTML; n.innerHTML = n.dataset.en; n.dataset.en = s; });
  document.querySelectorAll('[data-en-ph]').forEach(n => { const s = n.placeholder; n.placeholder = n.dataset.enPh; n.dataset.enPh = s; });
  if(btn){ btn.textContent = ke === 'en' ? 'ID' : 'EN'; btn.setAttribute('aria-pressed', String(ke === 'en')); }
  document.dispatchEvent(new CustomEvent('nusva:bahasa', { detail:{ lang: ke } }));
}

/* ---------- tema ---------- */
export function pasangTema(btn){
  const gelap = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = gelap ? 'light' : 'dark';
  try{ localStorage.setItem('nusva.theme', gelap ? 'light' : 'dark'); }catch(e){}
  if(btn){
    btn.setAttribute('aria-pressed', String(!gelap));
    btn.title = gelap ? 'Mode gelap' : 'Mode terang';
    /* hanya tombol berteks yang labelnya ditukar; tombol berikon mempertahankan ikonnya */
    if(btn.dataset.teks !== undefined) btn.textContent = gelap ? 'Gelap' : 'Terang';
  }
}
(function temaAwal(){
  try{
    const t = localStorage.getItem('nusva.theme');
    if(t) document.documentElement.dataset.theme = t;
    const l = localStorage.getItem('nusva.lang');
    if(l === 'en' && document.documentElement.lang !== 'en'){
      document.addEventListener('DOMContentLoaded', () => {
        const b = document.querySelector('[data-aksi="bahasa"]');
        if(b) pasangBahasa(b);
      });
    }
  }catch(e){}
})();

/* ---------- galat dari penyedia masuk ----------
   Google dan Supabase mengembalikan kegagalan sebagai parameter di URL, kadang di query dan
   kadang di fragmen. Sebelum ini halaman diam saja dan pengguna cuma melihat dirinya belum
   masuk, tanpa satu pun petunjuk kenapa. Itu menyulitkan pengguna dan mustahil didiagnosis
   dari jauh, jadi pesannya sekarang dibaca, ditampilkan, lalu URL-nya dibersihkan supaya
   tidak muncul lagi saat halaman dimuat ulang. */
const _galatAuth = (() => {
  try{
    const q = new URLSearchParams(location.search);
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    const kode = q.get('error') || h.get('error') || q.get('error_code') || h.get('error_code');
    if(!kode) return null;
    const uraian = q.get('error_description') || h.get('error_description') || '';
    ['error','error_code','error_description'].forEach(k => q.delete(k));
    const bersih = location.pathname + (q.toString() ? '?' + q : '') +
                   (h.get('error') || h.get('error_code') ? '' : location.hash);
    history.replaceState(null, '', bersih);
    return { kode, uraian: decodeURIComponent(uraian.replace(/\+/g, ' ')) };
  }catch(e){ return null; }
})();
export const galatMasuk = () => _galatAuth;

/* Pita merah di atas halaman. Sengaja pita, bukan toast, karena toast hilang sendiri dan
   pesan kegagalan masuk justru perlu tetap terbaca sampai orangnya selesai membacanya. */
export function pitaGalatMasuk(){
  if(!_galatAuth) return false;
  const p = document.createElement('div');
  p.setAttribute('role','alert');
  p.style.cssText = 'position:relative;z-index:60;background:var(--danger-tint);color:var(--danger-deep);' +
    'border-bottom:1px solid var(--danger);padding:11px 24px;font-size:13.5px;line-height:1.5;' +
    'display:flex;gap:10px;align-items:flex-start;justify-content:center;text-align:left';
  const isi = document.createElement('span');
  isi.style.cssText = 'max-width:var(--wrap);display:block';
  const judul = document.createElement('b');
  judul.textContent = T('Masuk tidak berhasil. ','Sign in did not go through. ');
  isi.appendChild(judul);
  isi.appendChild(document.createTextNode(
    _galatAuth.uraian || T('Penyedia masuk menolak permintaannya.','The sign in provider refused the request.')));
  const kd = document.createElement('span');
  kd.style.cssText = 'display:block;margin-top:3px;font-size:11.5px;opacity:.8';
  kd.textContent = T('Kode: ','Code: ') + _galatAuth.kode;
  isi.appendChild(kd);
  p.appendChild(isi);
  document.body.insertBefore(p, document.body.firstChild);
  return true;
}

/* ---------- toast ---------- */
export function toast(pesan){
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
  t.textContent = pesan; t.classList.add('on');
  clearTimeout(t._x); t._x = setTimeout(() => t.classList.remove('on'), 4000);
}

/* ---------- sesi ---------- */
export async function sesi(){
  const c = await klien();
  if(!c) return null;
  const { data } = await c.auth.getSession();
  const s = data && data.session ? data.session : null;
  /* Kode OAuth sekali pakai tidak perlu tertinggal di bilah alamat setelah ditukar sesi.
     Ia tidak berbahaya lagi, tetapi menyalin URL yang berisi kode mati membingungkan. */
  if(s && /[?&]code=/.test(location.search)){
    try{
      const q = new URLSearchParams(location.search);
      q.delete('code'); q.delete('state');
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    }catch(e){}
  }
  return s;
}
export async function pengguna(){
  const s = await sesi();
  return s ? s.user : null;
}
export async function keluar(){
  const c = await klien();
  if(c) await c.auth.signOut();
  location.href = location.pathname.includes('/trainer/') ? '../index.html' : 'index.html';
}

/* Arahkan ke halaman masuk sambil mengingat tujuan dan peran. */
export function keMasuk(peran, tujuan){
  const q = new URLSearchParams();
  if(peran) q.set('peran', peran);
  q.set('next', tujuan || (location.pathname.split('/').pop() + location.search));
  location.href = (peran === 'trainer' ? 'masuk.html?' : 'masuk.html?') + q.toString();
}

/* Gerbang lunak: halaman tetap bisa dilihat, tetapi aksi tertentu meminta masuk lebih dulu. */
export async function wajibMasuk(peran, tujuan){
  const u = await pengguna();
  if(u) return u;
  keMasuk(peran, tujuan);
  return null;
}

/* ---------- kepala halaman: pasang aksi bersama ---------- */
export function pasangKepala(){
  document.querySelectorAll('[data-aksi="bahasa"]').forEach(b => b.addEventListener('click', () => pasangBahasa(b)));
  document.querySelectorAll('[data-aksi="tema"]').forEach(b => b.addEventListener('click', () => pasangTema(b)));
  document.querySelectorAll('[data-aksi="keluar"]').forEach(b => b.addEventListener('click', keluar));
}

/* Tampilkan nama pengguna di kepala bila sudah masuk, atau tombol Masuk bila belum. */
export async function pasangAkun(el){
  if(!el) return;
  const u = await pengguna();
  if(!u){
    el.innerHTML = '<a class="btn btn-quiet sm" href="masuk.html">' + T('Masuk','Sign in') + '</a>';
    return;
  }
  const nama = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email || 'Akun';
  const ini = nama.trim().split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase();
  el.innerHTML =
    '<span class="akun"><span class="ini" aria-hidden="true">' + ini + '</span>' +
    '<span class="nm">' + nama + '</span>' +
    '<button class="chip" data-aksi="keluar">' + T('Keluar','Sign out') + '</button></span>';
  el.querySelector('[data-aksi="keluar"]').addEventListener('click', keluar);
}

/* ---------- katalog contoh (dipakai sampai tabel Supabase terisi) ----------
   Dua kolom yang mudah tertukar, jadi bedanya ditulis di sini sekali:
     `untuk`   = JENIS PESERTA. Dipakai pintasan di beranda, untuk orang yang sedang mencari
                 dirinya sendiri di dalam katalog.
     `jabatan` = POSISI KERJA. Dipakai tabel pemetaan di perusahaan.html, untuk HR yang sedang
                 menutup gap di sebuah jabatan.
   Keduanya bukan hal yang sama dan tidak boleh disatukan: seorang Profesional bisa duduk di
   jabatan mana pun, dan satu jabatan bisa diisi Fresh Graduate maupun Praktisi lama.

   Kolom `untuk` adalah sumbu masuk utama beranda. Alasannya perilaku, bukan estetika:
   katalog datar memaksa orang MENGEVALUASI tiap modul, sedangkan jabatan mengubahnya jadi
   MENGENALI diri sendiri, dan mengenali jauh lebih murah secara kognitif daripada
   mengevaluasi. Nilainya harus benar, bukan kategori karangan, karena satu jabatan yang
   dipasang asal akan mengirim orang ke modul yang salah. */
export const KATALOG = [
  { slug:'uraian-jabatan', sampul:'assets/foto/sampul-uraian-jabatan.webp', pendek:'Uraian Jabatan', judul:'Menyusun Uraian Jabatan', kode:'M.70SDM01.010.2',
    bidang:'SKKNI MSDM', tingkat:'Dasar', harga:50000, menit:51, peserta:38,
    untuk:['Profesional','Praktisi'],
    jabatan:['Staf HR','Supervisor HR'],
    trainer:'Rangga Irawan Prasetyo, MBA',
    ringkas:'Menyusun uraian jabatan yang dipakai untuk rekrutmen, evaluasi jabatan, dan penilaian kinerja, bukan sekadar dokumen arsip.',
    bagian:[
      { judul:'Kenapa uraian jabatan sering jadi dokumen mati', menit:4, jenis:'artikel', buka:true },
      { judul:'Anatomi uraian jabatan yang terpakai', menit:6, jenis:'artikel', buka:true },
      { judul:'Contoh dikerjakan: jabatan Staf Payroll', menit:8, jenis:'video', buka:false },
      { judul:'Latihan mandiri: susun satu uraian jabatan', menit:10, jenis:'latihan', buka:false },
      { judul:'Terapkan di pekerjaan Anda', menit:5, jenis:'artikel', buka:false }
    ] },
  { slug:'analisis-beban-kerja', sampul:'assets/foto/sampul-analisis-beban-kerja.webp', pendek:'Beban Kerja', judul:'Melaksanakan Analisis Beban Kerja', kode:'M.70SDM01.011.2',
    bidang:'SKKNI MSDM', tingkat:'Menengah', harga:50000, menit:44, peserta:21,
    untuk:['Profesional','Praktisi'],
    jabatan:['Supervisor HR','Manajer HR'],
    trainer:'Rangga Irawan Prasetyo, MBA',
    ringkas:'Menghitung kebutuhan orang dari beban kerja nyata, dengan angka yang bisa dipertahankan di depan direksi.',
    bagian:[
      { judul:'Beban kerja bukan perasaan sibuk', menit:4, jenis:'artikel', buka:true },
      { judul:'Metode dan datanya', menit:7, jenis:'artikel', buka:false },
      { judul:'Contoh dikerjakan: gudang 40 orang', menit:12, jenis:'video', buka:false },
      { judul:'Latihan mandiri', menit:12, jenis:'latihan', buka:false },
      { judul:'Menyampaikan hasilnya', menit:9, jenis:'artikel', buka:false }
    ] },
  { slug:'komunikasi-sulit', sampul:'assets/foto/sampul-komunikasi-sulit.webp', pendek:'Percakapan Sulit', judul:'Percakapan Sulit di Tempat Kerja', kode:null,
    bidang:'Soft skill', tingkat:'Dasar', harga:75000, menit:38, peserta:64,
    untuk:['Profesional','Pekerja','Entrepreneur','Fresh Graduate'],
    jabatan:['Supervisor HR','Manajer HR','Pemimpin tim'],
    trainer:'Rangga Irawan Prasetyo, MBA',
    ringkas:'Menyampaikan hal yang tidak enak didengar tanpa merusak hubungan kerja, dilatih lewat simulasi percakapan.',
    bagian:[
      { judul:'Kenapa kita menunda percakapan sulit', menit:5, jenis:'artikel', buka:true },
      { judul:'Membuka percakapan tanpa menyerang', menit:8, jenis:'video', buka:true },
      { judul:'Simulasi: menyampaikan kinerja yang turun', menit:10, jenis:'latihan', buka:false },
      { judul:'Menutup dengan kesepakatan', menit:7, jenis:'artikel', buka:false },
      { judul:'Terapkan minggu ini', menit:8, jenis:'artikel', buka:false }
    ] },
  { slug:'administrasi-pengupahan', sampul:'assets/foto/sampul-administrasi-pengupahan.webp', pendek:'Administrasi Upah', judul:'Melakukan Administrasi Pengupahan', kode:'M.70SDM01.057.2',
    bidang:'SKKNI MSDM', tingkat:'Dasar', harga:50000, menit:46, peserta:15,
    untuk:['Praktisi','Pekerja'],
    jabatan:['Staf HR','Staf Payroll'],
    trainer:'Rangga Irawan Prasetyo, MBA',
    ringkas:'Menjalankan siklus pengupahan dan mendokumentasikan tiap pembayaran agar bisa ditelusuri auditor.',
    bagian:[
      { judul:'Kenapa keliru hitung upah jadi mahal', menit:4, jenis:'artikel', buka:true },
      { judul:'Komponen upah dan dasar hukumnya', menit:9, jenis:'artikel', buka:false },
      { judul:'Contoh hitung lembur', menit:10, jenis:'video', buka:false },
      { judul:'Latihan mandiri: satu siklus penuh', menit:14, jenis:'latihan', buka:false },
      { judul:'Menyiapkan berkas untuk audit', menit:9, jenis:'artikel', buka:false }
    ] }
];
export const cariModul = slug => KATALOG.find(m => m.slug === slug) || null;
