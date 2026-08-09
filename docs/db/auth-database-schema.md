# Auth & Identity Schema

> **Engine:** PostgreSQL (Supabase)
>
> **RLS:** Enabled on every table
>
> **Language:** All enums, roles, and values in English
>
> **References:** Assets Schema (`assets` — `profiles.avatar_id`, `agencies.logo_square_id`, `agencies.logo_wide_id`)

---

## 1. Enums

### `seat_role`

Tenant-internal hierarchy. Enforced in RLS for tenant-scoped operations.

| Value      | Description                                                       |
| ---------- | ----------------------------------------------------------------- |
| `owner`    | Tenant owner. Manages team, billing, branding, full subject CRUD. |
| `operator` | Standard consultant. Manage subjects, view published bandi.       |
| `viewer`   | Read-only collaborator.                                           |

---

## 2. Tables

### `profiles`

Universal identity table. One row per user, 1:1 with `auth.users`. Auto-created on signup. There is no `account_type` column — internal staff vs. customer is discriminated purely by `internal_role_id`: `NOT NULL` → internal staff, `NULL` → customer.

| Column               | Type        | Nullable | Default | Description                                                                                                               |
| -------------------- | ----------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | uuid        | NO       | —       | PK, FK → `auth.users(id)` ON DELETE CASCADE                                                                               |
| `first_name`         | text        | YES      | —       | First name                                                                                                                |
| `last_name`          | text        | YES      | —       | Last name                                                                                                                 |
| `phone`              | text        | YES      | —       | Phone number                                                                                                              |
| `avatar_id`          | uuid        | YES      | —       | FK → `assets(id)` ON DELETE SET NULL. Profile picture                                                                     |
| `internal_role_id`   | uuid        | YES      | —       | FK → `internal_roles(id)`. NULL = customer; set = internal staff                                                          |
| `personal_tenant_id` | uuid        | NO       | —       | FK → `tenants(id)`. The profile's own permanent tenant, created at signup. Immutable after creation (enforced by trigger) |
| `preferred_language` | text        | YES      | `'en'`  | UI language preference                                                                                                    |
| `created_at`         | timestamptz | NO       | `now()` | Row creation timestamp                                                                                                    |
| `updated_at`         | timestamptz | NO       | `now()` | Auto-updated via trigger                                                                                                  |

**Constraints:**

- UNIQUE on `personal_tenant_id` — a personal tenant belongs to exactly one profile

**Indexes:**

- PK on `id`
- `idx_profiles_internal_role_id` on `internal_role_id` WHERE `internal_role_id IS NOT NULL` — supports `is_internal()` lookups

**Notes:**

- `internal_role_id` is NULL for customer users — this is the sole discriminator between internal staff and customers. For internal users it points to a role definition in `internal_roles`.
- No `email` column — email lives in `auth.users` only. Clients read it from `session.user.email`; admin reads it via `auth.admin.listUsers()` or a SECURITY DEFINER function.
- No `is_active` column — suspension uses Supabase Auth's `banned_until` (`auth.admin.updateUserById(id, { ban_duration })`) which blocks sign-in and invalidates sessions at the auth layer.
- `personal_tenant_id` has no dedicated `is_personal` flag on `tenants` — "is this tenant personal" is derived via `is_personal_tenant()` (reverse lookup on this column), avoiding a second source of truth.

---

### `internal_roles`

Role definitions catalog for internal staff. Each row defines a role with its permissions. Managed via scripts/Edge Functions only.

| Column        | Type        | Nullable | Default             | Description                  |
| ------------- | ----------- | -------- | ------------------- | ---------------------------- |
| `id`          | uuid        | NO       | `gen_random_uuid()` | PK                           |
| `name`        | text        | NO       | —                   | Role identifier (UNIQUE)     |
| `permissions` | text[]      | NO       | `'{}'`              | Array of granted permissions |
| `created_at`  | timestamptz | NO       | `now()`             | Row creation timestamp       |

**Constraints:**

- UNIQUE on `name`

**Notes:**

- Known roles: `super_admin`, `publishing`, `technical`, `support`.
- `super_admin` bypasses the permissions array entirely (full access by definition).
- `permissions` uses the format `'section:action'` — e.g. `'bandi:view'`, `'bandi:edit'`, `'subjects:status'`, `'newsletter:edit'`.
- **Writes are restricted to scripts and Edge Functions (service_role) only.** No client-side INSERT/UPDATE/DELETE is allowed. RLS blocks all mutations from authenticated users except reads.

---

### `tenants`

Tenant company container — either a consulting firm/agency operating on the platform as an org, or a profile's own permanent personal tenant (see `profiles.personal_tenant_id`). No dedicated column distinguishes the two; check `is_personal_tenant(id)`.

| Column                   | Type        | Nullable | Default             | Description                                                |
| ------------------------ | ----------- | -------- | ------------------- | ---------------------------------------------------------- |
| `id`                     | uuid        | NO       | `gen_random_uuid()` | PK                                                         |
| `company_name`           | text        | NO       | —                   | Legal company name                                         |
| `vat_code`               | text        | YES      | —                   | VAT number (UNIQUE)                                        |
| `tax_code`               | text        | YES      | —                   | Fiscal/tax code                                            |
| `pec`                    | text        | YES      | —                   | Certified email                                            |
| `contact_email`          | text        | YES      | —                   | Contact email                                              |
| `contact_phone`          | text        | YES      | —                   | Contact phone                                              |
| `website`                | text        | YES      | —                   | Website URL                                                |
| `ateco_code`             | text        | YES      | —                   | Primary ATECO code                                         |
| `ateco_description`      | text        | YES      | —                   | ATECO description                                          |
| `legal_form_code`        | text        | YES      | —                   | Legal form code                                            |
| `legal_form_description` | text        | YES      | —                   | Legal form description                                     |
| `address`                | jsonb       | YES      | —                   | Tenant address (see shape below)                           |
| `branding`               | jsonb       | YES      | —                   | White-label branding (see shape below)                     |
| `logo_square_id`         | uuid        | YES      | —                   | FK → `assets(id)` ON DELETE SET NULL. Square logo          |
| `logo_wide_id`           | uuid        | YES      | —                   | FK → `assets(id)` ON DELETE SET NULL. Wide/horizontal logo |
| `created_at`             | timestamptz | NO       | `now()`             | Row creation timestamp                                     |
| `updated_at`             | timestamptz | NO       | `now()`             | Auto-updated via trigger                                   |

**`address` shape:**

```json
{
  "street": "Via Roma 1",
  "town": "Milano",
  "province_code": "MI",
  "province_name": "Milano",
  "region_code": "03",
  "region_name": "Lombardia",
  "zip_code": "20100",
  "country": "IT"
}
```

**`branding` shape:**

```json
{
  "logo_square_url": "https://...",
  "logo_wide_url": "https://...",
  "primary_color": "#1A2B3C",
  "secondary_color": "#4D5E6F"
}
```

**Constraints:**

- UNIQUE on `vat_code`

---

### `seats`

Tenant membership rows. A tenant purchases/is granted N seats up front; each row is a seat slot that starts vacant (`profile_id IS NULL`) and gets assigned to a customer profile when they join. A profile may hold seats on multiple tenants simultaneously (its personal tenant plus any number of org tenants) — there is no cap of one tenant per user.

| Column       | Type        | Nullable | Default             | Description                                                |
| ------------ | ----------- | -------- | ------------------- | ---------------------------------------------------------- |
| `id`         | uuid        | NO       | `gen_random_uuid()` | PK                                                         |
| `tenant_id`  | uuid        | NO       | —                   | FK → `tenants(id)` ON DELETE CASCADE                       |
| `profile_id` | uuid        | YES      | —                   | FK → `profiles(id)` ON DELETE SET NULL. NULL = vacant seat |
| `seat_role`  | seat_role   | NO       | `'operator'`        | Role within the tenant, applies once the seat is assigned  |
| `created_at` | timestamptz | NO       | `now()`             | Row creation timestamp                                     |

**Constraints:**

- UNIQUE(`tenant_id`, `profile_id`) WHERE `profile_id IS NOT NULL` — no duplicate assignment within a tenant, but multiple vacant seats are allowed, and a profile may hold seats on other tenants too

**Indexes:**

- `idx_seats_tenant` on `tenant_id`
- `idx_seats_profile` on `profile_id`
- `idx_seats_tenant_profile` on (`tenant_id`, `profile_id`) — supports the `is_tenant_member()`/`get_my_seat_role()` membership lookups used throughout RLS

**Notes:**

- `profile_id` is SET NULL rather than CASCADE on profile deletion — freeing the seat back to vacant so the tenant doesn't lose the purchased slot.
- Seat assignment (setting `profile_id`) and un-assignment (clearing it back to NULL) are separate actions from account signup — whether a profile is internal or customer never branches on tenant membership.
- The seat linking a profile to its own personal tenant (`tenant_id = profiles.personal_tenant_id`) can never be vacated, reassigned, or deleted — enforced by the `prevent_personal_seat_removal` trigger.

---

## 3. Triggers

### `handle_new_user` — Auto-create profile, personal tenant and seat on signup

Fires `AFTER INSERT ON auth.users`. Every signup ends up with exactly one tenant and one seat, regardless of whether the profile is internal or customer.

| Step | Action                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `INSERT profiles` (if signup metadata names an internal role → set `internal_role_id` to that role's id, e.g. `super_admin`; otherwise leave `internal_role_id` NULL, i.e. customer) |
| 2    | `INSERT tenants` — the new profile's personal tenant (`company_name` defaulted from the user's name, rest NULL)                                                                      |
| 3    | `INSERT seats` (`tenant_id` = new tenant, `profile_id` = new profile, `seat_role = 'owner'`) — the permanent personal seat                                                           |
| 4    | `UPDATE profiles SET personal_tenant_id = <new tenant id>`                                                                                                                           |

All four steps run in the same transaction as the `auth.users` insert. Additional (org) tenant seat assignment is a separate action, not part of signup.

### `update_updated_at` — Timestamp maintenance

Fires `BEFORE UPDATE` on `profiles`, `tenants`. Sets `updated_at = now()`.

### `prevent_personal_tenant_id_change` — Immutability guard

Fires `BEFORE UPDATE ON profiles`. Raises if `NEW.personal_tenant_id IS DISTINCT FROM OLD.personal_tenant_id`.

### `prevent_personal_tenant_delete` — Immutability guard

Fires `BEFORE DELETE ON tenants`. Raises if `is_personal_tenant(OLD.id)`.

### `prevent_personal_seat_removal` — Immutability guard

Fires `BEFORE UPDATE OR DELETE ON seats`. Raises if the seat's `tenant_id` is a personal tenant (`is_personal_tenant(tenant_id)`) and the operation would clear/reassign `profile_id` or delete the row.

---

## 4. Helper Functions

All `SECURITY DEFINER`, `STABLE`, `search_path = public`.

| Function                          | Returns      | Description                                                                                                                             |
| --------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `is_internal()`                   | `boolean`    | Is current user internal staff? (`internal_role_id IS NOT NULL`)                                                                        |
| `is_super_admin()`                | `boolean`    | Is current user a super_admin?                                                                                                          |
| `get_internal_role()`             | `text`       | Current user's internal role name (NULL if not internal)                                                                                |
| `get_my_personal_tenant_id()`     | `uuid`       | Current user's personal tenant ID, read directly off `profiles.personal_tenant_id`                                                      |
| `is_personal_tenant(p_tenant_id)` | `boolean`    | Is `p_tenant_id` some profile's personal tenant? (`EXISTS` reverse lookup on `profiles.personal_tenant_id`, backed by its UNIQUE index) |
| `is_tenant_member(p_tenant_id)`   | `boolean`    | Does the current user hold any seat on `p_tenant_id`? Replaces the old scalar `get_my_tenant_id()` equality checks in RLS               |
| `get_my_seat_role(p_tenant_id)`   | `seat_role`  | Current user's `seat_role` on `p_tenant_id` (NULL if not a member) — a user's role can differ per tenant                                |
| `get_my_tenant_ids()`             | `SETOF uuid` | All tenant IDs the current user belongs to (personal + org) — for listing/switcher UI, not for RLS row filters                          |
| `is_email_verified()`             | `boolean`    | Is the user's email confirmed?                                                                                                          |
| `has_permission(p_permission)`    | `boolean`    | Check if current user has the given permission string. Always `true` for `super_admin`.                                                 |

### `is_internal` implementation

```sql
CREATE FUNCTION public.is_internal()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND internal_role_id IS NOT NULL
  );
$$;
```

### `is_tenant_member` implementation

```sql
CREATE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM seats
    WHERE tenant_id = p_tenant_id AND profile_id = auth.uid()
  );
$$;
```

### `has_permission` implementation

```sql
CREATE FUNCTION public.has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT ir.name = 'super_admin' OR p_permission = ANY(ir.permissions)
    FROM profiles p
    JOIN internal_roles ir ON ir.id = p.internal_role_id
    WHERE p.id = auth.uid()
  ), false);
$$;
```

---

## 5. RLS Policies

### `profiles`

| Policy                       | Operation | Rule                                                                                                                                            |
| ---------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Own profile                  | SELECT    | `id = auth.uid()`                                                                                                                               |
| Internal sees all            | SELECT    | `is_internal()`                                                                                                                                 |
| Tenant sees own seat holders | SELECT    | `EXISTS (SELECT 1 FROM seats s1 JOIN seats s2 ON s1.tenant_id = s2.tenant_id WHERE s1.profile_id = profiles.id AND s2.profile_id = auth.uid())` |
| Update own profile           | UPDATE    | `id = auth.uid()`                                                                                                                               |

### `internal_roles`

| Policy                            | Operation | Rule                                                    |
| --------------------------------- | --------- | ------------------------------------------------------- |
| Internal reads all internal roles | SELECT    | `is_internal()`                                         |
| Writes via service_role only      | ALL       | No client mutations — managed by scripts/Edge Functions |

### `tenants`

| Policy                       | Operation | Rule                                                        |
| ---------------------------- | --------- | ----------------------------------------------------------- |
| Internal sees all tenants    | SELECT    | `is_internal()`                                             |
| Seat holders see own tenants | SELECT    | `is_tenant_member(id)`                                      |
| Internal manages tenants     | ALL       | `is_internal()`                                             |
| Owner updates own tenant     | UPDATE    | `is_tenant_member(id)` AND `get_my_seat_role(id) = 'owner'` |

### `seats`

| Policy                         | Operation | Rule                                                                                                                                                                                                    |
| ------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internal sees all seats        | SELECT    | `is_internal()`                                                                                                                                                                                         |
| Tenant sees own seats          | SELECT    | `is_tenant_member(tenant_id)`                                                                                                                                                                           |
| Owner manages own tenant seats | ALL       | `is_tenant_member(tenant_id)` AND `get_my_seat_role(tenant_id) = 'owner'` (the personal-tenant seat is additionally protected by the `prevent_personal_seat_removal` trigger regardless of this policy) |

---

## 6. Column-Level Grants

```
profiles:
  authenticated → UPDATE (first_name, last_name, phone, avatar_url, preferred_language)
  authenticated → internal_role_id is NOT user-writable (service_role only)
  anon          → no access

internal_roles:
  authenticated → SELECT only (writes via service_role scripts/Edge Functions only)

seats:
  authenticated → SELECT only (writes via owner-scoped RLS policies)
```

---

## 7. Entity Relationship

```
auth.users
     │
     │ 1:1 trigger (handle_new_user)
     │
     ▼
┌─────────────────────────────────────────────────┐
│                 profiles                         │
│  id, names, internal_role_id                     │
│  personal_tenant_id ──────────────────────┐      │
│                                            │      │
│  internal_role_id IS NOT NULL ─────────────┼──► internal_roles (catalog) — internal staff
│  internal_role_id IS NULL ── (no extra)          │ — customer
└──────────────────────────────┬────────────│──────┘
                               │ 0:N (any number of seats)
                               ▼             │ 1:1 (permanent)
                      ┌────────────────────┐ │
                      │       seats         │ │
                      │  seat_role (enum)   │ │
                      │  profile_id (NULL = vacant) │
                      │  tenant_id ─────────┼─┴──► tenants (personal or org — no dedicated flag; check is_personal_tenant())
                      └────────────────────┘
```

---

## 8. User Flows

### Internal Staff Signup

```
1. Admin creates user via Supabase admin API / Edge Function
   → metadata: { internal_role: 'super_admin' }
2. handle_new_user() fires:
   → INSERT profiles (internal_role_id = <super_admin role id>, resolved from metadata)
   → INSERT tenants (personal tenant for this profile)
   → INSERT seats (tenant_id = new personal tenant, profile_id = new profile, seat_role = 'owner')
   → UPDATE profiles SET personal_tenant_id = <new tenant id>
3. Role is changed only via scripts/Edge Functions (service_role):
   → UPDATE profiles SET internal_role_id = <target_role_id>
```

### Org Tenant Seat Provisioning

```
1. BandiNet staff creates an org tenant via dashboard
   → INSERT tenants (company_name, vat_code, ...)
2. Staff provisions N vacant seats for the tenant's plan
   → INSERT seats (tenant_id, seat_role, profile_id = NULL) × N
3. A seat is assigned when a customer joins the tenant
   → Signup flow is unchanged — the customer already has their own personal tenant from signup
   → UPDATE seats SET profile_id = <profile id> WHERE tenant_id = ... AND profile_id IS NULL
     (picks one vacant seat; first assigned seat_role = 'owner')
   → The customer now holds two seats: their permanent personal one, plus this org one
4. Owner can change roles of assigned seats:
   → UPDATE seats SET seat_role = ... (allowed by RLS)
5. Owner can vacate a (non-personal) seat (without losing the purchased slot):
   → UPDATE seats SET profile_id = NULL (allowed by RLS)
```

### Customer Signup

```
1. User signs up via website
   → no internal_role metadata
2. handle_new_user() fires:
   → INSERT profiles (internal_role_id left NULL)
   → INSERT tenants (personal tenant for this profile)
   → INSERT seats (tenant_id = new personal tenant, profile_id = new profile, seat_role = 'owner')
   → UPDATE profiles SET personal_tenant_id = <new tenant id>
3. No org membership yet, no staff role
4. User claims a VAT / creates manual subject
   → subjects.tenant_id = get_my_personal_tenant_id() (their default/active tenant)
```

### Role Update (Internal)

```
1. Admin runs script or calls Edge Function: update_role(profile_id, new_role_id)
2. Edge Function (service_role):
   → UPDATE profiles SET internal_role_id = new_role_id WHERE id = profile_id
3. No client-side mutation is allowed — RLS blocks all writes to internal_role_id
```

### Org Tenant Seat Management

```
1. Owner calls Edge Function: invite_seat_holder(email, seat_role)
2. Edge Function:
   → Creates auth.users (invite email) — no internal_role metadata, so internal_role_id stays NULL (customer)
   → handle_new_user() creates profile + personal tenant + permanent seat, as in Customer Signup
   → UPDATE seats SET profile_id = <new profile id>, seat_role = ... WHERE tenant_id = ... AND profile_id IS NULL
     (this is an additional seat on top of their personal one)
3. Owner can change roles:
   → UPDATE seats SET seat_role = ... (allowed by RLS)
4. Owner can remove a seat holder (seat goes back to vacant, not deleted):
   → UPDATE seats SET profile_id = NULL WHERE ... (allowed by RLS; blocked if the target seat is that profile's personal one)
```

---

## 9. Migration from current schema

### Tables

| Current                | New              | Action                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizations`        | `tenants`        | Rename (2nd generation, was `agencies`). Keep only consultant orgs; BandiNet org concept handled by `is_internal()` instead of `org_type = 'bandinet'` row. Drop all unused columns (address*\*, brand*\*, ateco\*\*, financials, subscription\*\*) — moved to `tenants` with curated set                                                       |
| `organization_members` | `seats`          | Rename (2nd generation, was `agency_members`). Drop `is_primary`. Rename FK `organization_id` → `tenant_id`. `profile_id` becomes NULLABLE — a seat is a predefined slot, not a membership created at invite time. Drop `UNIQUE(profile_id)` — a profile may now hold seats on multiple tenants (3rd generation: personal tenant + org tenants) |
| `profiles`             | `profiles`       | Major reshape (see column changes below)                                                                                                                                                                                                                                                                                                        |
| `permission_sections`  | —                | DROP (replaced by `internal_roles.permissions[]` array)                                                                                                                                                                                                                                                                                         |
| `role_permissions`     | —                | DROP (replaced by `internal_roles.permissions[]` array)                                                                                                                                                                                                                                                                                         |
| —                      | `internal_roles` | NEW table (role catalog with permissions array)                                                                                                                                                                                                                                                                                                 |

### Enum changes

| Current enum      | New enum    | Changes                                                                                                                                                                       |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_type`        | —           | DROP (no longer needed — `is_internal()` function replaces org-type branching)                                                                                                |
| `app_role`        | —           | DROP (replaced by `internal_role_id` nullability + `internal_roles.name`)                                                                                                     |
| `profile_kind`    | —           | DROP (replaced by `internal_role_id` nullability)                                                                                                                             |
| `org_member_role` | `seat_role` | Rename (2nd generation, was `org_role`). Values: `admin` → `owner`, `operatore` → `operator`, `viewer` stays                                                                  |
| `account_type`    | —           | DROP (4th generation — was introduced as `internal`/`customer` enum, now superseded by `internal_role_id IS NOT NULL`/`IS NULL`, avoiding a redundant second source of truth) |

### `profiles` column changes

| Current column  | New column           | Notes                                                                                                                                                                                                                                            |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `email`         | —                    | DROP (lives in `auth.users` only)                                                                                                                                                                                                                |
| `role`          | —                    | DROP (was `app_role` enum; intermediate `account_type` enum generation also dropped — internal/customer is now discriminated by `internal_role_id` nullability alone)                                                                            |
| `kind`          | —                    | DROP (redundant with `internal_role_id` nullability)                                                                                                                                                                                             |
| `is_active`     | —                    | DROP (use Supabase Auth `banned_until` instead)                                                                                                                                                                                                  |
| `is_premium`    | —                    | DROP (move to subscription/billing domain if needed)                                                                                                                                                                                             |
| `customer_type` | —                    | DROP (subject_type on `subjects` is the single source of truth)                                                                                                                                                                                  |
| —               | `internal_role_id`   | NEW: FK → `internal_roles(id)`, nullable. NULL = customer, NOT NULL = internal staff — sole discriminator, no separate `account_type` column                                                                                                     |
| —               | `personal_tenant_id` | NEW (3rd generation): FK → `tenants(id)`, NOT NULL, UNIQUE. Every profile's permanent personal tenant, auto-provisioned at signup. Replaces the old direct `subjects.owner_profile_id` ownership path entirely — see subjects-database-schema.md |

### Helper functions

| Current                               | New                               | Notes                                                                                                                                                                                                                                 |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_bandinet()`                       | `is_internal()`                   | Rename. Logic changes from org-membership, through an intermediate `account_type = 'internal'` check, to the final form: `internal_role_id IS NOT NULL`                                                                               |
| `get_my_org_id()`                     | `get_my_tenant_id()` → superseded | 2nd generation was `get_my_agency_id()`. 3rd generation drops it entirely — a scalar "my one tenant" no longer holds once profiles can belong to many tenants; replaced by `get_my_personal_tenant_id()` + `is_tenant_member()` below |
| `get_my_org_type()`                   | —                                 | Renamed to `get_account_type()` in an intermediate generation, then dropped entirely (4th generation) — no more `account_type` enum to return; use `is_internal()` instead                                                            |
| `get_my_role()`                       | `get_internal_role()`             | Rename. Returns role name instead of app_role enum                                                                                                                                                                                    |
| `has_permission(p_action, p_section)` | `has_permission(p_permission)`    | Simplified: single string like `'bandi:edit'` instead of two params                                                                                                                                                                   |
| —                                     | `is_super_admin()`                | NEW                                                                                                                                                                                                                                   |
| —                                     | `is_email_verified()`             | Already exists in prod, just documented                                                                                                                                                                                               |
| —                                     | `get_my_personal_tenant_id()`     | NEW (3rd generation): scalar read of `profiles.personal_tenant_id`                                                                                                                                                                    |
| —                                     | `is_personal_tenant(p_tenant_id)` | NEW (3rd generation): derives "personal" from `profiles.personal_tenant_id` reverse lookup instead of a stored flag                                                                                                                   |
| —                                     | `is_tenant_member(p_tenant_id)`   | NEW (3rd generation): replaces `tenant_id = get_my_tenant_id()` equality checks in RLS with a membership check, since a profile can now hold multiple seats                                                                           |
| —                                     | `get_my_seat_role(p_tenant_id)`   | NEW (3rd generation): per-tenant role lookup, since role can differ per tenant                                                                                                                                                        |
| —                                     | `get_my_tenant_ids()`             | NEW (3rd generation): set-returning list of all tenants the caller belongs to, for switcher/listing UI                                                                                                                                |
