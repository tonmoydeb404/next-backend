# BandiNet — Geography Reference Schema

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All column names in English, values remain official Italian names

---

## Table of Contents

1. [Tables](#1-tables)
   - [regions](#regions)
   - [provinces](#provinces)
2. [RLS Policies](#2-rls-policies)
3. [Entity Relationship](#3-entity-relationship)
4. [Seeding](#4-seeding)
5. [Usage Pattern](#5-usage-pattern)

---

## 1. Tables

### `regions`

Italy's 20 administrative regions. Immutable reference data.

| Column | Type | Nullable | Default | Description                               |
| ------ | ---- | -------- | ------- | ----------------------------------------- |
| `code` | text | NO       | —       | PK — ISTAT region code (e.g. `"03"`)      |
| `name` | text | NO       | —       | Official region name (e.g. `"Lombardia"`) |

**Indexes:**

- PK on `code`

**Notes:**

- 20 fixed rows. Practically never changes.
- Referenced by `code` only from other tables — names are looked up here, never duplicated.

---

### `provinces`

Italy's ~107 provinces (including metropolitan cities). Immutable reference data.

| Column        | Type    | Nullable | Default | Description                               |
| ------------- | ------- | -------- | ------- | ----------------------------------------- |
| `code`        | char(2) | NO       | —       | PK — 2-letter province code (e.g. `"MI"`) |
| `name`        | text    | NO       | —       | Official province name (e.g. `"Milano"`)  |
| `region_code` | text    | NO       | —       | FK → `regions(code)`                      |

**Indexes:**

- PK on `code`
- `idx_provinces_region` on `region_code`

**Notes:**

- ~107 fixed rows. Changes only on rare administrative reorganization (last one in 2016).
- Any table needing a province stores `province_code` only — region can be derived via `region_code` JOIN, avoiding storing region twice.

---

## 2. RLS Policies

### `regions` / `provinces`

| Policy      | Operation | Rule                   |
| ----------- | --------- | ---------------------- |
| Public read | SELECT    | `true` (any auth role) |

**Notes:**

- No INSERT/UPDATE/DELETE policies — writes are via `service_role` scripts only.
- Public reference data, readable by `anon` for frontend dropdowns/filters.

---

## 3. Entity Relationship

```
┌──────────────────────┐
│       regions          │
│  code (PK)            │
│  name                 │
└──────────┬────────────┘
           │ region_code
           ▼
┌──────────────────────┐
│      provinces         │
│  code (PK)            │
│  name                 │
│  region_code ─────────┼──► regions
└──────────────────────┘
```

**External references (from other schema groups):**

- `subjects.registered_address` (jsonb) → stores `province_code` only
- `subject_operational_sites` → stores `province_code`, `region_code`
- `subject_intents.target` (jsonb, geographic intents) → stores `province_code`, `region_code`
- `tenants.address` (jsonb) → stores `province_code`, `region_code`
- `grant_match_criteria` (geographic eligibility) → stores region/province codes for matching, see [matching-database-schema.md](matching-database-schema.md)

**Pattern:** every table that needs a location stores only `province_code` and/or `region_code`. Names are resolved via JOIN (Publicator API) or a small cached client-side map (frontend — ~127 rows total, safe to load once).

---

## 4. Seeding

| Table       | Source                       | Rows |
| ----------- | ---------------------------- | ---- |
| `regions`   | ISTAT official region list   | 20   |
| `provinces` | ISTAT official province list | ~107 |

Seeded once via script. `regions` must be seeded first (FK dependency).

---

## 5. Usage Pattern

**Storing an address (any table):**

```json
{
  "street": "Via Roma 1",
  "town": "Milano",
  "zip_code": "20100",
  "province_code": "MI"
}
```

Region is not stored — it's derived: `provinces.region_code WHERE code = 'MI'`.

**Displaying an address (frontend):**

```ts
// Load once, cache client-side (~127 rows, rarely changes)
const { data: provinces } = await supabase
  .from("provinces")
  .select("code, name, region_code, regions(name)");

const provinceMap = new Map(provinces.map((p) => [p.code, p]));

// Display
const p = provinceMap.get(subject.registered_address.province_code);
`${p.name}, ${p.regions.name}`; // "Milano, Lombardia"
```

**`town` remains free text** — Italy has ~7900 comuni (municipalities), too granular and volatile to normalize into a reference table. OpenAPI/business registries already supply the town name directly.

---

## 6. Migration from current schema

### Tables

| Current | New         | Notes                                                                                                                                                                        |
| ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —       | `regions`   | NEW table. Currently region names are stored inline (e.g. `subjects.sede_legale_region_name`, `organizations.address_region_name`). This normalizes to code-only references. |
| —       | `provinces` | NEW table. Same — inline province names everywhere get replaced by code-only FK pattern.                                                                                     |

### Impact on other tables

Once `regions`/`provinces` exist, all tables that currently store `*_region_name` / `*_province_name` inline will drop those columns and keep only the code (JOIN for display). Affected tables in current production:

- `subjects`: `sede_legale_region_code`, `sede_legale_region_name`, `sede_legale_province_code`, `sede_legale_province_name` → becomes `registered_address.province_code` jsonb (name from JOIN)
- `subject_operational_sites`: `region_code`, `region_name`, `province_code`, `province_name` → keeps codes only, drops name columns
- `organizations` (→ `tenants`): `address_region_code`, `address_region_name`, `address_province_code`, `address_province_name` → becomes `address.province_code` jsonb (name from JOIN)
