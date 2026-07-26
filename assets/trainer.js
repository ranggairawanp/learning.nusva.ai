/* Nusva Learning · lapisan bersama halaman trainer.
   Isi: bar atas beserta foto dan penjaga sesi, pengambil registry SKKNI, dan autosave draf.
   Dipakai oleh trainer/dashboard.html dan trainer/modul.html. */

import { klien, pengguna, keluar, T, pasangBahasa, pasangTema, toast, terkonfigurasi } from './app.js';

/* ---------------------------------------------------------------- bar atas */
const HAL = [
  { id:'dashboard', href:'dashboard.html', id_:'Dashboard', en:'Dashboard' },
  { id:'modul',     href:'modul.html',     id_:'Modul baru', en:'New module' }
];

/* Menyuntik bar atas ke <header id="topbar">. Markupnya cukup ditulis sekali,
   sehingga menambah halaman trainer keempat biayanya hampir nol. */
export async function pasangChrome(aktif){
  const bar = document.getElementById('topbar');
  if(!bar) return null;
  bar.className = 'tnav';
  bar.innerHTML =
    '<a class="lockup" href="../index.html" aria-label="Nusva Learning">' +
      '<img class="c" src="../assets/logo-color.svg" alt="Nusva Learning">' +
      '<img class="w" src="../assets/logo-white.svg" alt="Nusva Learning">' +
    '</a>' +
    '<nav class="tlinks" aria-label="Halaman trainer">' +
      HAL.map(h => '<a href="' + h.href + '"' + (h.id === aktif ? ' aria-current="page"' : '') +
                   ' data-en="' + h.en + '">' + h.id_ + '</a>').join('') +
    '</nav>' +
    '<span class="sp"></span>' +
    '<span id="simpanTanda" class="simpan" role="status"></span>' +
    '<button class="chip" data-aksi="bahasa" aria-pressed="false">EN</button>' +
    '<button class="chip" data-aksi="tema" data-teks aria-pressed="false">Gelap</button>' +
    '<span class="whoWrap" id="whoWrap"></span>';

  bar.querySelector('[data-aksi="bahasa"]').addEventListener('click', e => pasangBahasa(e.currentTarget));
  bar.querySelector('[data-aksi="tema"]').addEventListener('click', e => pasangTema(e.currentTarget));

  const u = await pengguna();
  gambarAkun(u);
  return u;
}

function gambarAkun(u){
  const box = document.getElementById('whoWrap');
  if(!box) return;
  if(!u){
    box.innerHTML = '<a class="btn btn-quiet sm" href="../masuk.html?peran=trainer">' + T('Masuk','Sign in') + '</a>';
    return;
  }
  const nama = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email || 'Trainer';
  const foto = u.user_metadata && u.user_metadata.avatar_url;
  const ini  = nama.trim().split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase();
  box.innerHTML =
    '<span class="who"><b></b><span class="cap">' + T('Trainer','Trainer') + '</span></span>' +
    '<span class="ava" id="ava">' +
      '<span class="ph" id="avaPh">' + (foto ? '<img alt="">' : '<span>' + ini + '</span>') + '</span>' +
      '<button class="edit" id="avaBtn" aria-label="' + T('Ganti foto trainer','Change trainer photo') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>' +
      '</button>' +
      '<input type="file" id="avaFile" accept="image/png,image/jpeg,image/webp">' +
    '</span>' +
    '<button class="chip" id="btnKeluar">' + T('Keluar','Sign out') + '</button>';
  box.querySelector('.who b').textContent = nama;
  if(foto) box.querySelector('#avaPh img').src = foto;
  box.querySelector('#btnKeluar').addEventListener('click', keluar);
  pasangFoto();
}

/* ---------------------------------------------------------------- foto trainer */
function pasangFoto(){
  const ava = document.getElementById('ava');
  const inp = document.getElementById('avaFile');
  if(!ava || !inp) return;
  document.getElementById('avaBtn').addEventListener('click', () => inp.click());
  inp.addEventListener('change', e => { terimaFoto(e.target.files && e.target.files[0]); e.target.value = ''; });
  ava.addEventListener('dragover', e => { e.preventDefault(); ava.classList.add('drop'); });
  ava.addEventListener('dragleave', () => ava.classList.remove('drop'));
  ava.addEventListener('drop', e => { e.preventDefault(); ava.classList.remove('drop');
    terimaFoto(e.dataTransfer.files && e.dataTransfer.files[0]); });
}
function terimaFoto(f){
  if(!f) return;
  if(!['image/png','image/jpeg','image/webp'].includes(f.type)){
    toast(T('Foto harus JPG, PNG, atau WEBP','Photo must be JPG, PNG, or WEBP')); return; }
  if(f.size > 2 * 1024 * 1024){
    toast(T('Foto lebih dari 2 MB. Pilih yang lebih kecil.','Photo is over 2 MB. Pick a smaller one.')); return; }
  const r = new FileReader();
  r.onload = () => {
    const ph = document.getElementById('avaPh');
    ph.innerHTML = '<img alt="' + T('Foto trainer','Trainer photo') + '">';
    ph.querySelector('img').src = r.result;
    toast(T('Foto diperbarui','Photo updated'));
    /* Produksi: unggah ke Supabase Storage lalu simpan URL-nya ke profiles.foto_url. */
  };
  r.readAsDataURL(f);
}

/* ---------------------------------------------------------------- penjaga sesi */
/* Halaman trainer tetap terbuka tanpa masuk, tetapi menyatakannya terang-terangan
   lewat pita di atas, bukan diam-diam menampilkan data contoh seolah data sungguhan. */
export function pitaPratinjau(sudahMasuk, tujuan){
  if(sudahMasuk) return;
  const p = document.createElement('div');
  p.className = 'pita-pratinjau';
  p.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.2"/></svg>' +
    '<span>' + T('Anda melihat mode pratinjau dengan data contoh. Masuk untuk memakai data Anda sendiri.',
                 'You are seeing preview mode with sample data. Sign in to work with your own.') + '</span>' +
    '<a class="btn btn-quiet sm" href="../masuk.html?peran=trainer&next=' + encodeURIComponent(tujuan) + '">' +
      T('Masuk','Sign in') + '</a>';
  document.body.insertBefore(p, document.body.firstChild);
  document.documentElement.classList.add('ada-pita');
}

/* ---------------------------------------------------------------- registry SKKNI */
/* Diambil saat dibutuhkan: daftar bidang dulu, dan unit beserta KUK-nya hanya untuk
   bidang yang benar-benar dipilih trainer. Sumber utama Supabase, cadangan berkas JSON. */
const _cacheBidang = { data:null };
const _cacheUnit = {};

export async function ambilBidang(){
  if(_cacheBidang.data) return _cacheBidang.data;
  const c = terkonfigurasi() ? await klien() : null;
  if(c){
    const { data, error } = await c.from('reg_bidang').select('kode,nama_id,nama_en,sk_id,sk_en,unit');
    if(!error && data && data.length){
      _cacheBidang.data = data.map(r => ({
        kode:r.kode, nama:{id:r.nama_id,en:r.nama_en}, sk:{id:r.sk_id,en:r.sk_en}, unit:r.unit
      }));
      return _cacheBidang.data;
    }
  }
  const j = await fetch('../assets/registry/index.json').then(r => r.json());
  _cacheBidang.data = j.frameworks;
  return _cacheBidang.data;
}

export async function ambilBidangIsi(kode){
  if(_cacheUnit[kode]) return _cacheUnit[kode];
  const c = terkonfigurasi() ? await klien() : null;
  if(c){
    const { data:units, error:e1 } = await c.from('reg_units')
      .select('kode,judul').eq('framework_kode', kode).order('urutan');
    if(!e1 && units && units.length){
      const { data:kuks } = await c.from('reg_kuk')
        .select('unit_kode,kode,pernyataan')
        .in('unit_kode', units.map(u => u.kode)).order('urutan');
      const kuk = {};
      (kuks || []).forEach(k => { (kuk[k.unit_kode] = kuk[k.unit_kode] || []).push([k.kode, k.pernyataan]); });
      _cacheUnit[kode] = { units, kuk };
      return _cacheUnit[kode];
    }
  }
  const j = await fetch('../assets/registry/' + kode + '.json').then(r => r.json());
  _cacheUnit[kode] = { units:j.units, kuk:j.kuk };
  return _cacheUnit[kode];
}

/* ---------------------------------------------------------------- pembanding harga */
/* Trainer diminta menentukan angka tanpa tahu modul sejenis laku di harga berapa, dan akibatnya
   dua-duanya buruk: menetapkan terlalu rendah, atau menunda karena ragu. Ini mengambil harga
   modul yang BENAR-BENAR terbit. Kalau belum ada satu pun, jawabannya harus jujur berupa
   "belum ada pembanding", bukan angka karangan yang terlihat meyakinkan. */
export async function ambilHargaTerbit(bidang){
  const kosong = { n:0, median:null, min:null, maks:null, bidang:bidang||null };
  if(!terkonfigurasi()) return kosong;
  const c = await klien();
  if(!c) return kosong;
  let q = c.from('modules').select('harga_idr,bidang').eq('status','terbit').gt('harga_idr',0);
  if(bidang) q = q.eq('bidang', bidang);
  const { data, error } = await q;
  if(error || !data || !data.length) return kosong;
  const h = data.map(r => Number(r.harga_idr)).filter(x => x > 0).sort((a,b) => a - b);
  if(!h.length) return kosong;
  const m = h.length % 2 ? h[(h.length - 1) / 2] : (h[h.length/2 - 1] + h[h.length/2]) / 2;
  return { n:h.length, median:Math.round(m), min:h[0], maks:h[h.length-1], bidang:bidang||null };
}

/* ---------------------------------------------------------------- autosave draf */
let _tunda = null, _terakhir = '';
export function tandaSimpan(teks){
  const el = document.getElementById('simpanTanda');
  if(el) el.textContent = teks || '';
}
/* Menyimpan paling sering sekali per 4 detik, dan hanya bila isinya benar-benar berubah. */
export function simpanDraf(ambilIsi, moduleId){
  clearTimeout(_tunda);
  _tunda = setTimeout(async () => {
    const isi = ambilIsi();
    const teks = JSON.stringify(isi);
    if(teks === _terakhir) return;
    _terakhir = teks;
    const u = await pengguna();
    if(!u){ simpanLokal(teks, moduleId); tandaSimpan(T('Draf tersimpan di perangkat ini','Draft saved on this device')); return; }
    const c = await klien();
    if(!c){ simpanLokal(teks, moduleId); return; }
    const baris = { trainer_id:u.id, module_id: moduleId || null, isi, updated_at: new Date().toISOString() };
    const { error } = await c.from('module_drafts')
      .upsert(baris, { onConflict: moduleId ? 'trainer_id,module_id' : 'trainer_id' });
    tandaSimpan(error
      ? T('Draf belum tersimpan, mencoba lagi','Draft not saved yet, retrying')
      : T('Draf tersimpan · ' + jam(), 'Draft saved · ' + jam()));
    if(error) simpanLokal(teks, moduleId);
  }, 4000);
}
function jam(){
  const d = new Date();
  return String(d.getHours()).padStart(2,'0') + '.' + String(d.getMinutes()).padStart(2,'0');
}
function kunciLokal(moduleId){ return 'nusva.draf.' + (moduleId || 'baru'); }
function simpanLokal(teks, moduleId){ try{ localStorage.setItem(kunciLokal(moduleId), teks); }catch(e){} }

export async function ambilDraf(moduleId){
  const u = await pengguna();
  if(u){
    const c = await klien();
    if(c){
      let q = c.from('module_drafts').select('isi,updated_at').eq('trainer_id', u.id);
      q = moduleId ? q.eq('module_id', moduleId) : q.is('module_id', null);
      const { data } = await q.maybeSingle();
      if(data && data.isi) return data.isi;
    }
  }
  try{
    const t = localStorage.getItem(kunciLokal(moduleId));
    if(t) return JSON.parse(t);
  }catch(e){}
  return null;
}
export async function hapusDraf(moduleId){
  try{ localStorage.removeItem(kunciLokal(moduleId)); }catch(e){}
  const u = await pengguna(); if(!u) return;
  const c = await klien(); if(!c) return;
  let q = c.from('module_drafts').delete().eq('trainer_id', u.id);
  q = moduleId ? q.eq('module_id', moduleId) : q.is('module_id', null);
  await q;
}
