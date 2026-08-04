# BandiNet — ATECO Taxonomy Schema

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All column names and values in English

---

## Table of Contents

1. [Tables](#1-tables)
   - [ateco](#ateco)
   - [ateco_crosswalk](#ateco_crosswalk)
   - [ateco_division_slugs](#ateco_division_slugs)
2. [RLS Policies](#2-rls-policies)
3. [Entity Relationship](#3-entity-relationship)
4. [Seeding](#4-seeding)
5. [Version Upgrade Flow](#5-version-upgrade-flow)

---

## 1. Tables

### `ateco`

Official Italian economic activity classification (ISTAT). Full hierarchy tree, multi-version. Each version adds ~3257 rows. Self-referencing via `parent_code` within the same version. Read-only reference data seeded from the official ISTAT source.

| Column         | Type     | Nullable | Default | Description                                                                      |
| -------------- | -------- | -------- | ------- | -------------------------------------------------------------------------------- |
| `code`         | text     | NO       | —       | PK (composite) — ATECO code (e.g. `"A"`, `"01"`, `"01.11.00"`)                   |
| `version`      | text     | NO       | —       | PK (composite) — ATECO version (e.g. `"2025"`, `"2030"`)                         |
| `title_it`     | text     | NO       | —       | Italian title (official ISTAT label)                                             |
| `title_en`     | text     | YES      | —       | English title                                                                    |
| `level`        | smallint | NO       | —       | Hierarchy depth: 1=section, 2=division, 3=group, 4=class, 5=subclass, 6=category |
| `parent_code`  | text     | YES      | —       | Parent node code (within same version). NULL for level-1 sections                |
| `section_code` | char(1)  | NO       | —       | Section letter (A–V). Denormalized for fast filtering                            |
| `sort_order`   | integer  | NO       | —       | Original ISTAT sort order                                                        |

**Constraints:**

- PK on `(code, version)`

**Indexes:**

- `idx_ateco_version` on `version`
- `idx_ateco_section` on `section_code`
- `idx_ateco_level` on `level`
- `idx_ateco_parent` on `(parent_code, version)`

**Notes:**

- ~3257 rows per version across 6 hierarchy levels: Section (A) → Division (01) → Group (01.1) → Class (01.11) → Subclass (01.11.0) → Category (01.11.00).
- Immutable reference data — no user writes. Seeded via script from official ISTAT spreadsheet.
- Old versions are **never deleted** — bandi and subjects reference `(code, version)` and those JOINs must always resolve.
- `section_code` is denormalized for efficient filtering.
- `parent_code` references within the same `version` (not a formal FK to avoid composite self-ref complexity, but enforced by seed script).

---

### `ateco_crosswalk`

Maps codes between ATECO versions. Used to upgrade bandi/subjects from an old version to a newer one.

| Column         | Type   | Nullable | Default        | Description                                          |
| -------------- | ------ | -------- | -------------- | ---------------------------------------------------- |
| `id`           | bigint | NO       | auto-increment | PK                                                   |
| `from_code`    | text   | NO       | —              | Source ATECO code                                    |
| `from_version` | text   | NO       | —              | Source version (e.g. `"2022"`)                       |
| `to_code`      | text   | NO       | —              | Target ATECO code                                    |
| `to_version`   | text   | NO       | —              | Target version (e.g. `"2025"`)                       |
| `coverage`     | text   | YES      | —              | `TOTAL` (exact match) or `PARTIAL` (partial overlap) |

**Indexes:**

- PK on `id`
- `idx_crosswalk_from` on `(from_code, from_version)`
- `idx_crosswalk_to` on `(to_code, to_version)`

**Notes:**

- Many-to-many: one old code can map to multiple new codes (split) and vice versa (merge).
- `coverage = 'TOTAL'` means the old code maps entirely to the new code. `PARTIAL` means only some activities are covered.
- When upgrading a record, prefer `TOTAL` matches. If only `PARTIAL` exists, flag for manual review.
- Seeded from official ISTAT bidirectional correspondence spreadsheet.
- Version-agnostic: works for any pair of versions (2022→2025, 2025→2030, etc.).

---

### `ateco_division_slugs`

Maps human-readable subsector slugs (from bando eligibility criteria) to 2-digit ATECO division codes. Bridges textual sector labels to numeric codes for the matching engine. Always references the **current** ATECO version.

| Column           | Type    | Nullable | Default | Description                                                 |
| ---------------- | ------- | -------- | ------- | ----------------------------------------------------------- |
| `slug`           | text    | NO       | —       | PK — subsector slug (e.g. `"costruzioni"`, `"agricoltura"`) |
| `division_codes` | text[]  | NO       | —       | 2-digit ATECO division codes covered by this slug           |
| `label`          | text    | YES      | —       | Human-readable label                                        |
| `section_code`   | char(1) | YES      | —       | ATECO section letter (A–V)                                  |
| `section_slug`   | text    | YES      | —       | Section-level slug for grouping                             |

**Notes:**

- Populated by the match-criteria script from bandi extraction data.
- `section_code` and `section_slug` are backfilled from `ateco` (current version) based on the first division code.
- Used in matching: bando eligibility specifies `ateco_included` slugs → this table resolves them to division codes → compared against subject's ATECO division.
- When a new ATECO version is adopted, this table is reseeded with updated division codes.

---

## 2. RLS Policies

### `ateco`

| Policy      | Operation | Rule                   |
| ----------- | --------- | ---------------------- |
| Public read | SELECT    | `true` (any auth role) |

### `ateco_crosswalk`

| Policy      | Operation | Rule                   |
| ----------- | --------- | ---------------------- |
| Public read | SELECT    | `true` (any auth role) |

### `ateco_division_slugs`

| Policy             | Operation | Rule                            |
| ------------------ | --------- | ------------------------------- |
| Authenticated read | SELECT    | `auth.role() = 'authenticated'` |

**Notes:**

- No INSERT/UPDATE/DELETE policies — all writes are via `service_role` scripts.
- `ateco` and `ateco_crosswalk` are public reference data.
- `ateco_division_slugs` is restricted to authenticated users (matching context only).

---

## 3. Entity Relationship

```
┌──────────────────────────────────┐
│            ateco                  │
│  (code, version) — composite PK  │
│  title_it, title_en              │
│  level (1-6)                     │
│  parent_code (same version)      │
│  section_code (A–V)              │
│  sort_order                      │
└──────────────────────────────────┘
        ▲                     ▲
        │                     │
  from_(code,version)   to_(code,version)
        │                     │
┌───────┴─────────────────────┴────┐
│       ateco_crosswalk            │
│  from_code, from_version         │
│  to_code, to_version             │    Version migration mapping
│  coverage (TOTAL/PARTIAL)        │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│    ateco_division_slugs          │
│  slug (PK)                       │
│  division_codes[] ───────────────┼──► 2-digit codes (current version)
│  section_code, label             │
│                                  │    Bridges bando eligibility → ATECO
└──────────────────────────────────┘
```

**External references (from other schema groups):**

- `subjects` stores `ateco_code` + `ateco_version` for sector-based matching
- `grants` / `grant_match_criteria` stores `ateco_code` + `ateco_version` for eligibility
- `grant_match_criteria.ateco_included` — array of slugs that resolve via `ateco_division_slugs`

---

## 4. Seeding

| Table                  | Source                                         | Script                        | Rows per version |
| ---------------------- | ---------------------------------------------- | ----------------------------- | ---------------- |
| `ateco`                | ISTAT official taxonomy (full tree)            | `seed-ateco.mjs`              | ~3257            |
| `ateco_crosswalk`      | ISTAT bidirectional correspondence spreadsheet | `seed-ateco-crosswalk.mjs`    | ~6682            |
| `ateco_division_slugs` | Derived from bandi extraction data             | `populate-match-criteria.mjs` | varies           |

**Seeding order:** `ateco` first → `ateco_crosswalk` second → `ateco_division_slugs` last.

**Initial seed:** `ateco` with versions `"2022"` and `"2025"`, crosswalk with `from_version = "2022"`, `to_version = "2025"`.

---

## 5. Version Upgrade Flow

When a new ATECO version is published (e.g. 2030):

```
1. Seed new ateco rows
   → INSERT INTO ateco (..., version = '2030') — ~3257 new rows
   → Old versions remain untouched

2. Seed crosswalk
   → INSERT INTO ateco_crosswalk (from_version = '2025', to_version = '2030', ...)

3. Reseed ateco_division_slugs
   → Update division_codes to use 2030 codes

4. Upgrade existing records (optional, per-record)
   → For each bando/subject still on version '2025':
     → Look up crosswalk: from_code = current code, from_version = '2025', to_version = '2030'
     → If coverage = 'TOTAL': auto-upgrade
     → If coverage = 'PARTIAL': flag for manual review
     → UPDATE SET ateco_code = new_code, ateco_version = '2030'

5. New bandi/subjects default to the latest version
```

---

## 6. Migration from current schema

### Table renames

| Current                | New                    | Notes                                                       |
| ---------------------- | ---------------------- | ----------------------------------------------------------- |
| `ateco_2025`           | `ateco`                | Version-agnostic; add `version` column to form composite PK |
| `ateco_2025_2022_map`  | `ateco_crosswalk`      | Version-agnostic naming                                     |
| `ateco_division_slugs` | `ateco_division_slugs` | Unchanged name                                              |

### `ateco_2025` → `ateco` column changes

| Current column | New column     | Notes                                              |
| -------------- | -------------- | -------------------------------------------------- |
| `codice` (PK)  | `code`         | Rename. Now part of composite PK `(code, version)` |
| —              | `version`      | NEW: part of composite PK (e.g. `"2025"`)          |
| `codice_padre` | `parent_code`  | Rename                                             |
| `livello`      | `level`        | Rename + retype (integer → smallint)               |
| `ordine`       | `sort_order`   | Rename                                             |
| `sezione_code` | `section_code` | Rename                                             |
| `titolo_it`    | `title_it`     | Rename                                             |
| `titolo_en`    | `title_en`     | Rename                                             |

### `ateco_2025_2022_map` → `ateco_crosswalk` column changes

| Current column   | New column     | Notes                                                              |
| ---------------- | -------------- | ------------------------------------------------------------------ |
| `codice_2022`    | `from_code`    | Rename (version-agnostic)                                          |
| `codice_2025`    | `to_code`      | Rename (version-agnostic)                                          |
| —                | `from_version` | NEW (e.g. `"2022"`)                                                |
| —                | `to_version`   | NEW (e.g. `"2025"`)                                                |
| `copertura_2022` | —              | DROP (replaced by `coverage` on the mapping itself)                |
| `copertura_2025` | —              | DROP (same)                                                        |
| `gerarchia`      | —              | DROP (hierarchy level not needed in crosswalk)                     |
| `titolo_2022`    | —              | DROP (titles live in `ateco` itself, JOIN to get them)             |
| `titolo_2025`    | —              | DROP (same)                                                        |
| —                | `coverage`     | NEW: `TOTAL` or `PARTIAL` (derived from the old copertura columns) |

### `ateco_division_slugs` column changes

| Current column | New column     | Notes  |
| -------------- | -------------- | ------ |
| `slug_sezione` | `section_slug` | Rename |
