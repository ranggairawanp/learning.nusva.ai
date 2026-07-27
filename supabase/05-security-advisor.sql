-- Nusva Learning · menutup tiga Error di Security Advisor
--
-- Jalankan di SQL Editor. Aman diulang. Tidak ada data yang tersentuh.
--
-- ---------------------------------------------------------------------------
-- KENAPA INI BUKAN SEKADAR MEMBUNGKAM LINTER
--
-- View di Postgres secara baku berjalan dengan hak PEMBUATNYA, bukan hak orang
-- yang membacanya. Artinya sebuah view menembus Row Level Security tabel di
-- bawahnya. Untuk dua dari tiga view di bawah ini, itu bukan yang kita mau, dan
-- salah satunya membocorkan data sungguhan. Untuk satu view sisanya, menembus
-- RLS justru memang tugasnya, jadi ia diubah bentuknya supaya niatnya terbaca.
-- ---------------------------------------------------------------------------


-- =========================================================================
-- 1. submodules_publik  ·  INI KEBOCORAN SUNGGUHAN, BUKAN PERINGATAN KOSMETIK
-- =========================================================================
-- Tabel submodules sudah punya kebijakan yang benar: daftar sub-modul hanya
-- terbuka kalau modul induknya berstatus 'terbit', atau kalau yang membaca
-- trainer pemiliknya. Kebijakan itu ditulis dengan sadar dan bunyinya tepat.
--
-- Masalahnya, view ini menembusnya. Selama ia berjalan dengan hak pembuatnya,
-- siapa pun tanpa akun bisa membaca SELURUH baris submodules, termasuk milik
-- modul yang masih draf dan belum pernah diterbitkan trainernya. Judul bagian,
-- deskripsi, durasi, semuanya. Trainer yang sedang menyiapkan modul rahasia
-- tidak akan pernah tahu materinya sudah bisa dibaca orang.
--
-- security_invoker mengembalikan view ini ke perilaku yang sejak awal kita
-- maksud. Tidak ada satu pun kolom yang berubah, jadi klien tidak perlu diubah.
alter view public.submodules_publik set (security_invoker = on);


-- =========================================================================
-- 2. reg_bidang  ·  aman sejak awal, tetapi tetap dirapikan
-- =========================================================================
-- View ini membaca registry SKKNI, dan ketiga tabel di bawahnya memang sudah
-- punya kebijakan baca terbuka. Jadi tidak ada yang bocor di sini. Tapi
-- membiarkannya menembus RLS berarti kalau suatu hari kebijakan registry
-- diperketat, view ini akan diam-diam tetap membuka semuanya, dan tidak ada
-- yang menyadarinya sampai jauh hari.
--
-- Hasil bacanya persis sama hari ini. Yang berubah cuma: mulai sekarang ia
-- ikut aturan, bukan mengecualikan diri dari aturan.
alter view public.reg_bidang set (security_invoker = on);


-- =========================================================================
-- 3. progres_agregat  ·  memang HARUS menembus RLS, dan justru itu masalahnya
-- =========================================================================
-- Yang ini berbeda dari dua di atas. Tugasnya memang menghitung angka dari
-- baris progres milik orang lain, dan RLS tidak bisa dipakai untuk itu karena
-- RLS bekerja per baris sementara yang kita izinkan cuma hasil hitungannya.
-- Jadi menembus RLS bukan kecelakaan, itu memang alatnya.
--
-- Tapi begitu ditulis ulang seperti ini, cacat yang sebenarnya jadi kelihatan:
-- VIEW LAMA TIDAK PUNYA AMBANG SAMA SEKALI. Kalau sebuah modul baru punya satu
-- peserta, learner_tuntas bernilai 0 atau 1, dan angka itu memberi tahu dunia
-- apakah satu orang tertentu menyelesaikan modulnya. Itu melanggar keputusan 39
-- yang mengunci k-anonimitas 10 per potongan, dan linter Supabase hanya jadi
-- pintu yang membuat kita melihatnya.
--
-- Maka bentuknya diubah dari view jadi fungsi, sehingga ambangnya bisa dipaksa
-- di dalam, dan niat "ini memang sengaja menembus RLS" terbaca dari bentuknya.
drop view if exists public.progres_agregat;

create or replace function public.progres_agregat()
returns table (
  module_id      bigint,
  learner_mulai  int,
  learner_tuntas int,
  cukup          boolean   -- false berarti angkanya ditahan, bukan nol
)
language sql
stable
security definer
set search_path = public
as $$
  with h as (
    select s.module_id                                                   as mid,
           count(distinct p.learner_id)                                  as mulai,
           count(distinct p.learner_id) filter (where p.status = 'tuntas') as tuntas
    from public.progress p
    join public.submodules s on s.id = p.submodule_id
    group by s.module_id
  )
  select h.mid,
         case when h.mulai >= 10 then h.mulai::int  else null end,
         case when h.mulai >= 10 then h.tuntas::int else null end,
         h.mulai >= 10
  from h;
$$;

comment on function public.progres_agregat() is
  'Agregat progres per modul. Sengaja security definer karena RLS bekerja per baris '
  'sementara yang boleh keluar hanya hasil hitungannya. Ambang k-anonimitas 10 '
  '(keputusan 39): di bawah itu angkanya null dan cukup=false, sehingga layar bisa '
  'menyatakan bahwa datanya ditahan, bukan menampilkan nol yang menyesatkan.';

revoke all on function public.progres_agregat() from public;
grant execute on function public.progres_agregat() to anon, authenticated;

-- Cara memanggilnya berubah dari .from('progres_agregat') jadi
-- .rpc('progres_agregat'). Hari ini belum ada satu pun kode yang memanggilnya,
-- jadi tidak ada yang patah.


-- =========================================================================
-- Verifikasi
-- =========================================================================
-- Harus mengembalikan dua baris, dua-duanya security_invoker = true:
select c.relname as view_terdaftar,
       coalesce((select option_value from pg_options_to_table(c.reloptions)
                  where option_name = 'security_invoker'), 'off') as security_invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'v'
   and c.relname in ('submodules_publik', 'reg_bidang', 'progres_agregat')
 order by c.relname;

-- Harus mengembalikan satu baris bernama progres_agregat:
select p.proname as fungsi, p.prosecdef as security_definer
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'progres_agregat';
