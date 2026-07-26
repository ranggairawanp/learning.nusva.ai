-- Nusva Learning · tabel permintaan tim (formulir "Bicara untuk tim" di perusahaan.html)
--
-- Jalankan SETELAH 00-jalankan-dulu.sql. Aman dijalankan ulang.
--
-- Kenapa tabel ini ada: pembeli bernilai tertinggi adalah HR Director yang ingin membeli puluhan
-- kursi sekaligus. Sebelum ini ia tidak punya satu pun cara menghubungi Nusva, dan permintaan
-- termahal itu menguap begitu saja. Kalau tabel ini belum dibuat, formulirnya tetap jalan tetapi
-- jatuh ke jalur cadangan berupa email, jadi tidak ada yang rusak selama menunggu.
--
-- Model keamanannya: siapa pun boleh MENGIRIM (insert), tidak seorang pun boleh MEMBACA lewat
-- API publik. Isinya dibaca dari dashboard Supabase atau lewat service_role di sisi server.
-- Pola ini penting: tanpa itu, satu kunci publishable cukup untuk mengunduh seluruh daftar
-- prospek Anda beserta nomor teleponnya.

create table if not exists public.permintaan_tim (
  id            uuid primary key default gen_random_uuid(),
  dibuat_pada   timestamptz not null default now(),
  nama          text not null,
  email         text not null,
  perusahaan    text not null,
  telepon       text,
  jumlah_orang  int,
  kebutuhan     text,
  sumber        text,
  status        text not null default 'baru'
);

comment on table public.permintaan_tim is
  'Permintaan pembelian untuk tim. Insert terbuka untuk publik, select tertutup.';

alter table public.permintaan_tim enable row level security;

-- batas kewarasan supaya kolomnya tidak dipakai menampung naskah
alter table public.permintaan_tim drop constraint if exists permintaan_tim_wajar;
alter table public.permintaan_tim add constraint permintaan_tim_wajar check (
  length(nama) between 2 and 120
  and length(email) between 5 and 160
  and email like '%@%.%'
  and length(perusahaan) between 2 and 160
  and (telepon is null or length(telepon) <= 40)
  and (jumlah_orang is null or jumlah_orang between 1 and 100000)
  and (kebutuhan is null or length(kebutuhan) <= 2000)
  and (sumber is null or length(sumber) <= 200)
);

drop policy if exists "siapa pun boleh mengirim permintaan" on public.permintaan_tim;
create policy "siapa pun boleh mengirim permintaan" on public.permintaan_tim
  for insert to anon, authenticated
  with check (status = 'baru');

-- Sengaja TIDAK ada policy select, update, atau delete. Tanpa policy, RLS menolak semuanya,
-- dan itu memang yang diinginkan: daftar prospek tidak boleh bisa dibaca dari sisi klien.

create index if not exists permintaan_tim_waktu on public.permintaan_tim (dibuat_pada desc);
