-- Nusva Learning · media modul (video dan audio) dan transkripnya
--
-- Jalankan SETELAH 00-jalankan-dulu.sql. Aman dijalankan ulang.
--
-- ============================================================================
-- KENAPA BUCKET-NYA TIDAK PUBLIK
--
-- Godaan pertama saat memasang video adalah membuat bucket-nya public, karena
-- pemutarnya langsung jalan tanpa kode tambahan. Jangan. Bucket publik berarti
-- siapa pun yang tahu URL berkasnya bisa mengunduh video berbayar tanpa pernah
-- membeli, dan URL itu bocor lewat cara paling sepele: seseorang membagikan
-- tautan, atau mesin pengindeks menemukannya. Seluruh beda antara bagian gratis
-- dan bagian berbayar runtuh diam-diam, dan runtuhnya tidak terlihat di layar
-- mana pun sampai pendapatannya yang memberi tahu.
--
-- Jadi bucket-nya privat, dan aksesnya lewat signed URL berumur pendek yang
-- diterbitkan Storage HANYA kalau kebijakan di bawah ini mengizinkan. Aturannya
-- sama persis dengan aturan isi modul: terbuka bila sub-modulnya ditandai gratis
-- oleh trainernya, atau bila penggunanya memang berhak atas modul itu.
-- ============================================================================

-- ---------------------------------------------------------------- bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'modul-media', 'modul-media', false,
  524288000,  -- 500 MB per berkas
  array[
    'video/mp4','video/webm','video/quicktime','video/x-m4v',
    'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/ogg','audio/webm'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------- katalog media
create table if not exists public.media (
  id             uuid primary key default gen_random_uuid(),
  dibuat_pada    timestamptz not null default now(),
  module_id      bigint not null references public.modules(id)    on delete cascade,
  submodule_id   bigint          references public.submodules(id) on delete set null,
  trainer_id     uuid   not null references public.profiles(id)   on delete restrict,
  -- jalur di dalam bucket, WAJIB diawali '<trainer_id>/' agar kebijakan tulis
  -- di storage bisa memastikan seorang trainer tidak menimpa berkas trainer lain
  jalur          text   not null unique,
  nama_asli      text   not null,
  mime           text   not null,
  ukuran_bytes   bigint not null check (ukuran_bytes > 0),
  -- durasi dibaca di peramban dari metadata berkasnya sebelum diunggah, jadi
  -- angka menit di halaman modul tidak pernah lagi cuma tebakan trainer
  durasi_detik   int             check (durasi_detik is null or durasi_detik > 0),
  jenis          text   not null check (jenis in ('video','audio'))
);
comment on table public.media is
  'Satu baris per berkas video atau audio milik sebuah modul. Berkasnya sendiri di bucket privat modul-media.';
comment on column public.media.jalur is
  'Jalur di bucket, selalu <trainer_id>/<module_id>/<nama>. Awalan itu yang menegakkan kepemilikan.';

create index if not exists idx_media_modul     on public.media(module_id);
create index if not exists idx_media_submodul  on public.media(submodule_id);

-- ---------------------------------------------------------------- transkrip
create table if not exists public.transkrip (
  id             uuid primary key default gen_random_uuid(),
  media_id       uuid not null unique references public.media(id) on delete cascade,
  status         text not null default 'menunggu'
                 check (status in ('menunggu','diproses','siap','gagal')),
  bahasa         text,
  mesin          text,
  teks           text,
  galat          text,
  dibuat_pada    timestamptz not null default now(),
  diperbarui     timestamptz not null default now()
);
comment on table public.transkrip is
  'Draf transkrip hasil mesin. Statusnya ditampilkan apa adanya di wizard trainer, termasuk saat gagal.';
comment on column public.transkrip.teks is
  'DRAF, bukan hasil akhir. Trainer yang membacanya ulang sebelum modulnya terbit.';

-- setiap media otomatis punya satu baris transkrip berstatus menunggu, sehingga
-- antreannya adalah query biasa dan bukan daftar yang harus dijaga di tempat lain
create or replace function public.buat_baris_transkrip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.transkrip (media_id) values (new.id)
  on conflict (media_id) do nothing;
  return new;
end $$;
drop trigger if exists trg_buat_transkrip on public.media;
create trigger trg_buat_transkrip after insert on public.media
  for each row execute function public.buat_baris_transkrip();

create or replace function public.sentuh_transkrip()
returns trigger language plpgsql as $$
begin new.diperbarui := now(); return new; end $$;
drop trigger if exists trg_sentuh_transkrip on public.transkrip;
create trigger trg_sentuh_transkrip before update on public.transkrip
  for each row execute function public.sentuh_transkrip();

-- ---------------------------------------------------------------- siapa boleh melihat
-- Satu fungsi, dipakai tiga tempat: baris media, baris transkrip, dan objek di
-- storage. Menulis aturannya tiga kali adalah cara paling andal membuat salah
-- satunya tertinggal saat aturannya berubah.
create or replace function public.media_boleh_dilihat(m_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.media md
    left join public.submodules sm on sm.id = md.submodule_id
    join public.modules mo on mo.id = md.module_id
    where md.id = m_id
      and (
        md.trainer_id = auth.uid()                       -- pemiliknya
        or (mo.status = 'terbit' and coalesce(sm.gratis, false))  -- bagian gratis
        or public.punya_akses(md.module_id)              -- sudah membeli
      )
  );
$$;

alter table public.media     enable row level security;
alter table public.transkrip enable row level security;

drop policy if exists "media dibaca sesuai hak" on public.media;
create policy "media dibaca sesuai hak" on public.media
  for select using (public.media_boleh_dilihat(id));

drop policy if exists "trainer mengelola medianya" on public.media;
create policy "trainer mengelola medianya" on public.media
  for all
  using      (trainer_id = auth.uid())
  with check (trainer_id = auth.uid() and jalur like auth.uid()::text || '/%');

drop policy if exists "transkrip dibaca sesuai hak" on public.transkrip;
create policy "transkrip dibaca sesuai hak" on public.transkrip
  for select using (public.media_boleh_dilihat(media_id));

-- Transkrip TIDAK bisa ditulis dari peramban. Yang menulisnya cuma Edge Function
-- dengan service_role, yang melewati RLS. Kalau baris ini dibuka untuk trainer,
-- teks transkrip jadi kolom yang bisa diisi apa saja oleh siapa saja yang punya
-- akun trainer, dan transkrip berhenti berguna sebagai catatan apa yang diucapkan.

-- ---------------------------------------------------------------- storage
-- Kebijakan pada storage.objects. Tulis dibatasi ke folder milik trainernya,
-- baca mengikuti fungsi yang sama dengan baris medianya.
drop policy if exists "media modul diunggah pemiliknya" on storage.objects;
create policy "media modul diunggah pemiliknya" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'modul-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media modul diubah pemiliknya" on storage.objects;
create policy "media modul diubah pemiliknya" on storage.objects
  for update to authenticated
  using      (bucket_id = 'modul-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'modul-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media modul dihapus pemiliknya" on storage.objects;
create policy "media modul dihapus pemiliknya" on storage.objects
  for delete to authenticated
  using (bucket_id = 'modul-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media modul dibaca sesuai hak" on storage.objects;
create policy "media modul dibaca sesuai hak" on storage.objects
  for select
  using (
    bucket_id = 'modul-media'
    and exists (
      select 1 from public.media md
      where md.jalur = storage.objects.name
        and public.media_boleh_dilihat(md.id)
    )
  );

-- ---------------------------------------------------------------- antrean transkrip
-- Dipanggil Edge Function dengan service_role. Mengambil satu pekerjaan dan
-- menguncinya dalam satu langkah, sehingga dua pekerja yang jalan bersamaan
-- tidak pernah mengerjakan berkas yang sama.
create or replace function public.ambil_pekerjaan_transkrip()
returns table (transkrip_id uuid, media_id uuid, jalur text, mime text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with pilih as (
    select t.id
    from public.transkrip t
    where t.status = 'menunggu'
    order by t.dibuat_pada
    for update skip locked
    limit 1
  )
  update public.transkrip t
     set status = 'diproses'
    from pilih p, public.media md
   where t.id = p.id and md.id = t.media_id
  returning t.id, md.id, md.jalur, md.mime;
end $$;
revoke all on function public.ambil_pekerjaan_transkrip() from public, anon, authenticated;

-- ---------------------------------------------------------------- pemeriksaan
do $$
declare n int;
begin
  select count(*) into n from storage.buckets where id = 'modul-media' and public = false;
  if n <> 1 then
    raise exception 'Bucket modul-media harus ada dan TIDAK publik. Periksa lagi sebelum melanjutkan.';
  end if;
  raise notice 'Media modul siap. Bucket privat, RLS aktif, antrean transkrip terpasang.';
end $$;
