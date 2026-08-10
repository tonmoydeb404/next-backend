-- Geography domain — sole schema source (regions, provinces): tables, FK, index, RLS.
-- Written to be safely re-runnable (IF NOT EXISTS / guarded DO blocks / DROP+CREATE for policies).
-- Tables are created with just their PK, then columns are added via ADD COLUMN IF NOT EXISTS —
-- so re-running this after a future column addition still applies it, not just the initial create.
-- Seeding (~127 ISTAT rows) is intentionally not part of this migration — handled separately later.

create table if not exists public.regions (
  code text primary key
);
alter table public.regions add column if not exists name text not null;

create table if not exists public.provinces (
  code char(2) primary key
);
alter table public.provinces add column if not exists name text not null;
alter table public.provinces add column if not exists region_code text not null;

do $$
begin
  alter table public.provinces
    add constraint provinces_region_code_regions_code_fk
    foreign key (region_code) references public.regions (code);
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_provinces_region on public.provinces using btree (region_code);

alter table public.regions enable row level security;
alter table public.provinces enable row level security;

drop policy if exists "Public read" on public.regions;
create policy "Public read" on public.regions
  for select using (true);

drop policy if exists "Public read" on public.provinces;
create policy "Public read" on public.provinces
  for select using (true);
