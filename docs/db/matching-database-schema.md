# BandiNet — Matching Engine Schema

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All table names, column names and values in English
> **Depends on:** [bandi-database-schema.md](bandi-database-schema.md) (`grants`), [subjects-database-schema.md](subjects-database-schema.md) (`subjects`, `match_status`, `investment_area`), [ateco-database-schema.md](ateco-database-schema.md) (`ateco`, `ateco_crosswalk`)

---

## Table of Contents

1. [Enums](#1-enums)
2. [Tables](#2-tables)
   - [grant_match_criteria](#grant_match_criteria)
   - [subject_grant_matches](#subject_grant_matches)
3. [RLS Policies](#3-rls-policies)
4. [Entity Relationship](#4-entity-relationship)
5. [Value translation notes](#5-value-translation-notes)

---

## 1. Enums

### `local_presence_requirement`

| Value                                    | Description                                                    |
| ---------------------------------------- | -------------------------------------------------------------- |
| `no_constraint`                          | No geographic seat requirement                                 |
| `operational_site_only`                  | Requires at least an operational site in an eligible region    |
| `at_least_operational_site`              | Same as above (kept distinct — see note in §5)                 |
| `at_least_registered_office`             | Requires the registered office in an eligible region           |
| `registered_office_and_operational_site` | Requires both registered office and operational site in-region |

### `applicant_person_category`

Values used in `required_categories` — person-level requirements a contribution can impose (from schema B `person_characteristics.required_categories[]`).

| Value                            | Description                                   |
| -------------------------------- | --------------------------------------------- |
| `female`                         | Female (shareholder/owner gender requirement) |
| `youth_under_36`                 | Under 36 years old                            |
| `unemployed`                     | Currently unemployed (registered)             |
| `not_previously_employed`        | Never held formal employment                  |
| `neet`                           | Not in education, employment, or training     |
| `student`                        | Currently a student                           |
| `retired`                        | Retired                                       |
| `disadvantaged_worker`           | Classified as a disadvantaged worker          |
| `unemployment_benefit_recipient` | Receiving unemployment benefits               |

### `applicant_category`

Values used in `eligible_applicant_types` — which kind of applicant a contribution admits (from schema B `new_business_scenario.eligible_applicant_types[]`). Maps 1:1 to `subjects.subject_type` at match time.

| Value                          | Description                                                 |
| ------------------------------ | ----------------------------------------------------------- |
| `pre_incorporation_individual` | Natural person not yet incorporated (aspiring entrepreneur) |
| `newly_incorporated_business`  | Business incorporated recently (new-business scenario)      |
| `freelancer`                   | Self-employed professional (libero professionista)          |
| `existing_business`            | Already-incorporated, operating business                    |

---

## 2. Tables

### `grant_match_criteria`

**Derived / regenerable** projection from `grants.general_info` / `grants.funding`. One row per (grant, contribution). Three-layer matching: HARD FILTER → SOFT MATCH (score 0–100) → FLAGS. Regenerated (delete + reinsert) by `scripts/populate-match-criteria.mjs` whenever a grant's extraction data changes — never edited directly.

Only the columns actually driving cross-grant filtering (GIN-indexed lookups used to shortlist grants) are kept flat. Everything else the engine only reads _after_ it has already loaded a specific `(grant_id, contribution_index)` row — no index benefit — so those are grouped into `jsonb` buckets by concern, same convention as `grants` (flat = indexed/matching-critical, jsonb = read-together).

| Column                        | Type                       | Nullable | Default             | Description                                                                                                                                                                                                                |
| ----------------------------- | -------------------------- | -------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | uuid                       | NO       | `gen_random_uuid()` | PK                                                                                                                                                                                                                         |
| `grant_id`                    | uuid                       | NO       | —                   | FK → `grants(id)` ON DELETE CASCADE                                                                                                                                                                                        |
| `contribution_index`          | integer                    | NO       | `0`                 | Index within the grant's contributions                                                                                                                                                                                     |
| `contribution_description`    | text                       | YES      | —                   | Contribution label                                                                                                                                                                                                         |
| `is_primary_contribution`     | boolean                    | NO       | `false`             | Primary contribution flag                                                                                                                                                                                                  |
| **Indexed shortlist filters** |                            |          |                     |                                                                                                                                                                                                                            |
| `regions`                     | text[]                     | YES      | —                   | Eligible region codes (NULL = all of Italy), references `regions(code)` — GIN indexed                                                                                                                                      |
| `provinces`                   | text[]                     | YES      | —                   | Eligible province codes, references `provinces(code)`                                                                                                                                                                      |
| `local_presence_requirement`  | local_presence_requirement | YES      | —                   | Geographic seat requirement                                                                                                                                                                                                |
| `company_sizes`               | text[]                     | YES      | —                   | Allowed enterprise sizes (extraction-schema enum, see §5) — GIN indexed                                                                                                                                                    |
| `ateco_version`               | text                       | YES      | —                   | ATECO version (e.g. `"2025"`) all `ateco_included`/`ateco_excluded`/`ateco_included_raw`/`ateco_excluded_raw` codes belong to, copied from `beneficiaries.ateco_version` — required to join against `ateco(code, version)` |
| `ateco_included`              | text[]                     | YES      | —                   | Included ATECO division codes, resolved from `ateco_included_raw` via `ateco.parent_code` hierarchy (joined on `ateco_version`) — GIN indexed                                                                              |
| `ateco_excluded`              | text[]                     | YES      | —                   | Excluded ATECO division codes, resolved from `ateco_excluded_raw` via `ateco.parent_code` hierarchy (joined on `ateco_version`) — GIN indexed                                                                              |
| `ateco_included_raw`          | text[]                     | YES      | —                   | Included ATECO codes at any level, sourced directly from `beneficiaries.subsectors[].value` — GIN indexed                                                                                                                  |
| `ateco_excluded_raw`          | text[]                     | YES      | —                   | Excluded ATECO codes at any level, sourced directly from `beneficiaries.subsectors[].value` — GIN indexed                                                                                                                  |
| `special_aid_objectives`      | investment_area[]          | YES      | —                   | Investment areas this grant specially targets — reuses `subjects.investment_area` for the match-score boost overlap — GIN indexed                                                                                          |
| `is_ri_required`              | boolean                    | YES      | —                   | Registro Imprese registration required (cheap HARD FILTER boolean, kept flat)                                                                                                                                              |
| `is_runts_required`           | boolean                    | YES      | —                   | RUNTS registration required (cheap HARD FILTER boolean, kept flat)                                                                                                                                                         |
| `requires_albo`               | boolean                    | YES      | —                   | Professional register (Albo) enrollment required (cheap HARD FILTER boolean, kept flat)                                                                                                                                    |
| **Grouped detail (jsonb)**    |                            |          |                     |                                                                                                                                                                                                                            |
| `legal_forms`                 | jsonb                      | YES      | —                   | `{inside_ri[], outside_ri[], participation_forms[]}` — see shape below                                                                                                                                                     |
| `person_requirements`         | jsonb                      | YES      | —                   | `{categories[], age_min, age_max, role, ownership_share_min}` — see shape below                                                                                                                                            |
| `company_requirements`        | jsonb                      | YES      | —                   | `{incorporation_age_min_months, incorporation_age_max_months, must_not_be_incorporated, workforce_min, workforce_max, registro_imprese_sections[], financial_conditions[]}`                                                |
| `applicant_kind_rules`        | jsonb                      | YES      | —                   | `{eligible_applicant_types[], applicant_disqualifying_conditions[], required_company_form[], individuals_only_shareholders, requires_pa_oriented, requires_degree, constitution_deadline_days}`                            |
| `economics`                   | jsonb                      | YES      | —                   | `{rate_base, rate_min, rate_max, rate_extra, max_contribution, min_eligible_cost, aid_schemes[]}` — display/score only, never a knockout                                                                                   |
| **Debug**                     |                            |          |                     |                                                                                                                                                                                                                            |
| `raw`                         | jsonb                      | YES      | —                   | Source contribution data (debug/regeneration check)                                                                                                                                                                        |
| `created_at`                  | timestamptz                | NO       | `now()`             | Row creation timestamp                                                                                                                                                                                                     |
| `updated_at`                  | timestamptz                | NO       | `now()`             | Auto-updated via trigger                                                                                                                                                                                                   |

**Constraints:** UNIQUE(`grant_id`, `contribution_index`)

**Indexes:**

- PK on `id`
- `idx_grant_match_criteria_grant` on `grant_id`
- GIN index on `regions`
- GIN index on `company_sizes`
- GIN index on `ateco_included`
- GIN index on `ateco_excluded`
- GIN index on `ateco_included_raw`
- GIN index on `ateco_excluded_raw`
- GIN index on `special_aid_objectives`

**`legal_forms` shape:**

```json
{
  "inside_ri": ["srl", "spa"],
  "outside_ri": ["libero_professionista"],
  "participation_forms": ["single", "group"]
}
```

**`person_requirements` shape:**

```json
{
  "categories": ["female", "youth_under_36"],
  "age_min": null,
  "age_max": 35,
  "role": "socio_maggioranza_quote",
  "ownership_share_min": 50
}
```

**`company_requirements` shape:**

```json
{
  "incorporation_age_min_months": null,
  "incorporation_age_max_months": 60,
  "must_not_be_incorporated": false,
  "workforce_min": null,
  "workforce_max": 9,
  "registro_imprese_sections": ["speciale_startup_innovative"],
  "financial_conditions": []
}
```

**`applicant_kind_rules` shape:**

```json
{
  "eligible_applicant_types": ["existing_business"],
  "applicant_disqualifying_conditions": [],
  "required_company_form": [],
  "individuals_only_shareholders": false,
  "requires_pa_oriented": false,
  "requires_degree": false,
  "constitution_deadline_days": null
}
```

**`economics` shape:**

```json
{
  "rate_base": 0.5,
  "rate_min": 0.3,
  "rate_max": 0.7,
  "rate_extra": 0.1,
  "max_contribution": 150000,
  "min_eligible_cost": 20000,
  "aid_schemes": ["de_minimis"]
}
```

---

### `subject_grant_matches`

Links a subject to a grant with a match score and lifecycle status.

| Column             | Type         | Nullable | Default             | Description                                                                                    |
| ------------------ | ------------ | -------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `id`               | uuid         | NO       | `gen_random_uuid()` | PK                                                                                             |
| `subject_id`       | uuid         | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE                                                          |
| `grant_id`         | uuid         | NO       | —                   | FK → `grants(id)` ON DELETE CASCADE                                                            |
| `match_score`      | numeric      | YES      | —                   | Score 0–100                                                                                    |
| `match_criteria`   | jsonb        | YES      | —                   | Detailed score breakdown                                                                       |
| `status`           | match_status | NO       | `'potential'`       | Match lifecycle status (defined in [subjects-database-schema.md](subjects-database-schema.md)) |
| `notes`            | text         | YES      | —                   | Internal notes                                                                                 |
| `amount_requested` | numeric      | YES      | —                   | Amount requested (EUR)                                                                         |
| `amount_granted`   | numeric      | YES      | —                   | Amount granted (EUR)                                                                           |
| `submitted_at`     | timestamptz  | YES      | —                   | Application submission date                                                                    |
| `outcome_at`       | timestamptz  | YES      | —                   | Outcome date                                                                                   |
| `managed_by`       | uuid         | YES      | —                   | FK → `profiles(id)`                                                                            |
| `created_at`       | timestamptz  | NO       | `now()`             | Row creation timestamp                                                                         |
| `updated_at`       | timestamptz  | NO       | `now()`             | Auto-updated via trigger                                                                       |

**Constraints:** UNIQUE(`subject_id`, `grant_id`)

**Indexes:**

- PK on `id`
- `idx_subject_grant_matches_subject` on `subject_id`
- `idx_subject_grant_matches_grant` on `grant_id`
- `idx_subject_grant_matches_status` on `status`

---

## 3. RLS Policies

### `grant_match_criteria`

| Policy                                    | Operation | Rule                                                             |
| ----------------------------------------- | --------- | ---------------------------------------------------------------- |
| Public reads criteria of published grants | SELECT    | `grant_id IN (SELECT id FROM grants WHERE status = 'published')` |
| Authenticated reads all                   | SELECT    | `auth.role() = 'authenticated'`                                  |
| Internal manages all                      | ALL       | `is_internal()`                                                  |

### `subject_grant_matches`

| Policy                  | Operation | Rule                                                                        |
| ----------------------- | --------- | --------------------------------------------------------------------------- |
| Tenant sees own matches | SELECT    | `subject_id IN (SELECT id FROM subjects WHERE is_tenant_member(tenant_id))` |
| Internal sees all       | SELECT    | `is_internal()`                                                             |
| Tenant manages own      | ALL       | Same subject-ownership rule as SELECT above                                 |
| Internal manages all    | ALL       | `is_internal()`                                                             |

---

## 4. Entity Relationship

```
grants                              subjects
  │  1:N (regenerated on save)         │  1:N
  ▼                                    ▼
grant_match_criteria            subject_grant_matches ◄──── grant_id, subject_id
  │  regions, sizes, ATECO incl/excl    │  match_score, status
  │  is_ri_required, requires_albo      │  amount_requested/granted
  │  legal_forms / person_requirements / company_requirements /
  │  applicant_kind_rules / economics (jsonb groups)
  │  special_aid_objectives ──────────► investment_area (subjects schema)
```

`match_profile_to_bandi(...)` (engine function; name kept as-is pending a
broader function-rename pass — see [bandi-database-schema.md](bandi-database-schema.md))
reads `grant_match_criteria` rows for a grant and the caller's `subjects` /
`subject_intents` / `subject_investment_projects` / `subject_operational_sites` /
`subject_shareholders` columns, and returns a tier (`full`/`conditional`/`ko`) +
score + reasons. Results a caller wants to persist are written to
`subject_grant_matches`.

---

## 5. Value translation notes

- `beneficiaries.subsectors[].value` (see [bandi-database-schema.md](bandi-database-schema.md)) holds the raw ATECO
  code (e.g. `"10.11.00"`), per client confirmation — not a human-readable label. `populate-match-criteria.mjs`
  copies it straight into `ateco_included_raw`/`ateco_excluded_raw`, and resolves `ateco_included`/`ateco_excluded`
  (division-level) by walking the code's `ateco.parent_code` chain up to level 2. The extraction schema's `match`
  slug field has been dropped — it was never consumed by any matching/filtering logic.
- `ateco_version` is copied straight from `beneficiaries.ateco_version` and is required for the `parent_code` walk
  above — `ateco`'s PK is `(code, version)`, so resolving a code's parent/title without pinning the version could
  silently join against the wrong row once a new ATECO version is seeded. Subject-side matching should only compare
  `ateco_included`/`ateco_excluded` against `subjects.ateco_division` when `subjects.ateco_version` and
  `grant_match_criteria.ateco_version` agree, or after upgrading one side via `ateco_crosswalk`.
- `local_presence_requirement`: the original schema had 5 distinct Italian values
  (`nessun_vincolo`, `solo_sede_operativa`, `almeno_sede_operativa`,
  `almeno_sede_legale`, `sede_legale_e_operativa`). `solo_sede_operativa` and
  `almeno_sede_operativa` were kept as two separate English values
  (`operational_site_only` / `at_least_operational_site`) rather than merged,
  since the original modeled them distinctly — confirm with source data whether
  they're actually redundant before dropping one.
- `required_categories` (`applicant_person_category`) and `eligible_applicant_types`
  (`applicant_category`) values were translated from the enums documented in
  `dashboard/docs/matching-e-scenari.md` and the schema B `new_business_scenario`
  extraction fields.
- `company_sizes` (kept flat, GIN indexed) and the nested `legal_forms.inside_ri`/
  `legal_forms.outside_ri`, `company_requirements.registro_imprese_sections`,
  `company_requirements.financial_conditions`, `economics.aid_schemes`, and
  `applicant_kind_rules.required_company_form` are **left as free-form arrays of
  text** — their actual value sets are defined by the AI extraction schema
  (schema A/B in `bandinet-prompt-eng-estrazione-dati/`), which is a separate
  system from this database redesign. Translating those extractor enums to
  English is a follow-up task, not a database schema change, since it would
  require updating the live extraction prompts/schemas the AI model is given.
- `contributo_max` / `costo_min` → renamed to `max_contribution` / `min_eligible_cost`,
  now nested under `economics`.
- `soci_solo_persone_fisiche` → renamed to `individuals_only_shareholders`, now
  nested under `applicant_kind_rules`.
- Most non-indexed columns (`legal_forms_ri`, `legal_forms_outside_ri`,
  `participation_forms`, `required_categories`, `person_age_min/max`,
  `person_role`, `ownership_share_min`, `incorporation_age_min/max_months`,
  `must_not_be_incorporated`, `workforce_min/max`, `registro_imprese_sections`,
  `financial_conditions`, `eligible_applicant_types`,
  `applicant_disqualifying_conditions`, `required_company_form`,
  `individuals_only_shareholders`, `requires_pa_oriented`, `requires_degree`,
  `constitution_deadline_days`, `rate_base/min/max/extra`, `max_contribution`,
  `min_eligible_cost`, `aid_schemes`) were collapsed into the `legal_forms` /
  `person_requirements` / `company_requirements` / `applicant_kind_rules` /
  `economics` jsonb groups — none of them are GIN-indexed, they're only read
  after a specific `(grant_id, contribution_index)` row is already loaded.

---

## 6. Migration from current schema

### Table renames

| Current                 | New                     | Notes          |
| ----------------------- | ----------------------- | -------------- |
| `bando_match_criteria`  | `grant_match_criteria`  | English naming |
| `subject_bando_matches` | `subject_grant_matches` | English naming |

### Enum changes

| Current | New                          | Notes                                                                     |
| ------- | ---------------------------- | ------------------------------------------------------------------------- |
| —       | `local_presence_requirement` | NEW (was free-text Italian values in `local_presence_requirement` column) |
| —       | `applicant_person_category`  | NEW (was free-text Italian values in `required_categories[]`)             |
| —       | `applicant_category`         | NEW (was free-text Italian values in `eligible_applicant_types[]`)        |

### `bando_match_criteria` → `grant_match_criteria` column changes

| Current column                                    | New representation                                                  | Notes                           |
| ------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| `bando_id`                                        | `grant_id`                                                          | Rename FK                       |
| `legal_forms_ri[]`                                | `legal_forms.inside_ri[]` (jsonb)                                   | Moved into jsonb group          |
| `legal_forms_outside_ri[]`                        | `legal_forms.outside_ri[]` (jsonb)                                  | Moved into jsonb group          |
| `participation_forms[]`                           | `legal_forms.participation_forms[]` (jsonb)                         | Moved into jsonb group          |
| `required_categories[]`                           | `person_requirements.categories[]` (jsonb)                          | Moved into jsonb group          |
| `person_age_min`                                  | `person_requirements.age_min` (jsonb)                               | Moved into jsonb group          |
| `person_age_max`                                  | `person_requirements.age_max` (jsonb)                               | Moved into jsonb group          |
| `person_role`                                     | `person_requirements.role` (jsonb)                                  | Moved into jsonb group          |
| `ownership_share_min`                             | `person_requirements.ownership_share_min` (jsonb)                   | Moved into jsonb group          |
| `incorporation_age_min_months`                    | `company_requirements.incorporation_age_min_months` (jsonb)         | Moved into jsonb group          |
| `incorporation_age_max_months`                    | `company_requirements.incorporation_age_max_months` (jsonb)         | Moved into jsonb group          |
| `must_not_be_incorporated`                        | `company_requirements.must_not_be_incorporated` (jsonb)             | Moved into jsonb group          |
| `workforce_min`                                   | `company_requirements.workforce_min` (jsonb)                        | Moved into jsonb group          |
| `workforce_max`                                   | `company_requirements.workforce_max` (jsonb)                        | Moved into jsonb group          |
| `registro_imprese_sections[]`                     | `company_requirements.registro_imprese_sections[]` (jsonb)          | Moved into jsonb group          |
| `financial_conditions[]`                          | `company_requirements.financial_conditions[]` (jsonb)               | Moved into jsonb group          |
| `eligible_applicant_types[]`                      | `applicant_kind_rules.eligible_applicant_types[]` (jsonb)           | Moved into jsonb group          |
| `applicant_disqualifying_conditions[]`            | `applicant_kind_rules.applicant_disqualifying_conditions[]` (jsonb) | Moved into jsonb group          |
| `required_company_form[]`                         | `applicant_kind_rules.required_company_form[]` (jsonb)              | Moved into jsonb group          |
| `soci_solo_persone_fisiche`                       | `applicant_kind_rules.individuals_only_shareholders` (jsonb)        | Rename + moved into jsonb group |
| `requires_pa_oriented`                            | `applicant_kind_rules.requires_pa_oriented` (jsonb)                 | Moved into jsonb group          |
| `requires_degree`                                 | `applicant_kind_rules.requires_degree` (jsonb)                      | Moved into jsonb group          |
| `constitution_deadline_days`                      | `applicant_kind_rules.constitution_deadline_days` (jsonb)           | Moved into jsonb group          |
| `rate_base`, `rate_min`, `rate_max`, `rate_extra` | `economics.rate_*` (jsonb)                                          | Moved into jsonb group          |
| `contributo_max`                                  | `economics.max_contribution` (jsonb)                                | Rename + moved into jsonb group |
| `costo_min`                                       | `economics.min_eligible_cost` (jsonb)                               | Rename + moved into jsonb group |
| `aid_schemes[]`                                   | `economics.aid_schemes[]` (jsonb)                                   | Moved into jsonb group          |

### `subject_bando_matches` → `subject_grant_matches` column changes

| Current column | New column | Notes                                                                                               |
| -------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `bando_id`     | `grant_id` | Rename FK                                                                                           |
| `status`       | `status`   | Same column, but enum values now English (see subjects-database-schema.md `match_status` migration) |
