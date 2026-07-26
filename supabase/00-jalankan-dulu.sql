-- =====================================================================
-- Nusva Learning · JALANKAN INI DULU
-- Gabungan tiga berkas skema dalam urutan yang benar:
--   1. schema.sql          profil, modul, sub-modul, quiz, pembelian, progres, RLS
--   2. schema-registry.sql tabel registry SKKNI
--   3. schema-draft.sql    draf modul untuk autosave
--
-- Tempel seluruh isi berkas ini ke SQL Editor Supabase, jalankan sekali.
-- Sesudah itu, jalankan supabase/seed-registry.sql untuk mengisi
-- 165 unit dan 1.019 KUK. Berkas seed sengaja dipisah karena besar.
--
-- Aman diulang: semuanya memakai if not exists atau drop policy if exists.
--
-- PERINGATAN: jangan jalankan ini di database yang SUDAH punya tabel bernama
-- modules atau lessons dengan arti berbeda. create table if not exists akan
-- dilewati diam-diam, dan foreign key di bawah akan menempel ke tabel yang salah.
-- Jalankan hanya di proyek yang bersih.
-- =====================================================================



-- ############################  schema.sql  ############################

-- =====================================================================
-- Nusva Learning · skema aplikasi untuk Supabase
-- Jalankan di SQL Editor Supabase, sekali, dari atas ke bawah.
--
-- Catatan keamanan yang mengikat:
-- publishable key memang boleh tampil di sisi klien, dan yang menjaga data
-- adalah Row Level Security di bawah ini, bukan kerahasiaan kuncinya.
-- Setiap tabel di bawah WAJIB punya RLS aktif. Jangan pernah menaruh
-- service_role key di repo, di config.js, atau di mana pun yang terkirim ke browser.
-- =====================================================================

-- ---------------------------------------------------------------- profil
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nama         text,
  peran        text not null default 'learner' check (peran in ('learner','trainer','admin')),
  foto_url     text,
  created_at   timestamptz not null default now()
);
comment on table public.profiles is 'Satu baris per pengguna. Peran boleh berpindah tanpa akun kedua.';

-- profil dibuat otomatis saat pengguna mendaftar
create or replace function public.buat_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nama, peran, foto_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'peran', 'learner'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.buat_profil();

-- ---------------------------------------------------------------- modul
create table if not exists public.modules (
  id           bigserial primary key,
  slug         text unique not null,
  judul        text not null,
  ringkas      text,
  trainer_id   uuid not null references public.profiles(id) on delete restrict,
  bidang       text not null default 'umum',
  basis        text not null default 'umum' check (basis in ('skkni','umum')),
  unit_kode    text,
  tingkat      text not null default 'dasar' check (tingkat in ('dasar','menengah','mahir')),
  harga_idr    numeric(12,0) not null default 0,
  status       text not null default 'draft' check (status in ('draft','review','terbit','arsip')),
  versi        int  not null default 1,
  created_at   timestamptz not null default now()
);
create index if not exists idx_modules_status on public.modules(status);
create index if not exists idx_modules_trainer on public.modules(trainer_id);

-- ---------------------------------------------------- sub-modul dan gerbang pratinjau
create table if not exists public.submodules (
  id           bigserial primary key,
  module_id    bigint not null references public.modules(id) on delete cascade,
  urutan       smallint not null,
  judul        text not null,
  deskripsi    text,
  jenis        text not null default 'artikel'
               check (jenis in ('artikel','video','audio','diagram','latihan')),
  menit        smallint not null check (menit between 1 and 20),
  -- KEPUTUSAN 46: trainer menentukan bagian mana yang terbuka sebelum dibeli.
  gratis       boolean not null default false,
  quiz_on      boolean not null default false,
  quiz_posisi  text not null default 'sesudah' check (quiz_posisi in ('sebelum','sesudah')),
  diskusi_on   boolean not null default false,
  diskusi_baca boolean not null default false,
  konten       jsonb,
  unique (module_id, urutan)
);
comment on column public.submodules.gratis is
  'true berarti bagian ini terbuka penuh tanpa pembelian, termasuk latihannya.';
comment on column public.submodules.quiz_posisi is
  'Diderivasi dari urutan: bagian pertama sebelum materi (pertanyaan pembuka), sisanya sesudah.';

-- posisi quiz tidak diisi manual, ia mengikuti urutan bagian
create or replace function public.set_quiz_posisi()
returns trigger language plpgsql as $$
begin
  new.quiz_posisi := case when new.urutan = 1 then 'sebelum' else 'sesudah' end;
  return new;
end $$;
drop trigger if exists trg_quiz_posisi on public.submodules;
create trigger trg_quiz_posisi before insert or update of urutan on public.submodules
  for each row execute function public.set_quiz_posisi();

-- ---------------------------------------------------------------- soal quiz
create table if not exists public.quiz_questions (
  id            bigserial primary key,
  submodule_id  bigint not null references public.submodules(id) on delete cascade,
  urutan        smallint not null,
  jenis         text not null check (jenis in ('pg','pendek')),
  pertanyaan    text not null,
  opsi          jsonb,
  benar         smallint,
  kunci         text,
  unique (submodule_id, urutan)
);
comment on table public.quiz_questions is
  'Jawaban benar TIDAK boleh terbaca peserta sebelum menjawab; lihat kebijakan RLS di bawah.';

-- ---------------------------------------------------------------- pembelian
create table if not exists public.purchases (
  id           bigserial primary key,
  learner_id   uuid not null references public.profiles(id) on delete cascade,
  module_id    bigint not null references public.modules(id) on delete restrict,
  harga_idr    numeric(12,0) not null,
  status       text not null default 'menunggu' check (status in ('menunggu','lunas','gagal','refund')),
  xendit_ref   text,
  created_at   timestamptz not null default now(),
  unique (learner_id, module_id)
);
create index if not exists idx_purchases_learner on public.purchases(learner_id);

-- apakah pengguna berhak atas isi penuh sebuah modul
create or replace function public.punya_akses(m bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.purchases p
    where p.module_id = m and p.learner_id = auth.uid() and p.status = 'lunas'
  ) or exists (
    select 1 from public.modules mo
    where mo.id = m and mo.trainer_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------- progres
create table if not exists public.progress (
  id            bigserial primary key,
  learner_id    uuid not null references public.profiles(id) on delete cascade,
  submodule_id  bigint not null references public.submodules(id) on delete cascade,
  status        text not null default 'mulai' check (status in ('mulai','tuntas','belum')),
  updated_at    timestamptz not null default now(),
  unique (learner_id, submodule_id)
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.modules        enable row level security;
alter table public.submodules     enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.purchases      enable row level security;
alter table public.progress       enable row level security;

-- profil: pemiliknya saja
drop policy if exists "profil dibaca pemiliknya" on public.profiles;
create policy "profil dibaca pemiliknya" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "profil diubah pemiliknya" on public.profiles;
create policy "profil diubah pemiliknya" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- modul terbit boleh dibaca siapa pun, termasuk yang belum masuk (katalog publik)
drop policy if exists "modul terbit terbuka" on public.modules;
create policy "modul terbit terbuka" on public.modules
  for select using (status = 'terbit' or trainer_id = auth.uid());
drop policy if exists "trainer mengelola modulnya" on public.modules;
create policy "trainer mengelola modulnya" on public.modules
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- DAFTAR sub-modul terbuka untuk semua, karena learner boleh melihat detail
-- sebuah modul tanpa mendaftar. Yang dijaga adalah ISI-nya, bukan daftarnya.
drop policy if exists "daftar sub-modul terbuka" on public.submodules;
create policy "daftar sub-modul terbuka" on public.submodules
  for select using (
    exists (select 1 from public.modules m
            where m.id = module_id and (m.status = 'terbit' or m.trainer_id = auth.uid()))
  );
drop policy if exists "trainer mengelola sub-modulnya" on public.submodules;
create policy "trainer mengelola sub-modulnya" on public.submodules
  for all using (
    exists (select 1 from public.modules m where m.id = module_id and m.trainer_id = auth.uid())
  ) with check (
    exists (select 1 from public.modules m where m.id = module_id and m.trainer_id = auth.uid())
  );

-- View untuk klien: daftar bagian tanpa kolom konten.
-- Kolom konten hanya boleh diambil lewat fungsi berikut, yang memeriksa hak akses.
create or replace view public.submodules_publik as
  select id, module_id, urutan, judul, deskripsi, jenis, menit, gratis, quiz_on, quiz_posisi, diskusi_on
  from public.submodules;

create or replace function public.isi_submodul(sub bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  b public.submodules;
begin
  select * into b from public.submodules where id = sub;
  if b.id is null then
    return null;
  end if;
  -- terbuka bila bagian ditandai gratis oleh trainer, atau bila penggunanya berhak
  if b.gratis or public.punya_akses(b.module_id) then
    return b.konten;
  end if;
  return jsonb_build_object('terkunci', true);
end $$;

-- soal quiz: hanya untuk yang berhak atau untuk bagian gratis, dan kunci jawaban
-- tidak pernah ikut terkirim ke klien
create or replace function public.soal_submodul(sub bigint)
returns table (id bigint, urutan smallint, jenis text, pertanyaan text, opsi jsonb)
language sql stable security definer set search_path = public as $$
  select q.id, q.urutan, q.jenis, q.pertanyaan, q.opsi
  from public.quiz_questions q
  join public.submodules s on s.id = q.submodule_id
  where q.submodule_id = sub
    and (s.gratis or public.punya_akses(s.module_id))
  order by q.urutan;
$$;

drop policy if exists "soal tidak dibaca langsung" on public.quiz_questions;
create policy "soal tidak dibaca langsung" on public.quiz_questions
  for select using (
    exists (select 1 from public.submodules s join public.modules m on m.id = s.module_id
            where s.id = submodule_id and m.trainer_id = auth.uid())
  );

-- pembelian: pemiliknya, dan trainer hanya melihat agregatnya lewat view lain
drop policy if exists "pembelian milik learner" on public.purchases;
create policy "pembelian milik learner" on public.purchases
  for select using (learner_id = auth.uid());
drop policy if exists "learner membuat pembeliannya" on public.purchases;
create policy "learner membuat pembeliannya" on public.purchases
  for insert with check (learner_id = auth.uid() and status = 'menunggu');
-- status lunas HANYA boleh disetel dari server lewat webhook Xendit memakai service_role.

-- progres: milik learner sendiri. Prinsip 9: trainer dan employer tidak pernah
-- membaca baris per orang, hanya agregat lewat view khusus.
drop policy if exists "progres milik learner" on public.progress;
create policy "progres milik learner" on public.progress
  for all using (learner_id = auth.uid()) with check (learner_id = auth.uid());

create or replace view public.progres_agregat as
  select s.module_id,
         count(distinct p.learner_id) filter (where p.status = 'tuntas') as learner_tuntas,
         count(distinct p.learner_id) as learner_mulai
  from public.progress p
  join public.submodules s on s.id = p.submodule_id
  group by s.module_id;

grant select on public.submodules_publik, public.progres_agregat to anon, authenticated;
grant execute on function public.isi_submodul(bigint), public.soal_submodul(bigint) to anon, authenticated;


-- ############################  schema-registry.sql  ############################

-- =====================================================================
-- Nusva Learning · registry SKKNI sebagai data, bukan sebagai kode
-- Jalankan SEBELUM supabase/seed-registry.sql.
--
-- Sebelumnya 165 unit dan 1.019 KUK ditulis mati di dalam berkas HTML alur
-- trainer, sehingga trainer yang mengajar Periklanan tetap mengunduh seluruh
-- unit MSDM dan Hubungan Industrial. Di sini ia menjadi tabel, dan klien hanya
-- mengambil bidang yang benar-benar dipilih.
--
-- Registry ini FAKTA PUBLIK dari Kepmenaker, jadi boleh dibaca siapa pun,
-- termasuk pengunjung yang belum masuk. Yang tidak boleh adalah menulisinya:
-- penambahan hanya lewat kurasi Nusva memakai service_role di sisi server.
-- =====================================================================

create table if not exists public.reg_frameworks (
  kode      text primary key,
  nama_id   text not null,
  nama_en   text not null,
  sk_id     text not null,
  sk_en     text not null,
  status    text not null default 'berlaku' check (status in ('berlaku','usulan','dicabut'))
);

create table if not exists public.reg_units (
  kode            text primary key,
  framework_kode  text not null references public.reg_frameworks(kode) on delete cascade,
  judul           text not null,
  urutan          int  not null default 0
);
create index if not exists idx_reg_units_fw on public.reg_units(framework_kode);

create table if not exists public.reg_kuk (
  id          bigserial primary key,
  unit_kode   text not null references public.reg_units(kode) on delete cascade,
  kode        text not null,
  pernyataan  text not null,
  urutan      int  not null default 0,
  unique (unit_kode, kode)
);
create index if not exists idx_reg_kuk_unit on public.reg_kuk(unit_kode);

-- daftar bidang beserta jumlah unitnya, itulah yang mengisi dropdown
create or replace view public.reg_bidang as
  select f.kode, f.nama_id, f.nama_en, f.sk_id, f.sk_en, count(u.kode) as unit
  from public.reg_frameworks f
  left join public.reg_units u on u.framework_kode = f.kode
  where f.status = 'berlaku'
  group by f.kode, f.nama_id, f.nama_en, f.sk_id, f.sk_en
  order by f.kode;

alter table public.reg_frameworks enable row level security;
alter table public.reg_units      enable row level security;
alter table public.reg_kuk        enable row level security;

drop policy if exists "registry dibaca siapa pun" on public.reg_frameworks;
create policy "registry dibaca siapa pun" on public.reg_frameworks for select using (status = 'berlaku');
drop policy if exists "unit dibaca siapa pun" on public.reg_units;
create policy "unit dibaca siapa pun" on public.reg_units for select using (true);
drop policy if exists "kuk dibaca siapa pun" on public.reg_kuk;
create policy "kuk dibaca siapa pun" on public.reg_kuk for select using (true);
-- tanpa policy insert, update, atau delete: registry hanya diubah lewat service_role.

grant select on public.reg_bidang to anon, authenticated;


-- ############################  schema-draft.sql  ############################

-- =====================================================================
-- Nusva Learning · draf modul trainer
-- Alur penyiapan modul menyimpan draf tiap beberapa detik, supaya trainer
-- boleh berhenti di tengah dan melanjutkan besok. Tanpa ini, ketegangan tugas
-- yang belum selesai berubah dari pendorong menjadi frustrasi.
-- =====================================================================

create table if not exists public.module_drafts (
  id          bigserial primary key,
  trainer_id  uuid not null references public.profiles(id) on delete cascade,
  module_id   bigint references public.modules(id) on delete cascade,
  isi         jsonb not null,
  langkah     text,
  updated_at  timestamptz not null default now()
);
create unique index if not exists uq_draft_baru on public.module_drafts(trainer_id) where module_id is null;
create unique index if not exists uq_draft_edit on public.module_drafts(trainer_id, module_id) where module_id is not null;

alter table public.module_drafts enable row level security;
drop policy if exists "draf milik trainernya" on public.module_drafts;
create policy "draf milik trainernya" on public.module_drafts
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
