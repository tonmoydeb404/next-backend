-- Syncs auth.users with public.profiles/tenants/seats on signup and deletion.
--
-- IMPORTANT — apply this migration only AFTER the drizzle-kit migration that creates
-- public.profiles/public.tenants/public.seats has run (see packages/db/migrations). This
-- migration references those tables and auth.users, which drizzle-kit cannot express.
--
-- Column names below (profiles.id, tenants.owner_profile_id, seats.tenant_id/profile_id/role)
-- are placeholders — update them to match the actual profiles/tenants/seats schema once it's
-- designed, then re-generate/adjust this migration accordingly.

-- Deletion: cascade from auth.users down through profiles/tenants/seats. Declared here (not in
-- the Drizzle schema) because Drizzle only models the public schema, not auth.users.
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

-- Creation: on every new auth.users row, provision a profile + personal tenant + owner seat.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.tenants (owner_profile_id, name, is_personal)
  values (new.id, new.email, true)
  returning id into new_tenant_id;

  insert into public.seats (tenant_id, profile_id, role)
  values (new_tenant_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
