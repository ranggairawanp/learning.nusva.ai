-- Nusva Learning · penjadwal transkrip
--
-- Jalankan SETELAH Edge Function transkrip berhasil di-deploy. Aman diulang.
--
-- Fungsi transkrip tidak memanggil dirinya sendiri. Sesuatu harus membangunkannya,
-- dan yang paling sedikit bagian bergeraknya adalah pg_cron di dalam database yang
-- sama, bukan penjadwal di luar yang perlu dijaga, dibayar, dan diingat.
--
-- SEBELUM MENJALANKAN: ganti dua nilai di baris SETTING di bawah.
--   1. URL proyek Anda
--   2. kunci publishable (sb_publishable_...), BUKAN kunci rahasia
--
-- Kenapa publishable yang dipakai di sini: header Authorization pada panggilan ini
-- cuma untuk melewati gerbang JWT Edge Function. Kerja sesungguhnya di dalam fungsi
-- memakai kunci rahasia yang tersimpan sebagai secret, dan secret itu tidak pernah
-- ikut tertulis di tabel jadwal yang bisa dibaca siapa pun yang membuka database.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------- SETTING
do $$
declare
  v_url   text := 'https://GANTI-REF-PROYEK.supabase.co';
  v_kunci text := 'GANTI_DENGAN_KUNCI_PUBLISHABLE';
begin
  if v_url like '%GANTI%' or v_kunci like '%GANTI%' then
    raise exception 'Isi dulu v_url dan v_kunci di blok SETTING sebelum menjalankan berkas ini.';
  end if;

  perform cron.unschedule('nusva-transkrip')
  where exists (select 1 from cron.job where jobname = 'nusva-transkrip');

  perform cron.schedule(
    'nusva-transkrip',
    '* * * * *',
    format($f$
      select net.http_post(
        url     := %L,
        headers := jsonb_build_object(
                     'Content-Type',  'application/json',
                     'Authorization', 'Bearer ' || %L),
        body    := '{}'::jsonb
      );
    $f$, v_url || '/functions/v1/transkrip', v_kunci)
  );

  raise notice 'Penjadwal transkrip aktif, jalan tiap menit.';
end $$;

-- ---------------------------------------------------------------- memantau
-- Antrean saat ini:
--   select status, count(*) from public.transkrip group by status;
--
-- Yang gagal beserta alasannya:
--   select m.nama_asli, t.galat, t.diperbarui
--     from public.transkrip t join public.media m on m.id = t.media_id
--    where t.status = 'gagal' order by t.diperbarui desc;
--
-- Riwayat panggilan cron, berguna saat antreannya diam padahal ada pekerjaan:
--   select status, return_message, start_time
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'nusva-transkrip')
--    order by start_time desc limit 20;
--
-- Mematikan penjadwal:
--   select cron.unschedule('nusva-transkrip');
--
-- Mengulang satu berkas yang gagal, misalnya setelah kuota API diisi lagi:
--   update public.transkrip set status = 'menunggu', galat = null where id = '...';
