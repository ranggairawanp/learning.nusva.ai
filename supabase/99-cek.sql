-- =====================================================================
-- Nusva Learning · pemeriksaan setelah migrasi
-- Tempel dan jalankan. Hanya membaca, tidak mengubah apa pun.
-- Semua hasil keluar dalam SATU tabel, karena SQL Editor hanya menampilkan
-- hasil query terakhir kalau pernyataannya lebih dari satu.
-- Yang dicari: kolom status harus LULUS di semua baris.
-- =====================================================================

with rls as (
  select c.relname as tabel, c.relrowsecurity as aktif, count(p.polname) as pol
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname, c.relrowsecurity
),
fn as (
  select proname, prosecdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and proname in ('punya_akses','isi_submodul','soal_submodul','buat_profil','set_quiz_posisi')
),
tg as (
  select tgname from pg_trigger
  where tgrelid = 'auth.users'::regclass and not tgisinternal
)
select * from (
  select 1 as urut, 'Keamanan' as pemeriksaan, 'Tabel TANPA RLS' as objek,
         coalesce(string_agg(tabel, ', '), 'tidak ada') as hasil,
         case when count(*) = 0 then 'LULUS' else 'GAGAL' end as status
  from rls where aktif = false

  union all
  select 2, 'Keamanan', 'Tabel RLS aktif tapi TANPA policy',
         coalesce(string_agg(tabel, ', '), 'tidak ada'),
         case when count(*) = 0 then 'LULUS' else 'PERIKSA' end
  from rls where aktif = true and pol = 0

  union all
  select 3, 'Keamanan', 'Jumlah tabel di schema public', count(*)::text, 'info' from rls

  union all
  select 4, 'Fungsi', 'Fungsi penjaga akses terpasang',
         count(*)::text || ' dari 5',
         case when count(*) = 5 then 'LULUS' else 'GAGAL' end
  from fn

  union all
  select 5, 'Fungsi', 'Berstatus security definer',
         count(*)::text || ' dari 4',
         case when count(*) = 4 then 'LULUS' else 'PERIKSA' end
  from fn
  where prosecdef and proname in ('punya_akses','isi_submodul','soal_submodul','buat_profil')

  union all
  select 6, 'Trigger', 'Profil otomatis di auth.users',
         coalesce(string_agg(tgname, ', '), 'TIDAK ADA'),
         case when count(*) > 0 then 'LULUS' else 'GAGAL' end
  from tg

  union all
  select 7, 'Registry', 'Bidang / unit / KUK',
         (select count(*) from public.reg_frameworks)::text || ' / ' ||
         (select count(*) from public.reg_units)::text || ' / ' ||
         (select count(*) from public.reg_kuk)::text,
         case when (select count(*) from public.reg_units) = 165
               and (select count(*) from public.reg_kuk) = 1019
              then 'LULUS' else 'PERIKSA' end
) x order by urut;
