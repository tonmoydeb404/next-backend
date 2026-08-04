# BandiNet — Auth & Identity Schema

> **Engine:** PostgreSQL (Supabase)  
> **RLS:** Enabled on every table  
> **Language:** All enums, roles, and values in English  
> **References:** [assets-database-schema.md](assets-database-schema.md) (`assets` — `profiles.avatar_id`, `agencies.logo_square_id`, `agencies.logo_wide_id`)

---

## Table of Contents

1. [Enums](#1-enums)
2. [Tables](#2-tables)
   - [profiles](#profiles)
   - [internal_roles](#internal_roles)
   - [agencies](#agencies)
   - [agency_members](#agency_members)
3. [Triggers](#3-triggers)
4. [Helper Functions](#4-helper-functions)
5. [RLS Policies](#5-rls-policies)
6. [Column-Level Grants](#6-column-level-grants)
7. [Entity Relationship](#7-entity-relationship)
8. [User Flows](#8-user-flows)

---

## 1. Enums

### `account_type`

Discriminator on `profiles`. Determines which subsystem applies.

| Value      | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| `internal` | BandiNet staff. Uses `internal_roles` (role + permissions array).  |
| `agency`   | Consultant/agency team member. Uses `agencies` + `agency_members`. |
| `customer` | End-user. Owns subjects directly via `owner_profile_id`.           |

### `org_role`

Agency-internal hierarchy. Enforced in RLS for agency-scoped operations.

| Value      | Description                                                       |
| ---------- | ----------------------------------------------------------------- |
| `owner`    | Agency owner. Manages team, billing, branding, full subject CRUD. |
| `operator` | Standard consultant. Manage subjects, view published bandi.       |
| `viewer`   | Read-only collaborator.                                           |

---

## 2. Tables

### `profiles`

Universal identity table. One row per user, 1:1 with `auth.users`. Auto-created on signup.

| Column               | Type         | Nullable | Default | Description                                                          |
| -------------------- | ------------ | -------- | ------- | -------------------------------------------------------------------- |
| `id`                 | uuid         | NO       | —       | PK, FK → `auth.users(id)` ON DELETE CASCADE                          |
| `first_name`         | text         | YES      | —       | First name                                                           |
| `last_name`          | text         | YES      | —       | Last name                                                            |
| `phone`              | text         | YES      | —       | Phone number                                                         |
| `avatar_id`          | uuid         | YES      | —       | FK → `assets(id)` ON DELETE SET NULL. Profile picture                |
| `account_type`       | account_type | NO       | —       | `internal`, `agency`, or `customer`                                  |
| `internal_role_id`   | uuid         | YES      | —       | FK → `internal_roles(id)`. Set only when `account_type = 'internal'` |
| `preferred_language` | text         | YES      | `'en'`  | UI language preference                                               |
| `created_at`         | timestamptz  | NO       | `now()` | Row creation timestamp                                               |
| `updated_at`         | timestamptz  | NO       | `now()` | Auto-updated via trigger                                             |

**Indexes:**

- PK on `id`
- `idx_profiles_account_type` on `account_type`

**Notes:**

- `internal_role_id` is NULL for agency/customer users. For internal users it points to a role definition in `internal_roles`.
- No `email` column — email lives in `auth.users` only. Clients read it from `session.user.email`; admin reads it via `auth.admin.listUsers()` or a SECURITY DEFINER function.
- No `is_active` column — suspension uses Supabase Auth's `banned_until` (`auth.admin.updateUserById(id, { ban_duration })`) which blocks sign-in and invalidates sessions at the auth layer.

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

### `agencies`

Agency/consultant company container.

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
| `address`                | jsonb       | YES      | —                   | Agency address (see shape below)                           |
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

### `agency_members`

Links agency profiles to their agency. One agency per user.

| Column       | Type        | Nullable | Default             | Description                           |
| ------------ | ----------- | -------- | ------------------- | ------------------------------------- |
| `id`         | uuid        | NO       | `gen_random_uuid()` | PK                                    |
| `agency_id`  | uuid        | NO       | —                   | FK → `agencies(id)` ON DELETE CASCADE |
| `profile_id` | uuid        | NO       | —                   | FK → `profiles(id)` ON DELETE CASCADE |
| `org_role`   | org_role    | NO       | `'operator'`        | Role within the agency                |
| `created_at` | timestamptz | NO       | `now()`             | Row creation timestamp                |

**Constraints:**

- UNIQUE(`agency_id`, `profile_id`) — no duplicate membership
- UNIQUE(`profile_id`) — one agency per user, no ambiguity

**Indexes:**

- `idx_agency_members_agency` on `agency_id`

---

## 3. Triggers

### `handle_new_user` — Auto-create profile on signup

Fires `AFTER INSERT ON auth.users`.

| Condition                                          | Action                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `account_type = 'internal'` (from signup metadata) | Creates profile with `internal_role_id` set to the `super_admin` role                          |
| `account_type = 'agency'` (from signup metadata)   | Creates profile only. Agency membership is created separately by the `owner` who invites them. |
| `account_type = 'customer'` or missing             | Creates profile with `account_type = 'customer'`                                               |

### `update_updated_at` — Timestamp maintenance

Fires `BEFORE UPDATE` on `profiles`, `agencies`. Sets `updated_at = now()`.

---

## 4. Helper Functions

All `SECURITY DEFINER`, `STABLE`, `search_path = public`.

| Function                       | Returns        | Description                                                                             |
| ------------------------------ | -------------- | --------------------------------------------------------------------------------------- |
| `get_account_type()`           | `account_type` | Current user's account type                                                             |
| `is_internal()`                | `boolean`      | Is current user internal staff?                                                         |
| `is_super_admin()`             | `boolean`      | Is current user a super_admin?                                                          |
| `get_internal_role()`          | `text`         | Current user's internal role name (NULL if not internal)                                |
| `get_my_agency_id()`           | `uuid`         | Current user's agency ID (NULL if not agency)                                           |
| `is_email_verified()`          | `boolean`      | Is the user's email confirmed?                                                          |
| `has_permission(p_permission)` | `boolean`      | Check if current user has the given permission string. Always `true` for `super_admin`. |

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

| Policy                         | Operation | Rule                                                             |
| ------------------------------ | --------- | ---------------------------------------------------------------- |
| Own profile                    | SELECT    | `id = auth.uid()`                                                |
| Internal sees all              | SELECT    | `is_internal()`                                                  |
| Agency sees own agency members | SELECT    | Member's `profile_id` is in same agency via `get_my_agency_id()` |
| Update own profile             | UPDATE    | `id = auth.uid()`                                                |

### `internal_roles`

| Policy                            | Operation | Rule                                                    |
| --------------------------------- | --------- | ------------------------------------------------------- |
| Internal reads all internal roles | SELECT    | `is_internal()`                                         |
| Writes via service_role only      | ALL       | No client mutations — managed by scripts/Edge Functions |

### `agencies`

| Policy                     | Operation | Rule                                                        |
| -------------------------- | --------- | ----------------------------------------------------------- |
| Internal sees all agencies | SELECT    | `is_internal()`                                             |
| Members see own agency     | SELECT    | `id = get_my_agency_id()`                                   |
| Internal manages agencies  | ALL       | `is_internal()`                                             |
| Owner updates own agency   | UPDATE    | `id = get_my_agency_id()` AND caller's `org_role = 'owner'` |

### `agency_members`

| Policy                           | Operation | Rule                                                               |
| -------------------------------- | --------- | ------------------------------------------------------------------ |
| Internal sees all members        | SELECT    | `is_internal()`                                                    |
| Agency sees own agency members   | SELECT    | `agency_id = get_my_agency_id()`                                   |
| Owner manages own agency members | ALL       | `agency_id = get_my_agency_id()` AND caller's `org_role = 'owner'` |

---

## 6. Column-Level Grants

```
profiles:
  authenticated → UPDATE (first_name, last_name, phone, avatar_url, preferred_language)
  authenticated → internal_role_id is NOT user-writable (service_role only)
  anon          → no access

internal_roles:
  authenticated → SELECT only (writes via service_role scripts/Edge Functions only)

agency_members:
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
│  id, names, account_type, internal_role_id       │
│                                                  │
│  account_type = 'internal' ── internal_role_id ──┼──► internal_roles (catalog)
│  account_type = 'agency'   ──┐                   │
│  account_type = 'customer' ──┼── (no extra)      │
└──────────────────────────────┼───────────────────┘
                               │
                               ▼
                      ┌────────────────────┐
                      │  agency_members     │
                      │  org_role (enum)    │
                      │  agency_id ─────────┼──► agencies
                      └────────────────────┘
```

---

## 8. User Flows

### Internal Staff Signup

```
1. Admin creates user via Supabase admin API / Edge Function
   → metadata: { account_type: 'internal' }
2. handle_new_user() fires:
   → INSERT profiles (account_type = 'internal', internal_role_id = <super_admin role id>)
3. Role is changed only via scripts/Edge Functions (service_role):
   → UPDATE profiles SET internal_role_id = <target_role_id>
```

### Agency Onboarding

```
1. BandiNet staff creates agency via dashboard
   → INSERT agencies (company_name, vat_code, ...)
2. Staff invites agency owner
   → metadata: { account_type: 'agency' }
   → handle_new_user() creates profile
   → INSERT agency_members (org_role = 'owner')
3. Agency owner invites team members
   → Same flow, org_role = 'operator' or 'viewer'
```

### Customer Signup

```
1. User signs up via website
   → metadata: { account_type: 'customer' } (or empty → defaults to customer)
2. handle_new_user() fires:
   → INSERT profiles (account_type = 'customer')
3. No org membership, no staff role
4. User claims a VAT / creates manual subject
   → subjects.owner_profile_id = auth.uid()
```

### Role Update (Internal)

```
1. Admin runs script or calls Edge Function: update_role(profile_id, new_role_id)
2. Edge Function (service_role):
   → UPDATE profiles SET internal_role_id = new_role_id WHERE id = profile_id
3. No client-side mutation is allowed — RLS blocks all writes to internal_role_id
```

### Agency Team Management

```
1. Owner calls Edge Function: invite_member(email, org_role)
2. Edge Function:
   → Creates auth.users (invite email)
   → handle_new_user() creates profile (account_type = 'agency')
   → INSERT agency_members (org_role)
3. Owner can change roles:
   → UPDATE agency_members SET org_role = ... (allowed by RLS)
4. Owner can remove members:
   → DELETE agency_members (allowed by RLS)
```

---

## 9. Migration from current schema

### Tables

| Current                | New              | Action                                                                                                                                                                                                                                                    |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizations`        | `agencies`       | Rename. Keep only consultant orgs; BandiNet org concept handled by `is_internal()` instead of `org_type = 'bandinet'` row. Drop all unused columns (address*\*, brand*\_, ateco\_\_, financials, subscription\_\*) — moved to `agencies` with curated set |
| `organization_members` | `agency_members` | Rename. Drop `is_primary`. Rename FK `organization_id` → `agency_id`                                                                                                                                                                                      |
| `profiles`             | `profiles`       | Major reshape (see column changes below)                                                                                                                                                                                                                  |
| `permission_sections`  | —                | DROP (replaced by `internal_roles.permissions[]` array)                                                                                                                                                                                                   |
| `role_permissions`     | —                | DROP (replaced by `internal_roles.permissions[]` array)                                                                                                                                                                                                   |
| —                      | `internal_roles` | NEW table (role catalog with permissions array)                                                                                                                                                                                                           |

### Enum changes

| Current enum      | New enum       | Changes                                                                        |
| ----------------- | -------------- | ------------------------------------------------------------------------------ |
| `org_type`        | —              | DROP (no longer needed — `is_internal()` function replaces org-type branching) |
| `app_role`        | —              | DROP (replaced by `account_type` + `internal_roles.name`)                      |
| `profile_kind`    | —              | DROP (replaced by `account_type`)                                              |
| `org_member_role` | `org_role`     | Rename. Values: `admin` → `owner`, `operatore` → `operator`, `viewer` stays    |
| —                 | `account_type` | NEW: `internal`, `agency`, `customer`                                          |

### `profiles` column changes

| Current column  | New column         | Notes                                                                     |
| --------------- | ------------------ | ------------------------------------------------------------------------- |
| `email`         | —                  | DROP (lives in `auth.users` only)                                         |
| `role`          | `account_type`     | Rename + retype (was `app_role` enum, now `account_type` enum)            |
| `kind`          | —                  | DROP (redundant with `account_type`)                                      |
| `is_active`     | —                  | DROP (use Supabase Auth `banned_until` instead)                           |
| `is_premium`    | —                  | DROP (move to subscription/billing domain if needed)                      |
| `customer_type` | —                  | DROP (subject_type on `subjects` is the single source of truth)           |
| —               | `internal_role_id` | NEW: FK → `internal_roles(id)`, set only when `account_type = 'internal'` |

### Helper functions

| Current                               | New                            | Notes                                                               |
| ------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `is_bandinet()`                       | `is_internal()`                | Rename. Logic changes from org-membership to account_type check     |
| `get_my_org_id()`                     | `get_my_agency_id()`           | Rename. Only returns agency context now                             |
| `get_my_org_type()`                   | `get_account_type()`           | Rename + retype                                                     |
| `get_my_role()`                       | `get_internal_role()`          | Rename. Returns role name instead of app_role enum                  |
| `has_permission(p_action, p_section)` | `has_permission(p_permission)` | Simplified: single string like `'bandi:edit'` instead of two params |
| —                                     | `is_super_admin()`             | NEW                                                                 |
| —                                     | `is_email_verified()`          | Already exists in prod, just documented                             |
