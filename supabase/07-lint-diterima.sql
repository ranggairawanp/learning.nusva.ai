-- Nusva Learning · daftar peringatan yang diterima dengan sadar
--
-- Jalankan SETELAH 05 dan 06. Aman diulang.
--
-- ---------------------------------------------------------------------------
-- MASALAH YANG DISELESAIKAN BERKAS INI
--
-- Advisor Supabase dijalankan oleh splinter (github.com/supabase/splinter).
-- Tiap temuan punya `cache_key`, dan dokumentasi splinter menyebut kunci itu
-- memang dirancang supaya "users can add to an exclusion list". Tetapi daftar
-- pengecualian itu ada di sisi yang memakai splinter, dan dashboard Supabase
-- belum menyediakannya. Tim Supabase menyatakan langsung di diskusi 28608 dan
-- 33685 bahwa saat ini tidak ada cara mematikan satu temuan.
--
-- Akibatnya nyata dan buruk: layar Advisor Nusva akan selamanya kuning karena
-- tiga fungsi yang justru menjaga akses. Layar yang selamanya kuning berhenti
-- dibaca orang, dan temuan sungguhan berikutnya akan tenggelam di antara enam
-- baris yang sudah biasa dilihat. Itu persis cara sebuah kebocoran lolos.
--
-- Maka daftar pengecualiannya dibuat di sini, di dalam database, memakai kunci
-- yang sama dengan splinter. Alurnya jadi: ekspor JSON dari Advisor, tempel ke
-- fungsi di bawah, dan yang keluar HANYA yang belum pernah diputuskan. Nol
-- baris berarti benar-benar bersih. Satu baris berarti ada yang baru dan wajib
-- dibaca.
--
-- Tiap pengecualian WAJIB punya alasan dan tanggal tinjau ulang. Pengecualian
-- tanpa tanggal kedaluwarsa bukan keputusan, itu cuma lupa yang dirapikan.
-- ---------------------------------------------------------------------------

create schema if not exists privat;

create table if not exists privat.lint_diterima (
  cache_key   text primary key,
  lint        text not null,
  alasan      text not null,
  ditetapkan  date not null default current_date,
  tinjau_lagi date not null
);

comment on table privat.lint_diterima is
  'Temuan Advisor yang sudah diputuskan dan sengaja dibiarkan. Kuncinya memakai '
  'cache_key splinter. Bukan tempat menyembunyikan yang belum sempat dikerjakan: '
  'tiap baris wajib punya alasan dan tanggal tinjau ulang.';

insert into privat.lint_diterima (cache_key, lint, alasan, tinjau_lagi) values

  ('extension_in_public_pg_net',
   'extension_in_public',
   'Fungsi pg_net hidup di skema net, bukan public, dan PostgREST hanya mengekspos public, '
   'jadi tidak satu pun fungsinya bisa disentuh lewat API. Yang terdaftar di public cuma '
   'pendaftaran ekstensinya. Memindahkannya berisiko memutus net.http_post yang dipakai '
   'penjadwal transkrip tiap menit, dan risiko itu lebih besar daripada peringatan yang ditutupnya.',
   date '2027-01-31'),

  ('anon_security_definer_function_executable_public_isi_submodul_sub bigint',
   'anon_security_definer_function_executable',
   'isi_submodul JUSTRU penjaganya. Kolom submodules.konten tidak pernah bisa dibaca langsung '
   'dari tabel, dan fungsi ini satu-satunya jalan keluar, yang mengembalikan {"terkunci":true} '
   'bila bagiannya tidak gratis dan penggunanya belum berhak. Mencabutnya dari anon akan '
   'mematikan bagian gratis yang boleh dibaca tanpa akun, yaitu jalan masuk utama produk.',
   date '2027-01-31'),

  ('authenticated_security_definer_function_executable_public_isi_submodul_sub bigint',
   'authenticated_security_definer_function_executable',
   'Sama dengan baris anon di atas. Advisor memisahkan anon dan authenticated, jadi satu '
   'fungsi muncul dua kali.',
   date '2027-01-31'),

  ('anon_security_definer_function_executable_public_soal_submodul_sub bigint',
   'anon_security_definer_function_executable',
   'soal_submodul mengembalikan pertanyaan dan opsi TANPA kolom kunci jawaban, dan hanya untuk '
   'bagian gratis atau pengguna yang berhak. Tabel quiz_questions sendiri tertutup, jadi ini '
   'satu-satunya jalan dan pemeriksaannya ada di dalam fungsinya.',
   date '2027-01-31'),

  ('authenticated_security_definer_function_executable_public_soal_submodul_sub bigint',
   'authenticated_security_definer_function_executable',
   'Sama dengan baris anon di atas.',
   date '2027-01-31'),

  ('anon_security_definer_function_executable_public_progres_agregat_',
   'anon_security_definer_function_executable',
   'RLS bekerja per baris sementara yang boleh keluar hanya hasil hitungannya, jadi menembus '
   'RLS memang alatnya, bukan kecelakaannya. Ambang k-anonimitas 10 (keputusan 39) dipaksa di '
   'dalam fungsinya: di bawah itu angkanya null dan cukup=false.',
   date '2027-01-31'),

  ('authenticated_security_definer_function_executable_public_progres_agregat_',
   'authenticated_security_definer_function_executable',
   'Sama dengan baris anon di atas.',
   date '2027-01-31')

on conflict (cache_key) do update
  set lint = excluded.lint, alasan = excluded.alasan, tinjau_lagi = excluded.tinjau_lagi;


-- =========================================================================
-- Penyaring: tempel JSON ekspor Advisor, yang keluar hanya yang belum diputuskan
-- =========================================================================
create or replace function privat.lint_baru(laporan jsonb)
returns table (
  keputusan text,
  level     text,
  lint      text,
  temuan    text,
  cache_key text
)
language sql stable set search_path = privat, public as $$
  with t as (
    select x->>'cache_key'                as ck,
           x->>'name'                     as nama,
           x->>'level'                    as lvl,
           coalesce(x->>'detail', x->>'description') as det
    from jsonb_array_elements(laporan) x
  )
  -- yang belum pernah diputuskan, ditaruh paling atas
  select 'BARU, wajib dibaca', t.lvl, t.nama, t.det, t.ck
    from t left join privat.lint_diterima d on d.cache_key = t.ck
   where d.cache_key is null

  union all

  -- pengecualian yang tanggal tinjaunya sudah lewat, ikut naik jadi pekerjaan
  select 'KEDALUWARSA, tinjau lagi', t.lvl, t.nama, t.det, t.ck
    from t join privat.lint_diterima d on d.cache_key = t.ck
   where d.tinjau_lagi < current_date

  order by 1, 3;
$$;

comment on function privat.lint_baru(jsonb) is
  'Tempel hasil Export dari Advisor. Nol baris berarti tidak ada temuan yang belum '
  'diputuskan. Pengecualian yang tanggal tinjaunya lewat ikut muncul, sehingga daftar '
  'pengecualian tidak bisa jadi tempat sampah permanen.';


-- =========================================================================
-- Verifikasi dan cara pakai
-- =========================================================================
-- Isi daftar pengecualian saat ini:
select lint, ditetapkan, tinjau_lagi, left(alasan, 70) || '…' as alasan
  from privat.lint_diterima order by lint, cache_key;

-- Cara memeriksa laporan Advisor berikutnya. Ganti isi kurung dengan hasil
-- tombol Export di halaman Advisor, lalu jalankan. Nol baris berarti bersih:
--
--   select * from privat.lint_baru('[ ...tempel JSON di sini... ]'::jsonb);
--
-- Contoh dengan satu temuan yang belum diputuskan dan satu yang sudah:
select * from privat.lint_baru($$[
  {"name":"rls_disabled_in_public","level":"ERROR","detail":"Table public.contoh has RLS disabled",
   "cache_key":"rls_disabled_in_public_public_contoh"},
  {"name":"extension_in_public","level":"WARN","detail":"Extension pg_net is installed in the public schema",
   "cache_key":"extension_in_public_pg_net"}
]$$::jsonb);
