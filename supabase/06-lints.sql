-- Nusva Learning · menutup Warning yang tersisa di Security Advisor
--
-- Jalankan SETELAH 00, 03, dan 05. Aman diulang. Tidak ada data yang tersentuh.
--
-- ---------------------------------------------------------------------------
-- PRINSIP YANG DIPAKAI MEMILAH
--
-- Linter Supabase menandai SEMUA fungsi security definer yang bisa dipanggil
-- lewat REST. Sebagian memang salah dan harus ditutup. Sebagian lagi memang
-- sengaja begitu, karena itulah gunanya. Menutup semuanya tanpa memilah akan
-- mematikan produk; membiarkan semuanya tanpa memilah akan membiarkan lubang.
--
-- Jadi tiap fungsi ditaruh di salah satu dari tiga kotak:
--
--   1. FUNGSI TRIGGER. Tidak seorang pun perlu memanggilnya lewat REST, karena
--      yang memanggilnya adalah Postgres sendiri saat baris berubah. Trigger
--      tetap jalan meski EXECUTE dicabut dari semua orang. Maka dicabut.
--
--   2. PEMBANTU RLS. Dipakai di dalam kebijakan dan di dalam fungsi lain,
--      tidak pernah dipanggil klien. Tidak bisa dicabut EXECUTE-nya, karena
--      kebijakan dijalankan atas nama orang yang bertanya dan butuh izin itu.
--      Maka dipindahkan ke skema yang tidak diekspos PostgREST.
--
--   3. API SUNGGUHAN. Memang dirancang dipanggil klien, dan pemeriksaan haknya
--      ada di dalam fungsinya. Dibiarkan, dan alasannya ditulis di comment
--      supaya peringatan yang tersisa terbaca sebagai keputusan, bukan sisa.
-- ---------------------------------------------------------------------------


-- =========================================================================
-- 1. Skema privat: tempat pembantu RLS, tidak diekspos ke REST
-- =========================================================================
-- PostgREST hanya mengekspos skema public. Apa pun yang pindah ke sini hilang
-- dari /rest/v1/rpc/ tanpa kehilangan kemampuannya dipanggil dari kebijakan.
create schema if not exists privat;
grant usage on schema privat to anon, authenticated;

comment on schema privat is
  'Fungsi pembantu Row Level Security. Tidak diekspos PostgREST. Isinya tidak '
  'pernah dipanggil klien, hanya oleh kebijakan dan oleh fungsi lain.';


-- =========================================================================
-- 2. Memindahkan dua pembantu RLS
-- =========================================================================
-- alter function ... set schema membuat kebijakan ikut menunjuk alamat baru
-- dengan sendirinya, karena kebijakan menyimpan rujukan ke fungsinya, bukan ke
-- namanya. Sudah diuji: kebijakan yang tadinya berbunyi punya_akses(module_id)
-- berubah sendiri jadi privat.punya_akses(module_id) dan tetap bekerja.
--
-- Yang TIDAK ikut berubah sendiri adalah isi fungsi lain yang memanggilnya
-- dengan nama lengkap, karena badan fungsi disimpan sebagai teks dan baru
-- diterjemahkan saat dijalankan. Ketiga fungsi itu ditulis ulang di bagian 3.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'punya_akses') then
    alter function public.punya_akses(bigint) set schema privat;
  end if;

  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'media_boleh_dilihat') then
    alter function public.media_boleh_dilihat(uuid) set schema privat;
  end if;
end $$;

grant execute on function privat.punya_akses(bigint)         to anon, authenticated;
grant execute on function privat.media_boleh_dilihat(uuid)   to anon, authenticated;


-- =========================================================================
-- 3. Menulis ulang yang memanggil mereka dengan nama lengkap
-- =========================================================================
-- create or replace mempertahankan identitas fungsinya, jadi kebijakan yang
-- menunjuk media_boleh_dilihat tetap utuh dan tidak perlu dibuat ulang.

create or replace function privat.media_boleh_dilihat(m_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.media md
    left join public.submodules sm on sm.id = md.submodule_id
    join public.modules mo on mo.id = md.module_id
    where md.id = m_id
      and (
        md.trainer_id = auth.uid()                                -- pemiliknya
        or (mo.status = 'terbit' and coalesce(sm.gratis, false))   -- bagian gratis
        or privat.punya_akses(md.module_id)                        -- sudah membeli
      )
  );
$$;

create or replace function public.isi_submodul(sub bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  b public.submodules;
begin
  select * into b from public.submodules where id = sub;
  if b.id is null then
    return null;
  end if;
  if b.gratis or privat.punya_akses(b.module_id) then
    return b.konten;
  end if;
  return jsonb_build_object('terkunci', true);
end $$;

create or replace function public.soal_submodul(sub bigint)
returns table (id bigint, urutan smallint, jenis text, pertanyaan text, opsi jsonb)
language sql stable security definer set search_path = public as $$
  select q.id, q.urutan, q.jenis, q.pertanyaan, q.opsi
  from public.quiz_questions q
  join public.submodules s on s.id = q.submodule_id
  where q.submodule_id = sub
    and (s.gratis or privat.punya_akses(s.module_id))
  order by q.urutan;
$$;


-- =========================================================================
-- 4. Fungsi trigger: search_path dipatok, EXECUTE dicabut
-- =========================================================================
-- search_path yang tidak dipatok berarti fungsinya menerjemahkan nama tabel
-- memakai daftar skema milik siapa pun yang memicunya. Dipatok kosong adalah
-- yang paling ketat, dan kedua fungsi ini memang tidak menyentuh tabel mana
-- pun, cuma kolom pada baris yang sedang lewat.
alter function public.set_quiz_posisi()  set search_path = '';
alter function public.sentuh_transkrip() set search_path = '';

-- Trigger dijalankan Postgres sendiri dan tidak memeriksa izin pemanggil, jadi
-- mencabut EXECUTE tidak mematikan apa pun. Yang mati cuma kemungkinan orang
-- memanggilnya lewat /rest/v1/rpc/ dan membuat baris profil atau baris
-- transkrip di luar alurnya.
revoke execute on function public.buat_profil()           from public, anon, authenticated;
revoke execute on function public.buat_baris_transkrip()  from public, anon, authenticated;
revoke execute on function public.set_quiz_posisi()       from public, anon, authenticated;
revoke execute on function public.sentuh_transkrip()      from public, anon, authenticated;


-- =========================================================================
-- 5. Yang SENGAJA dibiarkan, beserta alasannya
-- =========================================================================
-- Ketiga fungsi ini akan tetap muncul sebagai Warning di Security Advisor.
-- Itu bukan sisa pekerjaan, itu keputusan. Comment di bawah membuat alasannya
-- ikut tersimpan di dalam database, sehingga orang berikutnya yang membuka
-- Advisor tidak menutupnya karena mengira belum sempat ditutup.

comment on function public.isi_submodul(bigint) is
  'SENGAJA security definer dan terbuka untuk anon. Ia justru PENJAGA-nya: '
  'kolom konten tidak pernah bisa dibaca langsung dari tabel, dan satu-satunya '
  'jalan keluar adalah fungsi ini, yang mengembalikan {"terkunci":true} bila '
  'bagiannya tidak gratis dan penggunanya belum berhak. Mencabutnya dari anon '
  'akan mematikan bagian gratis yang boleh dibaca tanpa akun.';

comment on function public.soal_submodul(bigint) is
  'SENGAJA security definer dan terbuka untuk anon. Mengembalikan pertanyaan '
  'dan opsi TANPA kolom kunci jawaban, dan hanya untuk bagian gratis atau '
  'pengguna yang berhak. Tabel quiz_questions sendiri tertutup, jadi ini '
  'satu-satunya jalan dan pemeriksaannya ada di dalam.';

comment on function public.progres_agregat() is
  'SENGAJA security definer. RLS bekerja per baris sementara yang boleh keluar '
  'hanya hasil hitungannya, jadi menembus RLS memang alatnya. Ambang '
  'k-anonimitas 10 (keputusan 39) dipaksa di dalam: di bawah itu angkanya null '
  'dan cukup=false.';


-- =========================================================================
-- 6. Verifikasi
-- =========================================================================
-- (a) Dua pembantu harus sudah pindah ke privat, nol sisa di public:
select n.nspname as skema, p.proname as fungsi
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where p.proname in ('punya_akses', 'media_boleh_dilihat')
 order by p.proname;

-- (b) Empat fungsi trigger harus tidak bisa dieksekusi anon maupun authenticated:
select p.proname as fungsi,
       has_function_privilege('anon',          p.oid, 'execute') as anon_bisa,
       has_function_privilege('authenticated', p.oid, 'execute') as login_bisa,
       coalesce(array_to_string(p.proconfig, ', '), '(tidak dipatok)') as search_path
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('buat_profil','buat_baris_transkrip','set_quiz_posisi','sentuh_transkrip')
 order by p.proname;

-- (c) Tiga API yang sengaja dibiarkan harus TETAP bisa dipanggil:
select p.proname as fungsi,
       has_function_privilege('anon',          p.oid, 'execute') as anon_bisa,
       has_function_privilege('authenticated', p.oid, 'execute') as login_bisa
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('isi_submodul','soal_submodul','progres_agregat')
 order by p.proname;


-- =========================================================================
-- CATATAN: dua Warning yang TIDAK ditutup di berkas ini
-- =========================================================================
--
-- 1. "Extension pg_net is installed in the public schema"
--    Dibiarkan dengan sadar. Fungsi pg_net sendiri hidup di skema net, bukan
--    public, dan PostgREST cuma mengekspos public, jadi tidak ada satu pun
--    fungsinya yang bisa disentuh lewat API. Yang terdaftar di public hanyalah
--    pendaftaran ekstensinya. Memindahkannya berisiko memutus net.http_post
--    yang dipakai penjadwal transkrip tiap menit, dan risiko itu jauh lebih
--    besar daripada peringatan yang ditutupnya.
--
-- 2. "Leaked Password Protection Disabled"
--    Bukan urusan SQL. Nyalakan di dashboard:
--    Authentication > Sign In / Providers > Password > Leaked password protection.
--    Supabase akan mencocokkan kata sandi baru ke basis data HaveIBeenPwned
--    tanpa mengirim kata sandinya. Gratis, dan tidak ada alasan mematikannya.
