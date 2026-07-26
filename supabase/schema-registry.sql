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
