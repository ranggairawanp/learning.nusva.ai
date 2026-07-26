/* Nusva · sampul modul.
   Setiap modul sebaiknya punya gambar sampul yang diunggah trainer. Selama belum ada,
   halaman TIDAK boleh menampilkan kotak abu-abu kosong atau ikon gambar rusak, karena itu
   terbaca sebagai produk setengah jadi. Berkas ini membangkitkan sampul cadangan yang
   deterministik: gradien dari palet Nusva plus inisial modul, sama setiap kali dipanggil,
   sehingga katalog tetap terlihat disengaja meski satu pun sampul belum diunggah. */

const PALET = [
  ['#0B6B77', '#1ECAD3'],   /* laguna  */
  ['#0A3D62', '#1E6FA8'],   /* samudra */
  ['#155E63', '#4FC3C9'],   /* teluk   */
  ['#1E4D6B', '#57A7C9'],   /* subuh   */
  ['#0E5E52', '#3FBFA0'],   /* zamrud  */
  ['#2B4A7A', '#6E8FD0']    /* senja dingin */
];

/* hash stabil supaya modul yang sama selalu memakai warna yang sama */
function jejak(teks){
  let h = 0;
  for(let i = 0; i < teks.length; i++){ h = (h * 31 + teks.charCodeAt(i)) >>> 0; }
  return h;
}
function inisial(judul){
  const kata = String(judul || '?').replace(/[^\p{L}\p{N}\s]/gu,' ').trim().split(/\s+/);
  const abai = new Set(['dan','di','ke','yang','untuk','pada','the','and','of','for','a']);
  const pilih = kata.filter(k => !abai.has(k.toLowerCase())).slice(0, 2);
  return (pilih.length ? pilih : kata.slice(0,2)).map(k => k[0]).join('').toUpperCase();
}

/* SVG sebagai data URI: nol permintaan jaringan, tajam di layar mana pun */
export function sampulCadangan(judul, kunci, w, h){
  const lebar = w || 640, tinggi = h || 400;
  const k = String(kunci || judul || 'nusva');
  const [a, b] = PALET[jejak(k) % PALET.length];
  const ini = inisial(judul);
  const id = 'g' + (jejak(k) % 9999);
  const sudut = 20 + (jejak(k + 'x') % 50);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + lebar + ' ' + tinggi + '" width="' + lebar + '" height="' + tinggi + '" role="img" aria-label="' + esc(judul || '') + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(' + sudut + ' .5 .5)">' +
        '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>' +
      '<rect width="' + lebar + '" height="' + tinggi + '" fill="url(#' + id + ')"/>' +
      /* dua busur tipis, mengutip lengkung mark Nusva tanpa memakai logonya */
      '<g fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="' + (tinggi * 0.055) + '" stroke-linecap="round">' +
        '<path d="M' + (lebar * 0.12) + ' ' + (tinggi * 0.86) + 'C' + (lebar * 0.30) + ' ' + (tinggi * 0.20) + ',' + (lebar * 0.48) + ' ' + (tinggi * 0.20) + ',' + (lebar * 0.62) + ' ' + (tinggi * 0.84) + '"/>' +
        '<path d="M' + (lebar * 0.44) + ' ' + (tinggi * 0.86) + 'C' + (lebar * 0.60) + ' ' + (tinggi * 0.22) + ',' + (lebar * 0.78) + ' ' + (tinggi * 0.22) + ',' + (lebar * 0.94) + ' ' + (tinggi * 0.80) + '"/>' +
      '</g>' +
      '<text x="' + (lebar * 0.5) + '" y="' + (tinggi * 0.5) + '" text-anchor="middle" dominant-baseline="central" ' +
        'font-family="Plus Jakarta Sans, system-ui, sans-serif" font-weight="800" ' +
        'font-size="' + (tinggi * 0.30) + '" fill="#fff" fill-opacity=".94" letter-spacing="-2">' + esc(ini) + '</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* Ikon berkas untuk daftar unggahan: bukan foto, tetapi juga bukan kotak kosong. */
const WARNA_EKS = { pdf:'#C8382F', docx:'#1E6FA8', xlsx:'#1E9E6A', pptx:'#D9920E',
                    mp4:'#6D4AED', mp3:'#0FA3B1', png:'#0FA3B1', jpg:'#0FA3B1', jpeg:'#0FA3B1', webp:'#0FA3B1' };
export function ikonBerkas(ext, ukuran){
  const s = ukuran || 44, e = String(ext || '').toLowerCase();
  const w = WARNA_EKS[e] || '#7C93A1';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="' + s + '" height="' + s + '" role="img" aria-label="' + esc(e.toUpperCase()) + '">' +
      '<rect x="7" y="3" width="30" height="38" rx="4" fill="' + w + '" fill-opacity=".12"/>' +
      '<path d="M27 3v8a3 3 0 0 0 3 3h7" fill="none" stroke="' + w + '" stroke-opacity=".45" stroke-width="2"/>' +
      '<text x="22" y="30" text-anchor="middle" font-family="Plus Jakarta Sans, system-ui, sans-serif" ' +
        'font-weight="800" font-size="10" fill="' + w + '">' + esc(e.toUpperCase().slice(0,4)) + '</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* Berkas gambar dan video punya pratinjau sungguhan; sisanya memakai ikon di atas. */
export function pratinjauBerkas(file){
  return new Promise(res => {
    if(!file) return res(null);
    if(file.type && file.type.startsWith('image/')){
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => res(null);
      return r.readAsDataURL(file);
    }
    res(null);
  });
}

function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
