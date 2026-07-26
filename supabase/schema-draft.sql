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
