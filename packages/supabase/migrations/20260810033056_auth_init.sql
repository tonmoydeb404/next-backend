-- Auth & Identity domain — sole schema source: tables, FKs (incl. auth.users), indexes,
-- triggers, helper functions, RLS policies, grants. See docs/db/auth-database-schema.md.
-- Written to be safely re-runnable (IF NOT EXISTS / guarded DO blocks / CREATE OR REPLACE /
-- DROP+CREATE for triggers & policies). Supersedes 20260808112117_auth_profile_tenant_sync.sql.
-- Tables are created with just their PK, then columns are added via ADD COLUMN IF NOT EXISTS —
-- so re-running this after a future column addition still applies it, not just the initial create.

do $$
begin
  create type public.seat_role as enum ('owner', 'operator', 'viewer');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.internal_roles (
  id uuid primary key default gen_random_uuid()
);
alter table public.internal_roles add column if not exists name text not null unique;
alter table public.internal_roles add column if not exists permissions text[] not null default '{}';
alter table public.internal_roles add column if not exists created_at timestamptz not null default now();

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid()
);
alter table public.tenants add column if not exists company_name text not null;
alter table public.tenants add column if not exists vat_code text unique;
alter table public.tenants add column if not exists tax_code text;
alter table public.tenants add column if not exists pec text;
alter table public.tenants add column if not exists contact_email text;
alter table public.tenants add column if not exists contact_phone text;
alter table public.tenants add column if not exists website text;
alter table public.tenants add column if not exists ateco_code text;
alter table public.tenants add column if not exists ateco_description text;
alter table public.tenants add column if not exists legal_form_code text;
alter table public.tenants add column if not exists legal_form_description text;
alter table public.tenants add column if not exists address jsonb;
alter table public.tenants add column if not exists branding jsonb;
alter table public.tenants add column if not exists logo_square_id uuid;
alter table public.tenants add column if not exists logo_wide_id uuid;
alter table public.tenants add column if not exists created_at timestamptz not null default now();
alter table public.tenants add column if not exists updated_at timestamptz not null default now();

create table if not exists public.profiles (
  id uuid primary key
);
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_id uuid;
alter table public.profiles add column if not exists internal_role_id uuid;
alter table public.profiles add column if not exists personal_tenant_id uuid not null unique;
alter table public.profiles add column if not exists preferred_language text default 'en';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.seats (
  id uuid primary key default gen_random_uuid()
);
alter table public.seats add column if not exists tenant_id uuid not null;
alter table public.seats add column if not exists profile_id uuid;
alter table public.seats add column if not exists seat_role seat_role not null default 'operator';
alter table public.seats add column if not exists created_at timestamptz not null default now();

do $$
begin
  alter table public.profiles
    add constraint profiles_internal_role_id_internal_roles_id_fk
    foreign key (internal_role_id) references public.internal_roles (id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_personal_tenant_id_tenants_id_fk
    foreign key (personal_tenant_id) references public.tenants (id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.seats
    add constraint seats_tenant_id_tenants_id_fk
    foreign key (tenant_id) references public.tenants (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.seats
    add constraint seats_profile_id_profiles_id_fk
    foreign key (profile_id) references public.profiles (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

-- FK to auth.users — cascades profile deletion when the underlying auth user is deleted.
do $$
begin
  alter table public.profiles
    add constraint profiles_id_fkey
    foreign key (id) references auth.users (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_profiles_internal_role_id
  on public.profiles using btree (internal_role_id)
  where internal_role_id is not null;

create index if not exists idx_seats_tenant on public.seats using btree (tenant_id);
create index if not exists idx_seats_profile on public.seats using btree (profile_id);
create index if not exists idx_seats_tenant_profile on public.seats using btree (tenant_id, profile_id);

create unique index if not exists uq_seats_tenant_profile
  on public.seats using btree (tenant_id, profile_id)
  where profile_id is not null;

-- Creation: on every new auth.users row, provision a profile + personal tenant + owner seat.
-- internal_role_id is left NULL (customer) — internal staff are promoted later via a
-- service_role-authenticated API call, never assigned at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
begin
  insert into public.tenants (company_name)
  values ('Personal Workspace')
  returning id into new_tenant_id;

  insert into public.profiles (id, first_name, last_name, personal_tenant_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'firstName',
    new.raw_user_meta_data ->> 'lastName',
    new_tenant_id
  );

  insert into public.seats (tenant_id, profile_id, seat_role)
  values (new_tenant_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Reads auth.users directly (email_confirmed_at) — the one helper function that needs it.
create or replace function public.is_email_verified()
returns boolean
language sql stable security definer set search_path = public as $$
  select email_confirmed_at is not null from auth.users where id = auth.uid();
$$;

-- Timestamp maintenance on profiles/tenants.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
  before update on public.tenants
  for each row
  execute function public.update_updated_at();

-- Immutability guards.
create or replace function public.prevent_personal_tenant_id_change()
returns trigger
language plpgsql
as $$
begin
  if new.personal_tenant_id is distinct from old.personal_tenant_id then
    raise exception 'personal_tenant_id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_personal_tenant_id_change on public.profiles;
create trigger guard_personal_tenant_id_change
  before update on public.profiles
  for each row
  execute function public.prevent_personal_tenant_id_change();

create or replace function public.is_personal_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where personal_tenant_id = p_tenant_id
  );
$$;

create or replace function public.prevent_personal_tenant_delete()
returns trigger
language plpgsql
as $$
begin
  if public.is_personal_tenant(old.id) then
    raise exception 'cannot delete a personal tenant';
  end if;
  return old;
end;
$$;

drop trigger if exists guard_personal_tenant_delete on public.tenants;
create trigger guard_personal_tenant_delete
  before delete on public.tenants
  for each row
  execute function public.prevent_personal_tenant_delete();

-- Deleting a profile (directly, or via the ON DELETE CASCADE from auth.users) never deleted its
-- personal tenants row on its own — a FK only cascades from the referenced table to the
-- referencing table, never the reverse, so profiles.personal_tenant_id -> tenants.id alone can't
-- clean up the tenant; guard_personal_tenant_delete above would then block cleaning it up
-- manually too, since it still looked "referenced" until this trigger runs.
create or replace function public.handle_profile_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- By this point the profiles row is already gone, so is_personal_tenant() (used by
  -- guard_personal_tenant_delete) correctly returns false for old.personal_tenant_id.
  delete from public.tenants where id = old.personal_tenant_id;
  return old;
end;
$$;

drop trigger if exists on_profile_deleted on public.profiles;
create trigger on_profile_deleted
  after delete on public.profiles
  for each row
  execute function public.handle_profile_deleted();

create or replace function public.prevent_personal_seat_removal()
returns trigger
language plpgsql
as $$
begin
  if public.is_personal_tenant(old.tenant_id) then
    if tg_op = 'DELETE' then
      raise exception 'cannot delete the personal tenant seat';
    end if;
    if new.profile_id is distinct from old.profile_id then
      raise exception 'cannot reassign/vacate the personal tenant seat';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_personal_seat_removal on public.seats;
create trigger guard_personal_seat_removal
  before update or delete on public.seats
  for each row
  execute function public.prevent_personal_seat_removal();

-- Helper functions used throughout RLS policies.
create or replace function public.is_internal()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and internal_role_id is not null
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.internal_roles ir on ir.id = p.internal_role_id
    where p.id = auth.uid() and ir.name = 'super_admin'
  );
$$;

create or replace function public.get_internal_role()
returns text
language sql stable security definer set search_path = public as $$
  select ir.name
  from public.profiles p
  join public.internal_roles ir on ir.id = p.internal_role_id
  where p.id = auth.uid();
$$;

create or replace function public.get_my_personal_tenant_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select personal_tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.seats
    where tenant_id = p_tenant_id and profile_id = auth.uid()
  );
$$;

create or replace function public.get_my_seat_role(p_tenant_id uuid)
returns seat_role
language sql stable security definer set search_path = public as $$
  select seat_role from public.seats
  where tenant_id = p_tenant_id and profile_id = auth.uid();
$$;

create or replace function public.get_my_tenant_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.seats where profile_id = auth.uid();
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select ir.name = 'super_admin' or p_permission = any(ir.permissions)
    from public.profiles p
    join public.internal_roles ir on ir.id = p.internal_role_id
    where p.id = auth.uid()
  ), false);
$$;

-- Row Level Security.
alter table public.profiles enable row level security;
alter table public.internal_roles enable row level security;
alter table public.tenants enable row level security;
alter table public.seats enable row level security;

drop policy if exists "Own profile" on public.profiles;
create policy "Own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "Internal sees all" on public.profiles;
create policy "Internal sees all" on public.profiles
  for select using (public.is_internal());

drop policy if exists "Tenant sees own seat holders" on public.profiles;
create policy "Tenant sees own seat holders" on public.profiles
  for select using (
    exists (
      select 1 from public.seats s1
      join public.seats s2 on s1.tenant_id = s2.tenant_id
      where s1.profile_id = profiles.id and s2.profile_id = auth.uid()
    )
  );

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "Internal reads all internal roles" on public.internal_roles;
create policy "Internal reads all internal roles" on public.internal_roles
  for select using (public.is_internal());

drop policy if exists "Internal sees all tenants" on public.tenants;
create policy "Internal sees all tenants" on public.tenants
  for select using (public.is_internal());

drop policy if exists "Seat holders see own tenants" on public.tenants;
create policy "Seat holders see own tenants" on public.tenants
  for select using (public.is_tenant_member(id));

drop policy if exists "Internal manages tenants" on public.tenants;
create policy "Internal manages tenants" on public.tenants
  for all using (public.is_internal());

drop policy if exists "Owner updates own tenant" on public.tenants;
create policy "Owner updates own tenant" on public.tenants
  for update using (
    public.is_tenant_member(id) and public.get_my_seat_role(id) = 'owner'
  );

drop policy if exists "Internal sees all seats" on public.seats;
create policy "Internal sees all seats" on public.seats
  for select using (public.is_internal());

drop policy if exists "Tenant sees own seats" on public.seats;
create policy "Tenant sees own seats" on public.seats
  for select using (public.is_tenant_member(tenant_id));

drop policy if exists "Owner manages own tenant seats" on public.seats;
create policy "Owner manages own tenant seats" on public.seats
  for all using (
    public.is_tenant_member(tenant_id) and public.get_my_seat_role(tenant_id) = 'owner'
  );

-- Column-level grants.
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, avatar_id, preferred_language) on public.profiles
  to authenticated;

revoke all on public.internal_roles from authenticated;
grant select on public.internal_roles to authenticated;

revoke all on public.seats from authenticated;
grant select on public.seats to authenticated;
