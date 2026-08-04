# BandiNet — Subjects Schema

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All column names and values in English

---

## Table of Contents

1. [Enums](#1-enums)
2. [Tables](#2-tables)
   - [subjects](#subjects)
   - [subject_shareholders](#subject_shareholders)
   - [subject_operational_sites](#subject_operational_sites)
   - [subject_managers](#subject_managers)
   - [subject_participations](#subject_participations)
   - [subject_intents](#subject_intents)
   - [subject_investment_projects](#subject_investment_projects)
   - [subject_openapi_cache](#subject_openapi_cache)
3. [Triggers](#3-triggers)
4. [RLS Policies](#4-rls-policies)
5. [Entity Relationship](#5-entity-relationship)

---

## 1. Enums

### `subject_type`

| Value                   | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `registered_company`    | Company registered in the Italian business registry        |
| `freelancer`            | Self-employed professional (libero professionista)         |
| `aspiring_entrepreneur` | Person planning to start a business                        |
| `non_ri_entity`         | Non-profit / entity not in business registry (RUNTS, etc.) |

### `data_source`

| Value             | Description                           |
| ----------------- | ------------------------------------- |
| `openapi_auto`    | Fully imported from OpenAPI           |
| `manual`          | Manually entered                      |
| `openapi_partial` | Partially imported, manually enriched |

### `intent_type`

| Value                        | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `open_operational_site`      | Open a new operational site                    |
| `move_registered_office`     | Move registered office                         |
| `open_new_registered_office` | Open a new registered office                   |
| `hire_employees`             | Hire new employees                             |
| `change_legal_form`          | Change legal form                              |
| `register_business_registry` | Register in the business registry              |
| `register_special_section`   | Register in a special section                  |
| `register_runts`             | Register in RUNTS                              |
| `change_ateco`               | Change ATECO code                              |
| `purchase_land`              | Purchase land                                  |
| `new_shareholder`            | Add a new shareholder of a specific category   |
| `increase_shares`            | Increase shares for a category of shareholders |
| `specific_investment`        | Make a specific investment                     |
| `open_vat`                   | Open a new VAT number                          |

### `intent_status`

| Value     | Description                    |
| --------- | ------------------------------ |
| `planned` | Concrete plan with a timeline  |
| `wish`    | Aspiration, no firm commitment |

### `match_status`

| Value       | Description                        |
| ----------- | ---------------------------------- |
| `potential` | Potential match (system-generated) |
| `candidate` | Submitted / actively pursuing      |
| `won`       | Grant awarded                      |
| `lost`      | Application rejected               |
| `excluded`  | Manually excluded from matching    |

### `investment_area`

| Value                       | Description                              |
| --------------------------- | ---------------------------------------- |
| `patents_trademarks`        | Patents, designs, trademarks             |
| `internationalization`      | Internationalization / export            |
| `industry_4_0`              | Industry 4.0 / PID vouchers              |
| `workplace_safety`          | Workplace safety (ISI INAIL)             |
| `new_business`              | Starting a new business                  |
| `photovoltaic`              | Photovoltaic / solar energy              |
| `trade_fairs`               | Trade fairs / exhibitions                |
| `agricultural_photovoltaic` | Agri-voltaic systems                     |
| `expansion_modernization`   | Expansion / modernization / reconversion |
| `intellectual_property`     | Intangible assets / IP                   |
| `energy_sustainability`     | Energy and sustainability                |
| `training_hr`               | Training / human resources               |
| `ict_digitalization`        | ICT / digitalization                     |
| `innovation_research`       | Innovation and R&D                       |
| `working_capital`           | Working capital / liquidity              |
| `machinery_equipment`       | Machinery, plants, equipment             |

---

## 2. Tables

### `subjects`

The core business entity — a company, freelancer, or aspiring entrepreneur that gets matched against bandi. Owned by either a customer (direct) or an agency member.

| Column                               | Type         | Nullable | Default                | Description                                                                           |
| ------------------------------------ | ------------ | -------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `id`                                 | uuid         | NO       | `gen_random_uuid()`    | PK                                                                                    |
| `owner_profile_id`                   | uuid         | YES      | —                      | FK → `profiles(id)`. Customer or agency member who owns this subject                  |
| `agency_id`                          | uuid         | YES      | —                      | FK → `agencies(id)` ON DELETE CASCADE. Set when managed by an agency                  |
| `subject_type`                       | subject_type | NO       | `'registered_company'` | Entity type                                                                           |
| `data_source`                        | data_source  | NO       | `'manual'`             | Data provenance                                                                       |
| `is_primary`                         | boolean      | NO       | `true`                 | Primary subject for the owner                                                         |
| **Company identity**                 |              |          |                        |                                                                                       |
| `company_name`                       | text         | YES      | —                      | Company / display name                                                                |
| `vat_code`                           | text         | YES      | —                      | VAT number (P.IVA)                                                                    |
| `tax_code`                           | text         | YES      | —                      | Fiscal code                                                                           |
| `activity_status`                    | text         | YES      | —                      | Activity status (active, suspended, etc.)                                             |
| `is_ceased`                          | boolean      | YES      | —                      | Company has ceased activity                                                           |
| `has_bankruptcy`                     | boolean      | YES      | —                      | Bankruptcy proceedings flag                                                           |
| **Legal form**                       |              |          |                        |                                                                                       |
| `legal_form`                         | jsonb        | YES      | —                      | `{code, description, bando_enum}`                                                     |
| **ATECO**                            |              |          |                        |                                                                                       |
| `ateco_primary`                      | jsonb        | YES      | —                      | `{code, description}` — primary activity, shares `ateco_version`                      |
| `ateco_secondary`                    | jsonb[]      | YES      | —                      | Array of `{code, description}`, all sharing `ateco_version`                           |
| `ateco_division`                     | char(2)      | YES      | —                      | Derived 2-digit division (for matching)                                               |
| `ateco_section`                      | char(1)      | YES      | —                      | Derived section letter (for matching)                                                 |
| `ateco_version`                      | text         | YES      | —                      | ATECO version all codes on this subject belong to (single source of truth)            |
| **Registered address**               |              |          |                        |                                                                                       |
| `registered_address`                 | jsonb        | YES      | —                      | See shape below                                                                       |
| **Size & classification**            |              |          |                        |                                                                                       |
| `enterprise_size`                    | jsonb        | YES      | —                      | `{code, description, bando_enum}`                                                     |
| `employee_count`                     | integer      | YES      | —                      | Number of employees                                                                   |
| `turnover`                           | numeric      | YES      | —                      | Revenue (EUR)                                                                         |
| `turnover_year`                      | integer      | YES      | —                      | Revenue reference year                                                                |
| **Financials**                       |              |          |                        |                                                                                       |
| `financials`                         | jsonb        | YES      | —                      | Full financial dataset (see shape below)                                              |
| **Dates**                            |              |          |                        |                                                                                       |
| `incorporation_date`                 | date         | YES      | —                      | Incorporation date                                                                    |
| `start_date`                         | date         | YES      | —                      | Activity start date                                                                   |
| `registration_date`                  | date         | YES      | —                      | Business registry registration date                                                   |
| **Registry flags**                   |              |          |                        |                                                                                       |
| `registry_flags`                     | jsonb        | YES      | —                      | See shape below                                                                       |
| **Professional fields (freelancer)** |              |          |                        |                                                                                       |
| `professional_profile`               | jsonb        | YES      | —                      | See shape below                                                                       |
| **Aspiring entrepreneur**            |              |          |                        |                                                                                       |
| `planned_business`                   | jsonb        | YES      | —                      | See shape below                                                                       |
| **Person-level (match-critical)**    |              |          |                        |                                                                                       |
| `owner_gender`                       | text         | YES      | —                      | Gender of sole proprietor / freelancer — queried directly by `match_subject_to_bandi` |
| `owner_birth_date`                   | date         | YES      | —                      | Birth date — queried directly by `match_subject_to_bandi`                             |
| `owner_employment_status`            | text         | YES      | —                      | Employment status                                                                     |
| **Contacts**                         |              |          |                        |                                                                                       |
| `contacts`                           | jsonb        | YES      | —                      | `{pec, email, phone, website}`                                                        |
| **Timestamps**                       |              |          |                        |                                                                                       |
| `created_at`                         | timestamptz  | NO       | `now()`                | Row creation timestamp                                                                |
| `updated_at`                         | timestamptz  | NO       | `now()`                | Auto-updated via trigger                                                              |

**Constraints:**

- UNIQUE on `vat_code` WHERE `vat_code IS NOT NULL`
- CHECK: `owner_profile_id IS NOT NULL OR agency_id IS NOT NULL` (must have an owner)

**Indexes:**

- PK on `id`
- `idx_subjects_owner` on `owner_profile_id`
- `idx_subjects_agency` on `agency_id`
- `idx_subjects_vat` on `vat_code`
- `idx_subjects_type` on `subject_type`
- `idx_subjects_ateco_division` on `ateco_division`

---

**`registered_address` shape:**

```json
{
  "street": "Via Roma 1",
  "town": "Milano",
  "zip_code": "20100",
  "province_code": "MI",
  "region_code": "03"
}
```

`province_code`/`region_code` reference `provinces`/`regions` in [geography-database-schema.md](geography-database-schema.md) — names are looked up there, never duplicated here.

**`financials` shape:**

```json
{
  "balance_sheet_date": "2024-12-31",
  "share_capital": 50000,
  "net_worth": 120000,
  "ebit": 35000,
  "ebitda": 42000,
  "cash_flow": 28000,
  "ebitda_margin_pct": 12.5,
  "roe_pct": 8.2,
  "ros_pct": 6.1,
  "roa_pct": 4.3,
  "turnover_trend_pct": 15.2,
  "turnover_range": {"code": "03", "description": "500K-1M"},
  "rae": {"code": "01", "description": "..."},
  "sae": {"code": "02", "description": "..."},
  "public_tenders": [...],
  "corporate_group": {...}
}
```

**`registry_flags` shape:**

```json
{
  "is_innovative_startup": false,
  "is_innovative_sme": false,
  "is_artisan": false,
  "artisan_registration_date": null,
  "is_social_enterprise": false,
  "is_professional_firm": false,
  "is_agricultural": false,
  "is_small_business": false,
  "is_registered_runts": false,
  "runts_section": null,
  "is_in_liquidation": false,
  "has_soa_certification": false,
  "belongs_to_corporate_group": false,
  "is_exporter": false,
  "is_importer": false,
  "number_of_branches": 0
}
```

**`professional_profile` shape (freelancer only):**

```json
{
  "profession_type": "architetto",
  "register_name": "Ordine degli Architetti",
  "register_number": "12345",
  "register_scope": "provinciale",
  "has_professional_insurance": true,
  "tax_regime": "forfettario",
  "social_security_type": "gestione_separata",
  "vat_opening_date": "2020-03-15"
}
```

**`planned_business` shape (aspiring entrepreneur only):**

```json
{
  "activity_description": "E-commerce platform for local artisans",
  "legal_form": "srl",
  "employee_count_range": "1-5",
  "initial_capital": 25000,
  "opening_timeframe": "6_months"
}
```

---

### `subject_shareholders`

Ownership / shareholder structure. Used for demographic matching (women-owned, youth-led enterprises).

| Column              | Type        | Nullable | Default             | Description                           |
| ------------------- | ----------- | -------- | ------------------- | ------------------------------------- |
| `id`                | uuid        | NO       | `gen_random_uuid()` | PK                                    |
| `subject_id`        | uuid        | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE |
| `source`            | data_source | NO       | `'manual'`          | Data provenance                       |
| `first_name`        | text        | YES      | —                   | First name                            |
| `last_name`         | text        | YES      | —                   | Last name                             |
| `tax_code`          | text        | YES      | —                   | Fiscal code                           |
| `company_name`      | text        | YES      | —                   | Company name (if legal entity)        |
| `is_legal_entity`   | boolean     | NO       | `false`             | Is a company (not a person)           |
| `share_pct`         | numeric     | YES      | —                   | Ownership percentage                  |
| `gender`            | text        | YES      | —                   | Gender (`M`, `F`)                     |
| `birth_date`        | date        | YES      | —                   | Date of birth                         |
| `role`              | text        | YES      | —                   | Role in company                       |
| `employment_status` | text        | YES      | —                   | Employment status                     |
| `is_active`         | boolean     | NO       | `true`              | Active shareholder                    |
| `created_at`        | timestamptz | NO       | `now()`             | Row creation timestamp                |
| `updated_at`        | timestamptz | NO       | `now()`             | Auto-updated via trigger              |

**Indexes:**

- `idx_shareholders_subject` on `subject_id`

---

### `subject_operational_sites`

Branch offices / operational sites. Used for geographic matching (operational seat in region X).

| Column          | Type        | Nullable | Default             | Description                           |
| --------------- | ----------- | -------- | ------------------- | ------------------------------------- |
| `id`            | uuid        | NO       | `gen_random_uuid()` | PK                                    |
| `subject_id`    | uuid        | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE |
| `source`        | data_source | NO       | `'manual'`          | Data provenance                       |
| `region_code`   | text        | YES      | —                   | FK → `regions(code)`                  |
| `province_code` | text        | YES      | —                   | FK → `provinces(code)`                |
| `town`          | text        | YES      | —                   | Town                                  |
| `zip_code`      | text        | YES      | —                   | ZIP code                              |
| `street`        | text        | YES      | —                   | Street address                        |
| `is_active`     | boolean     | NO       | `true`              | Active site                           |
| `created_at`    | timestamptz | NO       | `now()`             | Row creation timestamp                |
| `updated_at`    | timestamptz | NO       | `now()`             | Auto-updated via trigger              |

Names are derived from [geography-database-schema.md](geography-database-schema.md)'s `regions`/`provinces` tables, never duplicated here.

**Indexes:**

- `idx_operational_sites_subject` on `subject_id`
- `idx_operational_sites_region` on `region_code`

---

### `subject_managers`

Board of directors / admin body. Used for person-level matching (youth-led, women-led).

| Column                    | Type        | Nullable | Default             | Description                           |
| ------------------------- | ----------- | -------- | ------------------- | ------------------------------------- |
| `id`                      | uuid        | NO       | `gen_random_uuid()` | PK                                    |
| `subject_id`              | uuid        | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE |
| `source`                  | data_source | NO       | `'openapi_auto'`    | Data provenance                       |
| `first_name`              | text        | YES      | —                   | First name                            |
| `last_name`               | text        | YES      | —                   | Last name                             |
| `tax_code`                | text        | YES      | —                   | Fiscal code                           |
| `gender`                  | text        | YES      | —                   | Gender                                |
| `birth_date`              | date        | YES      | —                   | Date of birth                         |
| `role_code`               | text        | YES      | —                   | Role code                             |
| `role_description`        | text        | YES      | —                   | Role description                      |
| `is_legal_representative` | boolean     | YES      | —                   | Legal representative flag             |
| `is_active`               | boolean     | NO       | `true`              | Active flag                           |
| `created_at`              | timestamptz | NO       | `now()`             | Row creation timestamp                |
| `updated_at`              | timestamptz | NO       | `now()`             | Auto-updated via trigger              |

**Indexes:**

- `idx_managers_subject` on `subject_id`

---

### `subject_participations`

Corporate participations (companies the subject owns shares in). Used for EU enterprise size classification (autonomous/associated/linked).

| Column            | Type        | Nullable | Default             | Description                                             |
| ----------------- | ----------- | -------- | ------------------- | ------------------------------------------------------- |
| `id`              | uuid        | NO       | `gen_random_uuid()` | PK                                                      |
| `subject_id`      | uuid        | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE                   |
| `source`          | data_source | NO       | `'openapi_auto'`    | Data provenance                                         |
| `target_vat`      | text        | YES      | —                   | Target company VAT code                                 |
| `target_tax_code` | text        | YES      | —                   | Target company fiscal code                              |
| `target_name`     | text        | YES      | —                   | Target company name                                     |
| `share_pct`       | numeric     | YES      | —                   | Ownership percentage                                    |
| `relationship`    | text        | YES      | —                   | EU classification: `autonomous`, `associated`, `linked` |
| `is_active`       | boolean     | NO       | `true`              | Active participation                                    |
| `created_at`      | timestamptz | NO       | `now()`             | Row creation timestamp                                  |
| `updated_at`      | timestamptz | NO       | `now()`             | Auto-updated via trigger                                |

**Indexes:**

- `idx_participations_subject` on `subject_id`

---

### `subject_intents`

Declared future plans that affect conditional matching. A subject may declare intent to open a new site, hire employees, change ATECO, etc.

| Column        | Type          | Nullable | Default             | Description                                   |
| ------------- | ------------- | -------- | ------------------- | --------------------------------------------- |
| `id`          | uuid          | NO       | `gen_random_uuid()` | PK                                            |
| `subject_id`  | uuid          | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE         |
| `intent_type` | intent_type   | NO       | —                   | Type of intent                                |
| `status`      | intent_status | NO       | `'wish'`            | `planned` or `wish`                           |
| `target`      | jsonb         | NO       | `'{}'`              | Intent-specific parameters (see shapes below) |
| `notes`       | text          | YES      | —                   | Free text notes                               |
| `created_at`  | timestamptz   | NO       | `now()`             | Row creation timestamp                        |
| `updated_at`  | timestamptz   | NO       | `now()`             | Auto-updated via trigger                      |

**Indexes:**

- `idx_intents_subject` on `subject_id`
- `idx_intents_type` on `intent_type`

**`target` shapes by intent_type:**

```json
// open_operational_site, move_registered_office, open_new_registered_office
{"region_code": "03", "province_code": "MI", "town": "Milano"}

// hire_employees
{"workforce_count": 5, "timeframe_months": 12}

// change_ateco
{"ateco_code": "62.01", "ateco_description": "Computer programming"}

// change_legal_form
{"legal_form": "srl"}

// register_special_section
{"section": "startup_innovativa"}

// new_shareholder, increase_shares
{"gender": "F", "age_range": "18-35", "employment_status": "unemployed", "share_pct": 51}

// specific_investment
{"amount_eur": 100000, "category": "machinery_equipment", "expense_types": ["hardware", "software"]}

// open_vat
{"timeframe_months": 3}
```

---

### `subject_investment_projects`

Structured investment plans. Used for macro_area matching boost in the matching engine. Max 10 per subject.

| Column        | Type            | Nullable | Default             | Description                           |
| ------------- | --------------- | -------- | ------------------- | ------------------------------------- |
| `id`          | uuid            | NO       | `gen_random_uuid()` | PK                                    |
| `subject_id`  | uuid            | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE |
| `title`       | text            | NO       | —                   | Project title (1–120 chars)           |
| `description` | text            | YES      | —                   | Project description (max 1000 chars)  |
| `budget_min`  | numeric         | YES      | —                   | Minimum budget EUR (≥ 0)              |
| `budget_max`  | numeric         | YES      | —                   | Maximum budget EUR (≥ budget_min)     |
| `start_date`  | date            | YES      | —                   | Planned start date                    |
| `end_date`    | date            | YES      | —                   | Planned end date (≥ start_date)       |
| `area`        | investment_area | NO       | —                   | Investment category                   |
| `sort_order`  | smallint        | NO       | `0`                 | Display order                         |
| `created_at`  | timestamptz     | NO       | `now()`             | Row creation timestamp                |
| `updated_at`  | timestamptz     | NO       | `now()`             | Auto-updated via trigger              |

**Constraints:**

- CHECK: `budget_max >= budget_min` WHERE both are NOT NULL
- CHECK: `end_date >= start_date` WHERE both are NOT NULL
- Max 10 per subject (enforced by trigger)

**Indexes:**

- `idx_investment_projects_subject` on `subject_id`

---

### `subject_openapi_cache`

Cached raw OpenAPI response. One row per subject. Expires after 90 days.

| Column         | Type        | Nullable | Default             | Description                                    |
| -------------- | ----------- | -------- | ------------------- | ---------------------------------------------- |
| `id`           | uuid        | NO       | `gen_random_uuid()` | PK                                             |
| `subject_id`   | uuid        | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE (UNIQUE) |
| `api_tier`     | text        | NO       | —                   | API tier used (e.g. `it_advanced`)             |
| `vat_code`     | text        | NO       | —                   | Queried VAT code                               |
| `payload`      | jsonb       | NO       | —                   | Full API response                              |
| `payload_hash` | text        | YES      | —                   | Payload hash for dedup                         |
| `cost_eur`     | numeric     | YES      | —                   | Cost per fetch (EUR)                           |
| `fetched_at`   | timestamptz | NO       | `now()`             | Fetch timestamp                                |
| `expires_at`   | timestamptz | NO       | —                   | Expiry timestamp (fetched_at + 90d)            |

**Constraints:**

- UNIQUE on `subject_id`

---

## 3. Triggers

### `enforce_single_primary` — One primary subject per owner

Fires `BEFORE INSERT OR UPDATE ON subjects`. Ensures only one row has `is_primary = true` per `owner_profile_id`.

### `limit_investment_projects` — Max 10 projects per subject

Fires `BEFORE INSERT ON subject_investment_projects`. Rejects if count >= 10 for the subject.

### `update_updated_at` — Timestamp maintenance

Fires `BEFORE UPDATE` on all tables in this group. Sets `updated_at = now()`.

---

## 4. RLS Policies

### `subjects`

| Policy                          | Operation | Rule                                                                              |
| ------------------------------- | --------- | --------------------------------------------------------------------------------- |
| Owner sees own subjects         | SELECT    | `owner_profile_id = auth.uid()`                                                   |
| Agency sees own agency subjects | SELECT    | `agency_id = get_my_agency_id()`                                                  |
| Internal sees all               | SELECT    | `is_internal()`                                                                   |
| Owner manages own subjects      | ALL       | `owner_profile_id = auth.uid()`                                                   |
| Agency member manages           | ALL       | `agency_id = get_my_agency_id()` AND caller's `org_role IN ('owner', 'operator')` |
| Internal manages all            | ALL       | `is_internal()`                                                                   |

### Child tables (shareholders, operational_sites, managers, participations, intents, investment_projects)

All child tables inherit access through the parent `subjects` row:

| Policy        | Operation | Rule                                                                           |
| ------------- | --------- | ------------------------------------------------------------------------------ |
| Owner         | ALL       | `subject_id IN (SELECT id FROM subjects WHERE owner_profile_id = auth.uid())`  |
| Agency member | ALL       | `subject_id IN (SELECT id FROM subjects WHERE agency_id = get_my_agency_id())` |
| Internal      | ALL       | `is_internal()`                                                                |

### `subject_openapi_cache`

| Policy         | Operation | Rule            |
| -------------- | --------- | --------------- |
| Internal reads | SELECT    | `is_internal()` |

**Notes:**

- Customers and agency members can CRUD their own subjects and all child records.
- `subject_openapi_cache` is internal-only (contains raw API data, cost info).
- Agency viewers (`org_role = 'viewer'`) can SELECT but not modify.

---

## 5. Entity Relationship

```
profiles (owner_profile_id)
     │
     │ 1:N
     ▼
┌──────────────────────────────────────────────────────┐
│                    subjects                            │
│  id, subject_type, company_name, vat_code             │
│  owner_profile_id ──► profiles                        │
│  agency_id ──────────► agencies                       │
│  ateco_primary, registered_address, financials (jsonb)│
└──────────────────────┬───────────────────────────────┘
                       │
          ┌────────────┼────────────────────────┐
          │            │                        │
          ▼            ▼                        ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐
│shareholders │ │  op_sites    │ │     managers          │
│ name, gender│ │ region, town │ │ name, role, gender    │
│ share_pct   │ │ province     │ │ is_legal_rep          │
└─────────────┘ └──────────────┘ └──────────────────────┘
          │            │                        │
          ▼            ▼                        ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐
│participations│ │   intents    │ │ investment_projects   │
│ target, pct │ │ type, target │ │ title, area, budget   │
│ relationship│ │ status       │ │ start/end date        │
└─────────────┘ └──────────────┘ └──────────────────────┘

┌──────────────────────┐
│ subject_openapi_cache│
│ payload (jsonb)      │    1:1 with subjects
│ fetched_at, expires  │
└──────────────────────┘
```

**External references:**

- `subjects.ateco_division` / `ateco_section` / `ateco_version` → links to `ateco(code, version)` for display/search
- `subject_grant_matches` (matching schema, see [matching-database-schema.md](matching-database-schema.md)) → FK to `subjects(id)` + `grants(id)`
- `ateco_division_slugs.division_codes[]` → compared against `subjects.ateco_division` in matching

---

## 6. Migration from current schema

### Enum changes

| Current enum          | New enum          | Changes                                                                                                                                                                                            |
| --------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subject_type`        | `subject_type`    | Values translated: `azienda_iscritta_ri` → `registered_company`, `aspirante_imprenditore` → `aspiring_entrepreneur`, `libero_professionista` → `freelancer`, `ente_non_iscritto` → `non_ri_entity` |
| `subject_data_source` | `data_source`     | Rename enum. `openapi_partial_manual` → `openapi_partial`                                                                                                                                          |
| `match_status`        | `match_status`    | Values translated: `potenziale` → `potential`, `candidato` → `candidate`, `vinto` → `won`, `perso` → `lost`, `escluso` → `excluded`                                                                |
| `intent_type`         | `intent_type`     | All 14 values translated to English (e.g. `apertura_sede_operativa` → `open_operational_site`)                                                                                                     |
| `shareholder_source`  | —                 | DROP (reuses `data_source` instead)                                                                                                                                                                |
| —                     | `investment_area` | NEW: 16 English values for macro investment areas                                                                                                                                                  |

### `subjects` column changes

| Current columns (flat)                                                                                                                                                                                                                                                                                                                                                        | New representation           | Notes                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `organization_id`                                                                                                                                                                                                                                                                                                                                                             | `agency_id`                  | Rename FK (now → `agencies(id)`)                                                                        |
| `managed_by`                                                                                                                                                                                                                                                                                                                                                                  | —                            | DROP (agency-level management is via `agency_members`, not a per-subject column)                        |
| `is_mock`, `label`, `company_description`                                                                                                                                                                                                                                                                                                                                     | —                            | DROP (dev/debug columns not needed in redesign)                                                         |
| `legal_form_code`, `legal_form_description`, `legal_form_bando_enum`                                                                                                                                                                                                                                                                                                          | `legal_form` jsonb           | Collapse into `{code, description, bando_enum}`                                                         |
| `ateco_primary_code`, `ateco_primary_description`                                                                                                                                                                                                                                                                                                                             | `ateco_primary` jsonb        | Collapse into `{code, description}`                                                                     |
| `ateco_2022_primary_code`, `ateco_2022_primary_description`                                                                                                                                                                                                                                                                                                                   | —                            | DROP (old version codes — stored in `ateco` table with `version='2022'`, derivable via crosswalk)       |
| `ateco_secondary_codes[]`                                                                                                                                                                                                                                                                                                                                                     | `ateco_secondary` jsonb[]    | Restructure to `[{code, description}]`                                                                  |
| `ateco_2025_division_code`                                                                                                                                                                                                                                                                                                                                                    | `ateco_division`             | Rename                                                                                                  |
| `ateco_2025_sezione_code`                                                                                                                                                                                                                                                                                                                                                     | `ateco_section`              | Rename                                                                                                  |
| `ateco_2025_secondary_codes[]`, `ateco_2025_secondary_divisions[]`                                                                                                                                                                                                                                                                                                            | —                            | DROP (redundant with `ateco_secondary` + derivable division codes)                                      |
| —                                                                                                                                                                                                                                                                                                                                                                             | `ateco_version`              | NEW: single source of truth for which ATECO version all codes belong to                                 |
| `sede_legale_street`, `sede_legale_town`, `sede_legale_zip_code`, `sede_legale_province_code`, `sede_legale_province_name`, `sede_legale_region_code`, `sede_legale_region_name`                                                                                                                                                                                              | `registered_address` jsonb   | Collapse 7 columns into `{street, town, zip_code, province_code, region_code}` — names derived via JOIN |
| `enterprise_size_code`, `enterprise_size_description`, `enterprise_size_bando_enum`                                                                                                                                                                                                                                                                                           | `enterprise_size` jsonb      | Collapse into `{code, description, bando_enum}`                                                         |
| `balance_sheet_date`, `share_capital`, `net_worth`, `ebit`, `ebitda`, `cash_flow`, `ebitda_margin_pct`, `roe_pct`, `ros_pct`, `roa_pct`, `turnover_trend_pct`, `turnover_range_code`, `turnover_range_description`, `rae_code`, `rae_description`, `sae_code`, `sae_description`, `public_tenders`, `corporate_group`                                                         | `financials` jsonb           | Collapse ~19 flat columns into single jsonb                                                             |
| `is_innovative_startup`, `is_innovative_sme`, `is_artisan`, `artisan_registration_date`, `is_impresa_sociale`, `is_stp`, `ri_section_agricole`, `ri_section_piccoli_imprenditori`, `is_registered_runts`, `runts_section`, `is_in_liquidation`, `has_soa_certification`, `belongs_to_corporate_group`, `is_exporter`, `is_importer`, `number_of_branches`, `is_iscritto_albo` | `registry_flags` jsonb       | Collapse ~17 boolean/flag columns into single jsonb                                                     |
| `profession_type`, `professional_register` + `professional_profile` (already jsonb)                                                                                                                                                                                                                                                                                           | `professional_profile` jsonb | Merge the two flat columns into the existing jsonb structure                                            |
| `planned_activity_description`, `planned_employee_count_range`, `planned_initial_capital`, `planned_legal_form`, `planned_opening_timeframe` + `business_project_profile`, `intended_company_form`                                                                                                                                                                            | `planned_business` jsonb     | Collapse aspiring-entrepreneur flat columns into single jsonb                                           |
| `pec`, `email`, `phone`, `fax`, `website`                                                                                                                                                                                                                                                                                                                                     | `contacts` jsonb             | Collapse 5 contact columns into `{pec, email, phone, website}`; drop `fax`                              |
| `special_geographies`                                                                                                                                                                                                                                                                                                                                                         | —                            | DROP (unused in matching, never populated consistently)                                                 |
| `has_social`                                                                                                                                                                                                                                                                                                                                                                  | —                            | DROP (never used in matching, unclear semantics)                                                        |
| `is_interested_in_opening_new_headquarter_province`, `is_interested_in_opening_new_headquarter_region`                                                                                                                                                                                                                                                                        | —                            | DROP (modeled via `subject_intents` instead)                                                            |
| `owner_is_disoccupato`, `owner_has_degree`, `solution_targets_pa`                                                                                                                                                                                                                                                                                                             | —                            | DROP flat from subjects (moved into match-criteria context where relevant)                              |
| `employee_range_code`                                                                                                                                                                                                                                                                                                                                                         | —                            | DROP (derivable from `employee_count` + `enterprise_size`)                                              |

### `subject_shareholders` column changes

| Current column      | New column   | Notes                                        |
| ------------------- | ------------ | -------------------------------------------- |
| `name`              | `first_name` | Rename                                       |
| `surname`           | `last_name`  | Rename                                       |
| `percent_share`     | `share_pct`  | Rename                                       |
| `role_in_company`   | `role`       | Rename                                       |
| `source`            | `source`     | Retype: `shareholder_source` → `data_source` |
| `gender_confidence` | —            | DROP (internal scoring artifact)             |

### `subject_operational_sites` column changes

| Current column  | New column | Notes                                                              |
| --------------- | ---------- | ------------------------------------------------------------------ |
| `region_name`   | —          | DROP (derived via JOIN on `region_code`)                           |
| `province_name` | —          | DROP (derived via JOIN on `province_code`)                         |
| `source`        | `source`   | NEW (was missing in current schema, added for provenance tracking) |

### `subject_managers` column changes

| Current column      | New column   | Notes                              |
| ------------------- | ------------ | ---------------------------------- |
| `name`              | `first_name` | Rename                             |
| `surname`           | `last_name`  | Rename                             |
| `age`               | —            | DROP (derivable from `birth_date`) |
| `gender_confidence` | —            | DROP (internal scoring artifact)   |
| `source`            | `source`     | Retype: text → `data_source` enum  |

### `subject_participations` column changes

| Current column  | New column  | Notes                                                                             |
| --------------- | ----------- | --------------------------------------------------------------------------------- |
| `direction`     | —           | DROP (all rows are outbound participations — `direction` was always `'outbound'`) |
| `percent_share` | `share_pct` | Rename                                                                            |
| `source`        | `source`    | Retype: text → `data_source` enum                                                 |

### `subject_intents` column changes

| Current columns (flat `target_*`)                                                                                                                                                                                                                                                                                                                                                                                                                                | New representation | Notes                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| `target_amount_eur`, `target_ateco_code`, `target_ateco_description`, `target_expense_types[]`, `target_investment_category`, `target_legal_form`, `target_province_code`, `target_province_name`, `target_region_code`, `target_region_name`, `target_ri_section`, `target_shareholder_age_range`, `target_shareholder_gender`, `target_shareholder_share_pct`, `target_shareholder_status`, `target_timeframe_months`, `target_town`, `target_workforce_count` | `target` jsonb     | Collapse all ~18 `target_*` columns into a single jsonb with intent-specific shapes |

### `subject_investment_projects` column changes

| Current column      | New column   | Notes                                           |
| ------------------- | ------------ | ----------------------------------------------- |
| `macro_area` (text) | `area`       | Rename + retype (text → `investment_area` enum) |
| `budget_min_eur`    | `budget_min` | Rename (unit implied by domain)                 |
| `budget_max_eur`    | `budget_max` | Rename                                          |
| `timeframe_start`   | `start_date` | Rename                                          |
| `timeframe_end`     | `end_date`   | Rename                                          |

### `subject_openapi_raw` → `subject_openapi_cache` column changes

| Current column   | New column | Notes                                           |
| ---------------- | ---------- | ----------------------------------------------- |
| table name       | rename     | `subject_openapi_raw` → `subject_openapi_cache` |
| `openapi_tier`   | `api_tier` | Rename                                          |
| `fetch_cost_eur` | `cost_eur` | Rename                                          |
| `created_at`     | —          | DROP (redundant with `fetched_at`)              |
