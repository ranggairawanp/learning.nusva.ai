/* Konfigurasi publik Nusva Learning.
   Kunci di bawah adalah PUBLISHABLE key Supabase, memang dirancang untuk dipasang di sisi klien.
   Keamanannya bersandar pada Row Level Security, bukan pada kerahasiaan kunci ini.
   JANGAN PERNAH menaruh service_role atau secret key di berkas ini atau di repo mana pun. */
window.NUSVA = {
  supabaseUrl: 'https://rbectkwpqpwdadrxcaob.supabase.co',
  supabaseKey: 'sb_publishable_ZklmnxDtV-TXnIdNRVcM8w_dUNncWk3',
  situs: 'https://learning.nusva.ai',
  /* GANTI ke alamat yang benar-benar dibaca orang. Dipakai formulir Bicara untuk tim sebagai
     jalur cadangan kalau tabel permintaan_tim belum dibuat di Supabase. Satu tempat, bukan
     ditulis ulang di tiap halaman. */
  emailKontak: 'halo@nusva.ai'
};
