/* Nusva · navigasi bersama, pola bar tipis dengan panel penuh lebar.
   Ditulis sekali di sini supaya produk Nusva lain bisa memakai komponen yang sama
   dengan hanya menukar isi MENU. Aksennya ikut token produk, bukan ditulis mati. */

import { T } from './app.js';

/* p = prefiks relatif, '' untuk halaman akar dan '../' untuk halaman di dalam folder */
export const MENU = p => ([
  { id:'belajar', label:{id:'Belajar',en:'Learn'},
    utama:{ judul:{id:'Jelajahi belajar',en:'Explore learning'}, item:[
      { t:{id:'Beranda belajar',en:'Learning home'}, h:p+'belajar.html' },
      { t:{id:'Semua modul',en:'All modules'},       h:p+'index.html#katalog' },
      { t:{id:'Daily Recall',en:'Daily Recall'},     h:p+'belajar.html#recall', soon:true },
      { t:{id:'Workshop',en:'Workshop'},             h:p+'belajar.html#workshop', soon:true },
      { t:{id:'Progres saya',en:'My progress'},      h:p+'belajar.html#progres', soon:true }
    ]},
    lain:{ judul:{id:'Lainnya dari belajar',en:'More from learning'}, item:[
      { t:{id:'Cara belajarnya',en:'How it works'},        h:p+'index.html#cara' },
      { t:{id:'Sertifikat Penyelesaian',en:'Completion Certificate'}, h:p+'index.html#cara', soon:true },
      { t:{id:'Paket Bukti Karya',en:'Evidence Portfolio'}, h:p+'index.html#cara', soon:true },
      { t:{id:'Verifikasi keaslian',en:'Verify a document'}, h:p+'index.html', soon:true }
    ]} },

  { id:'katalog', label:{id:'Katalog',en:'Catalogue'},
    utama:{ judul:{id:'Jelajahi katalog',en:'Explore the catalogue'}, item:[
      { t:{id:'Semua modul',en:'All modules'},                 h:p+'index.html#katalog' },
      { t:{id:'SKKNI Manajemen SDM',en:'SKKNI HR Management'}, h:p+'index.html#katalog' },
      { t:{id:'SKKNI Periklanan',en:'SKKNI Advertising'},      h:p+'index.html#katalog', soon:true },
      { t:{id:'SKKNI Hubungan Industrial',en:'SKKNI Industrial Relations'}, h:p+'index.html#katalog', soon:true },
      { t:{id:'Soft skill',en:'Soft skills'},                  h:p+'index.html#katalog' }
    ]},
    lain:{ judul:{id:'Lainnya dari katalog',en:'More from the catalogue'}, item:[
      { t:{id:'Track kurasi',en:'Curated tracks'}, h:p+'index.html#katalog', soon:true },
      { t:{id:'Harga',en:'Pricing'},               h:p+'index.html#katalog' },
      { t:{id:'Untuk perusahaan',en:'For companies'}, h:p+'index.html', soon:true }
    ]} },

  { id:'trainer', label:{id:'Untuk Trainer',en:'For Trainers'},
    utama:{ judul:{id:'Jelajahi trainer',en:'Explore trainer'}, item:[
      { t:{id:'Jadi trainer di Nusva',en:'Become a Nusva trainer'}, h:p+'trainer.html' },
      { t:{id:'Cara kerjanya',en:'How it works'},                   h:p+'trainer.html' },
      { t:{id:'Hitung penghasilan',en:'Earnings calculator'},       h:p+'trainer.html' },
      { t:{id:'Daftarkan training',en:'Register a training'},       h:p+'masuk.html?peran=trainer&next=trainer/modul.html' }
    ]},
    lain:{ judul:{id:'Lainnya dari trainer',en:'More from trainer'}, item:[
      { t:{id:'Dashboard trainer',en:'Trainer dashboard'}, h:p+'trainer/dashboard.html' },
      { t:{id:'Bagi hasil dan pajak',en:'Revenue share and tax'}, h:p+'trainer.html' },
      { t:{id:'Kurasi dan gerbang terbit',en:'Curation and publish gate'}, h:p+'trainer.html' }
    ]} },

  { id:'dukungan', label:{id:'Dukungan',en:'Support'},
    utama:{ judul:{id:'Jelajahi dukungan',en:'Explore support'}, item:[
      { t:{id:'Pusat bantuan',en:'Help centre'}, h:'#', soon:true },
      { t:{id:'Hubungi kami',en:'Contact us'},   h:'#', soon:true },
      { t:{id:'Status layanan',en:'Service status'}, h:'#', soon:true }
    ]},
    lain:{ judul:{id:'Ketentuan',en:'Terms'}, item:[
      { t:{id:'Ketentuan layanan',en:'Terms of service'}, h:'#', soon:true },
      { t:{id:'Kebijakan privasi',en:'Privacy policy'},   h:'#', soon:true },
      { t:{id:'Posisi produk',en:'Product position'},     h:p+'index.html' }
    ]} }
]);

const ic = {
  cari:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  tas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7z"/><path d="M9.2 8V6.4a2.8 2.8 0 0 1 5.6 0V8"/></svg>',
  tutup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>'
};

let terbuka = null, _tundaBuka = null, _tundaTutup = null;
function batal(){ clearTimeout(_tundaBuka); clearTimeout(_tundaTutup); }

export function pasangNav(opts){
  const o = opts || {};
  const p = o.prefix || '';
  const el = document.getElementById('nav');
  if(!el) return;
  const menu = MENU(p);

  el.className = 'anav';
  el.innerHTML =
    '<div class="abar">' +
      '<a class="alogo" href="' + p + 'index.html" aria-label="Nusva Learning">' +
        '<img class="c" src="' + p + 'assets/logo-color.svg" alt="Nusva Learning">' +
        '<img class="w" src="' + p + 'assets/logo-white.svg" alt="Nusva Learning">' +
      '</a>' +
      '<nav class="amenu" aria-label="Menu utama">' +
        menu.map(m =>
          '<button class="atop" data-m="' + m.id + '" aria-expanded="false" aria-controls="pnl-' + m.id + '">' +
          (T(m.label.id, m.label.en)) + '</button>').join('') +
      '</nav>' +
      '<span class="asp"></span>' +
      '<button class="aico" data-aksi="bahasa" aria-pressed="false" title="Bahasa">EN</button>' +
      '<button class="aico" data-aksi="tema" aria-pressed="false" title="Tema">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/></svg>' +
      '</button>' +
      '<span class="aakun" id="aakun"></span>' +
    '</div>' +
    menu.map(m => panel(m)).join('');

  let tirai = document.getElementById('atirai');
  if(!tirai){
    tirai = document.createElement('div');
    tirai.className = 'atirai'; tirai.id = 'atirai'; tirai.hidden = true;
    document.body.appendChild(tirai);
  }

  /* Perangkat berpenunjuk halus membuka panel saat kursor lewat, tanpa perlu diklik.
     Layar sentuh dan perangkat tanpa hover tetap memakai klik, karena hover di sana tidak ada. */
  const adaHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  el.querySelectorAll('.atop').forEach(b => {
    b.addEventListener('click', e => { e.preventDefault(); buka(b.dataset.m === terbuka ? null : b.dataset.m); });
    if(adaHover){
      /* jeda niat 90 ms: menyapu kursor melintasi menu tidak boleh memicu panel berkedip */
      b.addEventListener('mouseenter', () => {
        batal();
        if(terbuka) return buka(b.dataset.m);          /* sudah terbuka: pindah seketika */
        _tundaBuka = setTimeout(() => buka(b.dataset.m), 90);
      });
      b.addEventListener('mouseleave', () => clearTimeout(_tundaBuka));
    }
    /* jalur papan ketik: fokus membuka, sama seperti hover */
    b.addEventListener('focus', () => { if(terbuka) buka(b.dataset.m); });
  });

  if(adaHover){
    el.addEventListener('mouseenter', batal);
    el.addEventListener('mouseleave', () => { batal(); _tundaTutup = setTimeout(() => buka(null), 220); });
  }

  tirai.addEventListener('click', () => buka(null));
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && terbuka) buka(null); });
  /* menggulir menutup panel: itu sinyal paling jelas bahwa pengguna sudah selesai dengan menu */
  addEventListener('scroll', () => { if(terbuka) buka(null); }, { passive:true });
  /* fokus berpindah keluar dari bar akan menutup, supaya pengguna papan ketik tidak terjebak */
  el.addEventListener('focusout', e => {
    if(terbuka && !el.contains(e.relatedTarget)) buka(null);
  });

  return el;
}

function panel(m){
  const kol = (k, besar) =>
    '<div class="akol">' +
      '<span class="ahd">' + T(k.judul.id, k.judul.en) + '</span>' +
      k.item.map(i =>
        '<a class="' + (besar ? 'abesar' : 'akecil') + (i.soon ? ' asoon' : '') + '" href="' + (i.soon ? '#' : i.h) + '"' +
        (i.soon ? ' aria-disabled="true"' : '') + '>' +
        '<span>' + T(i.t.id, i.t.en) + '</span>' +
        (i.soon ? '<em class="asoonl">' + T('Coming soon','Coming soon') + '</em>' : '') +
        '</a>').join('') +
    '</div>';
  return '<div class="apanel" id="pnl-' + m.id + '" hidden>' +
           '<div class="apanel-in">' + kol(m.utama, true) + kol(m.lain, false) + '</div>' +
         '</div>';
}

function buka(id){
  batal();
  const el = document.getElementById('nav');
  el.querySelectorAll('.apanel').forEach(p => { p.hidden = true; });
  el.querySelectorAll('.atop').forEach(b => b.setAttribute('aria-expanded','false'));
  document.getElementById('atirai').hidden = true;
  document.documentElement.classList.remove('anav-buka');
  terbuka = null;
  if(!id) return;
  const p = document.getElementById('pnl-' + id);
  if(!p) return;
  p.hidden = false;
  el.querySelector('.atop[data-m="' + id + '"]').setAttribute('aria-expanded','true');
  document.getElementById('atirai').hidden = false;
  document.documentElement.classList.add('anav-buka');
  terbuka = id;
}

/* Rail thumbnail di bawah bar, pola deretan produk. Dipakai halaman yang punya jajaran. */
export function pasangRail(target, items, prefix){
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if(!el) return;
  el.className = 'arail';
  el.innerHTML = '<div class="arail-in">' + items.map(i =>
    '<a class="aitem' + (i.soon ? ' asoon' : '') + '" href="' + (i.soon ? '#' : i.h) + '"' +
      (i.soon ? ' aria-disabled="true"' : '') + '>' +
      '<span class="ath">' + i.gambar + '</span>' +
      '<span class="atx">' + i.judul + '</span>' +
      (i.tag ? '<em class="atag">' + i.tag + '</em>' : '') +
    '</a>').join('') + '</div>';
}
