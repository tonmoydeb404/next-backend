# BandiNet — VAT Lookups & Audit Schema

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All table names, column names and values in English
> **Depends on:** [subjects-database-schema.md](subjects-database-schema.md) (`subjects`, `subject_type`), [auth-database-schema.md](auth-database-schema.md) (`profiles`, `is_bandinet()`)

---

## Table of Contents

1. [Enums](#1-enums)
2. [Tables](#2-tables)
   - [vat_lookups](#vat_lookups)
   - [openapi_fetch_log](#openapi_fetch_log)
3. [RLS Policies](#3-rls-policies)
4. [Entity Relationship](#4-entity-relationship)

---

## 1. Enums

### `vat_lookup_status`

| Value       | Description                                |
| ----------- | ------------------------------------------ |
| `unclaimed` | Looked up, not yet attached to an account  |
| `claimed`   | Attached to a registered, verified account |
| `blocked`   | Disabled (abuse)                           |

### `openapi_fetch_status`

| Value          | Description                            |
| -------------- | -------------------------------------- |
| `success`      | Fetch returned usable company data     |
| `not_found`    | VAT code not found in Registro Imprese |
| `ceased`       | Company found but ceased/inactive      |
| `error`        | Upstream/API error                     |
| `rate_limited` | Blocked by the daily/per-IP fetch cap  |
| `cached_hit`   | Served from `vat_lookups`, no API call |

---

## 2. Tables

### `vat_lookups`

One row per unique VAT code ever entered in the VAT-first acquisition funnel (`matchator`). The OpenAPI Company fetch (currently tier `IT-full`) happens **at most once per VAT code** — this table is the permanent, per-company cache that makes every subsequent lookup free.

| Column                  | Type                 | Nullable | Default             | Description                                                |
| ----------------------- | -------------------- | -------- | ------------------- | ---------------------------------------------------------- |
| `id`                    | uuid                 | NO       | `gen_random_uuid()` | PK                                                         |
| `vat_code`              | text                 | NO       | —                   | VAT number (UNIQUE)                                        |
| `tax_code`              | text                 | YES      | —                   | Fiscal code                                                |
| `company_name`          | text                 | YES      | —                   | Company name                                               |
| `detected_subject_type` | subject_type         | YES      | —                   | Entity type detected from the fetch                        |
| `requires_manual_form`  | boolean              | NO       | `false`             | Not found in Registro Imprese — needs manual data entry    |
| `openapi_tier`          | text                 | NO       | `'IT-full'`         | API tier used for this fetch (`IT-advanced` on older rows) |
| `fetch_status`          | openapi_fetch_status | YES      | —                   | Result of the fetch that populated `payload`               |
| `payload`               | jsonb                | YES      | —                   | Cached raw API response                                    |
| `fetched_at`            | timestamptz          | YES      | —                   | Fetch timestamp                                            |
| `source_site`           | text                 | NO       | `'matchator'`       | Originating site                                           |
| `lookup_count`          | integer              | NO       | `1`                 | Total number of times this VAT code was looked up          |
| `first_lookup_at`       | timestamptz          | NO       | `now()`             | First lookup timestamp                                     |
| `last_lookup_at`        | timestamptz          | NO       | `now()`             | Most recent lookup timestamp                               |
| `visitor_email`         | text                 | YES      | —                   | Pre-registration email breadcrumb                          |
| `visitor_first_name`    | text                 | YES      | —                   | Pre-registration first name                                |
| `visitor_last_name`     | text                 | YES      | —                   | Pre-registration last name                                 |
| `status`                | vat_lookup_status    | NO       | `'unclaimed'`       | Funnel status                                              |
| `claimed_by`            | uuid                 | YES      | —                   | FK → `profiles(id)` ON DELETE SET NULL, claiming user      |
| `claimed_at`            | timestamptz          | YES      | —                   | Claim timestamp                                            |
| `subject_id`            | uuid                 | YES      | —                   | FK → `subjects(id)` ON DELETE SET NULL, resulting subject  |
| `created_at`            | timestamptz          | NO       | `now()`             | Row creation timestamp                                     |
| `updated_at`            | timestamptz          | NO       | `now()`             | Auto-updated via trigger                                   |

**Constraints:** UNIQUE(`vat_code`)

**Indexes:**

- PK on `id`
- UNIQUE on `vat_code`
- `idx_vat_lookups_status` on `status`
- `idx_vat_lookups_claimed_by` on `claimed_by` (partial, `WHERE claimed_by IS NOT NULL`)

---

### `openapi_fetch_log`

Audit trail for every OpenAPI Company call (cache hits included), used for cost tracking and rate limiting (daily cap + per-IP throttle).

| Column             | Type                 | Nullable | Default             | Description                                        |
| ------------------ | -------------------- | -------- | ------------------- | -------------------------------------------------- |
| `id`               | uuid                 | NO       | `gen_random_uuid()` | PK                                                 |
| `profile_id`       | uuid                 | YES      | —                   | FK → `profiles(id)`, requesting user               |
| `subject_id`       | uuid                 | YES      | —                   | FK → `subjects(id)`, target subject                |
| `vat_code`         | text                 | NO       | —                   | Queried VAT code                                   |
| `tier`             | text                 | NO       | —                   | API tier used (e.g. `IT-full`)                     |
| `status`           | openapi_fetch_status | NO       | —                   | Result status                                      |
| `http_status_code` | integer              | YES      | —                   | HTTP response code                                 |
| `cost_eur`         | numeric              | YES      | —                   | Cost of this call (EUR)                            |
| `response_time_ms` | integer              | YES      | —                   | Response time (ms)                                 |
| `error_message`    | text                 | YES      | —                   | Error details                                      |
| `cached`           | boolean              | YES      | `false`             | Served from `vat_lookups` cache, no real API call  |
| `client_ip`        | text                 | YES      | —                   | Requesting client IP, used for the per-IP throttle |
| `created_at`       | timestamptz          | NO       | `now()`             | Row creation timestamp                             |

**Indexes:**

- PK on `id`
- `idx_openapi_log_vat` on (`vat_code`, `created_at`)
- `idx_openapi_log_ip` on (`client_ip`, `created_at`)

---

## 3. RLS Policies

### `vat_lookups`

| Policy                       | Operation | Rule                      |
| ---------------------------- | --------- | ------------------------- |
| BandiNet manages vat_lookups | ALL       | `is_bandinet()`           |
| Owners view own vat_lookups  | SELECT    | `claimed_by = auth.uid()` |

### `openapi_fetch_log`

| Policy              | Operation | Rule                            |
| ------------------- | --------- | ------------------------------- |
| Authenticated reads | SELECT    | `auth.role() = 'authenticated'` |

**Notes:**

- Anonymous visitors never read either table directly — the whole funnel (`public_lookup_vat`) and the claim step (`claim_vat_lookup`) are `SECURITY DEFINER` RPCs that bypass RLS on write, enforce the daily/per-IP fetch caps, and return only a status string to the client.
- Neither table has an authenticated-role INSERT/UPDATE policy; every row is written by those two RPCs (or by BandiNet staff via the `ALL` policy on `vat_lookups`).

---

## 4. Entity Relationship

```
vat_lookups
  │  claimed_by ──────────► profiles
  │  subject_id ──────────► subjects
  │  detected_subject_type (subject_type enum)
  │
  │  (vat_code is the join key, not an FK — openapi_fetch_log
  │   logs every attempt, including ones that never got cached)
  ▼
openapi_fetch_log
  profile_id ─────────────► profiles
  subject_id ─────────────► subjects
```

`public_lookup_vat(p_piva, ...)` is the anonymous entry point: validates the VAT code, dedupes against `vat_lookups.vat_code`, calls OpenAPI **IT-full** only on first sight (cached forever after in `payload`), logs every attempt to `openapi_fetch_log`, and enforces a daily + per-IP fetch cap. `claim_vat_lookup(p_piva)` (verified, authenticated users only) then finds-or-creates a `companies` row by `vat_code` (see [subjects-database-schema.md](subjects-database-schema.md#companies)) and attaches a stored lookup to the calling account, creating/reusing the matching `subjects` row with `company_id` set.

---

## 5. Migration from current schema

### Tables

Both tables keep their current names — no renames needed.

### `vat_lookups` column changes

| Current column | New column     | Notes                                                                                                               |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `openapi_tier` | `openapi_tier` | Default changed: `'IT-advanced'` → `'IT-full'` (production switched 2026-06-15, old rows keep their original value) |
| All other cols | unchanged      | Schema matches production exactly                                                                                   |

### `openapi_fetch_log` column changes

| Current column | New column  | Notes                                                                                                                                                                   |
| -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client_ip`    | `client_ip` | Already exists (added in migration `20260610000004_per_ip_throttle_and_premium.sql`) — just documenting it since the original `database-schema.md` reference omitted it |

### RLS policy note

The current production RLS policy uses `is_bandinet()` (checks org membership in the BandiNet organization row). In the new auth model ([auth-database-schema.md](auth-database-schema.md)), this becomes `is_internal()` (checks `internal_role_id IS NOT NULL` on `profiles`). The logic is equivalent — same set of people — but the function name and implementation change.

### Enum values

`vat_lookup_status` and `openapi_fetch_status` values are already English in production — no translation needed.
