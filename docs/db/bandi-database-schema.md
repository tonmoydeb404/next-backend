# BandiNet — Grants Schema

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All table names, column names and values in English
> **Depends on:** [auth-database-schema.md](auth-database-schema.md) (`profiles`, `tenants`), [geography-database-schema.md](geography-database-schema.md) (`regions`, `provinces`), [assets-database-schema.md](assets-database-schema.md) (`assets`)
> **See also:** [grant-newsletter-schema.md](grant-newsletter-schema.md) (newsletter sends & recipients)

---

## Table of Contents

1. [Enums](#1-enums)
2. [Tables](#2-tables)
   - [grants](#grants)
   - [grant_versions](#grant_versions)
   - [grant_faq](#grant_faq)
   - [grant_tags](#grant_tags)
   - [grant_tag_assignments](#grant_tag_assignments)
   - [grant_date_type_labels](#grant_date_type_labels)
   - [grant_assignments](#grant_assignments)
   - [grant_notes](#grant_notes)
   - [grant_suggestions](#grant_suggestions)
   - [grant_assets](#grant_assets)
3. [RLS Policies](#3-rls-policies)
4. [Entity Relationship](#4-entity-relationship)

---

## 1. Enums

### `grant_status`

| Value       | Description                          |
| ----------- | ------------------------------------ |
| `draft`     | Work in progress, not yet scheduled  |
| `scheduled` | Scheduled for future publication     |
| `published` | Live on the public website           |
| `archived`  | No longer active, kept for reference |

### `creation_mode`

| Value         | Description                        |
| ------------- | ---------------------------------- |
| `manual`      | Created manually by staff          |
| `scraper`     | Ingested by the automated scraper  |
| `ai_assisted` | Created via AI-assisted extraction |

### `faq_status`

| Value       | Description                |
| ----------- | -------------------------- |
| `draft`     | Not yet visible            |
| `published` | Visible on website         |
| `archived`  | Hidden, kept for reference |

### `note_visibility`

| Value     | Description                   |
| --------- | ----------------------------- |
| `private` | Only visible to the author    |
| `team`    | Visible to all internal staff |
| `public`  | Visible to tenants too        |

### `suggestion_status`

| Value      | Description                                  |
| ---------- | -------------------------------------------- |
| `pending`  | Awaiting editorial review                    |
| `resolved` | Reviewed — converted to a grant or dismissed |

### `grant_asset_role`

| Value             | Description                                      |
| ----------------- | ------------------------------------------------ |
| `source_document` | The PDF the AI extraction was done from          |
| `attachment`      | Supplementary document (guidelines, forms, etc.) |
| `cover_image`     | Grant cover/thumbnail image for display          |

---

## 2. Tables

### `grants`

Core entity representing a grant / incentive.

| Column                     | Type          | Nullable | Default             | Description                                                                                              |
| -------------------------- | ------------- | -------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| `id`                       | uuid          | NO       | `gen_random_uuid()` | PK                                                                                                       |
| `tenant_id`                | uuid          | YES      | —                   | FK → `tenants(id)`. Set only for white-label grants published for one tenant; NULL = platform-wide grant |
| `title`                    | text          | NO       | —                   | Grant title                                                                                              |
| `slug`                     | text          | YES      | —                   | URL-friendly slug (UNIQUE)                                                                               |
| `status`                   | grant_status  | NO       | `'draft'`           | Workflow status — the single source of truth for publication state                                       |
| `creation_mode`            | creation_mode | NO       | `'manual'`          | How this grant was created                                                                               |
| **Display flags**          |               |          |                     |                                                                                                          |
| `is_pinned`                | boolean       | NO       | `false`             | Pinned to top of list                                                                                    |
| `is_recurring`             | boolean       | NO       | `false`             | Recurring grant flag                                                                                     |
| `is_featured_home`         | boolean       | NO       | `false`             | Featured on homepage                                                                                     |
| `requires_manual_download` | boolean       | NO       | `false`             | Documents need manual download (no direct link)                                                          |
| **Extraction data**        |               |          |                     |                                                                                                          |
| `general_info`             | jsonb         | YES      | —                   | Who can apply, key dates, SEO elements (structured extraction)                                           |
| `funding`                  | jsonb         | YES      | —                   | Funding amounts & per-contribution requirements                                                          |
| **Eligibility geography**  |               |          |                     |                                                                                                          |
| `regions`                  | text[]        | YES      | —                   | Eligible region codes, references `regions(code)`. NULL = all of Italy                                   |
| `provinces`                | text[]        | YES      | —                   | Eligible province codes, references `provinces(code)`                                                    |
| **Dates**                  |               |          |                     |                                                                                                          |
| `opens_at`                 | timestamptz   | YES      | —                   | Opening date                                                                                             |
| `deadline_at`              | timestamptz   | YES      | —                   | Deadline date                                                                                            |
| `dates_refreshed_at`       | timestamptz   | YES      | —                   | Last time opening/deadline dates were re-verified against the source                                     |
| **Links**                  |               |          |                     |                                                                                                          |
| `links`                    | jsonb         | YES      | —                   | `{source_url, published_url, typeform_url, image_url, video_url, external_link}`                         |
| **Recurring grouping**     |               |          |                     |                                                                                                          |
| `recurring_family_id`      | uuid          | YES      | —                   | Groups recurring grant editions together                                                                 |
| `recurring_position`       | integer       | YES      | —                   | Position within the recurring family                                                                     |
| **Audit trail**            |               |          |                     |                                                                                                          |
| `created_by`               | uuid          | YES      | —                   | FK → `profiles(id)`, creator                                                                             |
| `published_by`             | uuid          | YES      | —                   | FK → `profiles(id)`, publisher                                                                           |
| `published_at`             | timestamptz   | YES      | —                   | First-publish timestamp (kept even if later archived)                                                    |
| `created_at`               | timestamptz   | NO       | `now()`             | Row creation timestamp                                                                                   |
| `updated_at`               | timestamptz   | NO       | `now()`             | Auto-updated via trigger                                                                                 |

**Removed vs. the original schema (redundancy cleanup):**

- `is_published` boolean → dropped. It duplicated `status = 'published'`; a grant has exactly one workflow state, checking `status` is always correct, checking a separate boolean risks drifting out of sync.
- `is_newsletter_sent` / `newsletter_sent_at` → dropped from `grants` entirely, along with the newsletter FK relationship. Newsletter send state lives in [grant-newsletter-schema.md](grant-newsletter-schema.md); a grant doesn't need to know whether/when it was emailed.
- `date_updated` boolean → replaced with `dates_refreshed_at` timestamptz. A flag that only says "yes/no dates were refreshed" is less useful than knowing _when_ they were last refreshed (matters for the automated date-refresh job in [test-bandi-date-refresh.md](docs/test-bandi-date-refresh.md)).
- `source_url`, `published_url`, `typeform_url`, `image_url`, `video_url`, `link` (6 columns) → consolidated into `links` jsonb, following the same pattern as `subjects.contacts`. None of these are individually filtered/queried — they're read together whenever a grant is displayed.
- `data_a`/`data_b` → renamed to `general_info`/`funding` (named after what they actually hold, not the extraction schema label). `funding` (not `contributions`) avoids the `grants.contributions.contributions` redundancy — the inner `contributions[]` array keeps its extraction-schema name.
- `grant_contents` table → **removed**. It stored `general_info`/`contributions` as two separate rows via `UNIQUE(grant_id, type)`, which is an EAV-style workaround for what is really just 2 columns on 1 row. Collapsed into the `general_info`/`funding` jsonb columns above.
- `source_document_id` / `grant_documents` → **moved** to [assets-database-schema.md](assets-database-schema.md). Files are now tracked in a universal `assets` table with a `grant_assets` junction (role = `source_document`). No dedicated column needed on `grants` — the extraction workflow queries `grant_assets WHERE role = 'source_document'`.

**Indexes:**

- PK on `id`
- UNIQUE on `slug`
- `idx_grants_tenant` on `tenant_id`
- `idx_grants_status` on `status`
- `idx_grants_recurring_family` on `recurring_family_id`
- GIN index on `regions`
- GIN index on `provinces`

---

**`general_info` shape (extraction schema A):**

Structured extraction of who can apply, key dates, SEO elements, and procedural details. Produced by the AI extraction pipeline from the grant's source PDF.

```json
{
  "aid_form": {
    "value": ["contributo_fondo_perduto", "finanziamento_agevolato"],
    "citations": ["Art. 3 comma 1"]
  },
  "key_dates": [
    {
      "text": "Apertura sportello",
      "type": "apertura",
      "value": "2026-06-30",
      "citations": ["Art. 8"],
      "is_proroga": false
    }
  ],
  "local_area": {
    "geographic_scope": "regionale",
    "regions": ["Lombardia"],
    "provinces": ["MI", "BG"],
    "local_presence": {
      "citations": ["Art. 4 comma 2"],
      "requirement": "almeno_sede_operativa",
      "activation_timing": null,
      "maintenance_duration": null
    },
    "special_geographies": null
  },
  "seo_elements": {
    "image": {
      "alt": "...",
      "title": "...",
      "filename": "...",
      "seo_optimization": "..."
    },
    "metadata": {
      "url_slug": "lombardia-fondo-perduto-pmi-2026",
      "meta_title": "Bando Lombardia PMI 2026",
      "meta_description": "..."
    },
    "title_h1": "Bando Lombardia PMI 2026",
    "subtitle_h2": "Contributi a fondo perduto fino al 50%",
    "description_h4": "Il bando finanzia investimenti..."
  },
  "beneficiaries": {
    "notes": "Ammesse anche cooperative sociali",
    "citations": ["Art. 2"],
    "ateco_version": "2025",
    "subsectors": [
      {
        "type": "included",
        "value": "10.11.00",
        "brief_explanation": "Lavorazione e conservazione di carne (escluso pollame)"
      }
    ],
    "company_sizes": ["microimpresa", "piccola_impresa", "media_impresa"],
    "inside_registro_imprese": ["srl", "spa", "societa_cooperativa"],
    "outside_registro_imprese": ["libero_professionista"],
    "is_iscrizione_runts_required": false,
    "is_iscrizione_registro_imprese_required": true
  },
  "issuing_entity": {
    "name_full": "Regione Lombardia - Direzione Generale Sviluppo Economico",
    "name_simplified": "Regione Lombardia",
    "emails": [{ "value": "bandi@regione.lombardia.it", "is_pec": true }],
    "phone_numbers": ["+39 02 6765 1"],
    "platform": {
      "url": "https://www.bandi.regione.lombardia.it",
      "name": "Bandi Online"
    },
    "citations": ["Art. 1"]
  },
  "selection_procedure": {
    "simplified": "Procedura valutativa a sportello",
    "scoring": "Valutazione tecnico-economica con punteggio minimo 60/100",
    "is_chronological_order_important": false,
    "eligible_expenses": "### Ammesse\n- Macchinari e attrezzature\n- Brevetti e licenze\n..."
  },
  "aid_examples": [
    {
      "rate": { "value": 0.5, "explanation": "50% a fondo perduto" },
      "grant": {
        "value": 50000,
        "explanation": "Su investimento di 100.000 €"
      },
      "cost_items": [{ "amount": 80000, "description": "Macchinari" }],
      "approximation_disclaimer": "Esempio semplificato",
      "super_simplified_explanation": "Investi 100k, ricevi 50k a fondo perduto"
    }
  ],
  "participation_forms_allowed": ["single", "group"],
  "disbursement_reporting": {
    "payment_methods": [
      {
        "type": "anticipazione",
        "value": 0.4,
        "citation": "Art. 12",
        "value_type": "percentuale",
        "payment_description": "40% alla firma della convenzione"
      }
    ]
  }
}
```

**`funding` shape (extraction schema B):**

Funding amounts, per-contribution eligibility requirements, and the overall grant purpose/plafond. Each entry in `contributions[]` represents a distinct funding line (e.g. a main grant + a bonus for youth-led enterprises).

```json
{
  "contributions": [
    {
      "description": "Contributo principale a fondo perduto",
      "rate": [
        {
          "type": "base",
          "value": 0.5,
          "citation": "Art. 6 comma 1",
          "description": "Aliquota base"
        },
        {
          "type": "massimo",
          "value": 0.7,
          "citation": "Art. 6 comma 3",
          "description": "Con maggiorazione"
        }
      ],
      "values": [
        {
          "type": "contributo_massimo",
          "value": 150000,
          "citation": "Art. 7",
          "brief_notes": "Per singola impresa",
          "is_calculated": false
        },
        {
          "type": "costo_minimo_ammissibile",
          "value": 20000,
          "citation": "Art. 5",
          "brief_notes": "",
          "is_calculated": false
        }
      ],
      "aid_schemes": {
        "name": ["de_minimis"],
        "citations": ["Art. 3 comma 4"],
        "regola_applicazione": "Regime de minimis reg. UE 2023/2831"
      },
      "person_characteristics": {
        "required_categories": ["female", "youth_under_36"],
        "age_limits": [{ "type": "massimo", "value": 35 }],
        "role_in_company": "socio_maggioranza_quote",
        "citations": ["Art. 2 comma 3"],
        "ownership_share": [
          { "value": 51, "type": "minimo", "brief_notes": null }
        ]
      },
      "company_characteristics": {
        "incorporation_age_months": [
          { "type": "massimo", "value": 60, "period_type": "mesi" }
        ],
        "workforce_size": [{ "type": "massimo", "value": 9 }],
        "financial_conditions": [],
        "land_requirements": null,
        "registro_imprese_sections": ["speciale_startup_innovative"]
      },
      "new_business_scenario": {
        "eligible_applicant_types": [
          "pre_incorporation_individual",
          "newly_incorporated_business"
        ],
        "applicant_disqualifying_conditions": ["has_active_vat"],
        "required_company_form": ["srl", "srls"],
        "soci_esclusivamente_persone_fisiche": true,
        "requires_pa_oriented_solution": false,
        "requires_degree_or_undergraduate": false,
        "constitution_deadline_days": 60
      }
    }
  ],
  "note_eccezioni_approssimazioni": "Le aliquote sono indicative e soggette a...",
  "purpose_snapshot": "Sostegno agli investimenti produttivi delle PMI lombarde",
  "special_aid_objectives": ["innovation_research", "ict_digitalization"],
  "plafond": {
    "nome_misura": "Bando PMI Lombardia 2026",
    "dotazione_complessiva": 5000000,
    "max_progetti_finanziabili": null
  }
}
```

**Notes on extraction shapes:**

- Both shapes are produced by the AI extraction pipeline (prompts and output schemas in `bandinet-prompt-eng-estrazione-dati/`). The database stores them as opaque jsonb — Postgres does not validate their inner structure beyond being valid JSON.
- `person_characteristics` and `company_characteristics` are nullable per contribution — most contributions have no person/company-level restrictions beyond the grant-wide `beneficiaries` in `general_info`.
- `new_business_scenario` is nullable per contribution — only present for grants targeting new business creation (avvio impresa). Its fields are projected into `grant_match_criteria.applicant_kind_rules` by `scripts/populate-match-criteria.mjs`.
- `seo_elements` fields can be either a plain string or `{value, seo_optimization}` — consumers must handle both forms.
- `geographic_scope` inside `local_area` is optional — when absent, derived heuristically from `regions[]` length (`>= 20` → nazionale, `0` → nazionale, else regionale).
- `beneficiaries.subsectors[].value` stores the raw ATECO code (references `ateco.code`, any level — section, division, group, class or subclass) per client confirmation. Display labels are looked up from `ateco.title_it`/`ateco.title_en` at read time. The extraction schema's earlier `match` slug field has been dropped — it wasn't consumed by any matching/filtering logic (see [matching-database-schema.md](matching-database-schema.md#5-value-translation-notes)).
- `beneficiaries.ateco_version` records which ATECO version (e.g. `"2025"`) all `subsectors[].value` codes in this grant belong to — since `ateco`'s PK is composite `(code, version)`, a code alone isn't enough to resolve a title or walk `ateco.parent_code`. Mirrors the same single-source-of-truth pattern as `subjects.ateco_version`. All subsectors in a grant share one version, since they're extracted together at the same time.

**`links` shape:**

```json
{
  "source_url": "https://www.regione.lombardia.it/bandi/123",
  "published_url": "https://matchator.com/bando/lombardia-pmi-2026",
  "typeform_url": "https://form.typeform.com/to/abc123",
  "image_url": "https://cdn.matchator.com/covers/lombardia-pmi.jpg",
  "video_url": "https://youtube.com/watch?v=...",
  "external_link": "https://www.bandi.servizirl.it/procedimenti/new/..."
}
```

All fields are nullable strings. None are individually filtered/queried — they are read together when displaying a grant.

---

### `grant_versions`

Diff-based edit history for the whole grant. One row per save in the editor, capturing every field changed in that save (not just `general_info`/`funding`).

| Column       | Type        | Nullable | Default             | Description                                                                                     |
| ------------ | ----------- | -------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| `id`         | uuid        | NO       | `gen_random_uuid()` | PK                                                                                              |
| `grant_id`   | uuid        | NO       | —                   | FK → `grants(id)` ON DELETE CASCADE                                                             |
| `version`    | integer     | NO       | —                   | Incremental version number, scoped to `grant_id`                                                |
| `snapshot`   | jsonb       | YES      | —                   | Full snapshot of the grant's editable fields at save time                                       |
| `changes`    | jsonb       | YES      | —                   | `{fields: [...]}` — which top-level fields changed (e.g. `general_info`, `funding`, `opens_at`) |
| `created_by` | uuid        | YES      | —                   | FK → `profiles(id)`                                                                             |
| `created_at` | timestamptz | NO       | `now()`             | Row creation timestamp                                                                          |

**Constraints:** UNIQUE(`grant_id`, `version`)

---

### `grant_faq`

Frequently asked questions per grant.

| Column       | Type        | Nullable | Default             | Description                         |
| ------------ | ----------- | -------- | ------------------- | ----------------------------------- |
| `id`         | uuid        | NO       | `gen_random_uuid()` | PK                                  |
| `grant_id`   | uuid        | NO       | —                   | FK → `grants(id)` ON DELETE CASCADE |
| `question`   | text        | NO       | —                   | Question text                       |
| `answer`     | text        | NO       | —                   | Answer text                         |
| `sort_order` | integer     | NO       | `0`                 | Display order                       |
| `status`     | faq_status  | NO       | `'draft'`           | Visibility state                    |
| `created_by` | uuid        | YES      | —                   | FK → `profiles(id)`                 |
| `created_at` | timestamptz | NO       | `now()`             | Row creation timestamp              |
| `updated_at` | timestamptz | NO       | `now()`             | Auto-updated via trigger            |

---

### `grant_tags`

Tag definitions for categorizing grants.

| Column       | Type        | Nullable | Default             | Description            |
| ------------ | ----------- | -------- | ------------------- | ---------------------- |
| `id`         | uuid        | NO       | `gen_random_uuid()` | PK                     |
| `name`       | text        | NO       | —                   | Tag name (UNIQUE)      |
| `color`      | text        | YES      | —                   | Display color          |
| `created_at` | timestamptz | NO       | `now()`             | Row creation timestamp |

---

### `grant_tag_assignments`

Join table: grants ↔ tags (M:N).

| Column     | Type | Nullable | Default | Description                             |
| ---------- | ---- | -------- | ------- | --------------------------------------- |
| `grant_id` | uuid | NO       | —       | FK → `grants(id)` ON DELETE CASCADE     |
| `tag_id`   | uuid | NO       | —       | FK → `grant_tags(id)` ON DELETE CASCADE |

**PK:** (`grant_id`, `tag_id`)

---

### `grant_date_type_labels`

Global lookup of configurable date-type slugs shown in the "Categorie date" settings page. Not FK-referenced from `grants.general_info.key_dates[].type` (that field lives inside jsonb) — the link is enforced at the application level only.

| Column             | Type        | Nullable | Default             | Description                                          |
| ------------------ | ----------- | -------- | -------------------- | ----------------------------------------------------- |
| `id`                | uuid        | NO       | `gen_random_uuid()` | PK                                                     |
| `label`             | text        | NO       | —                    | Display label (e.g. "1° SAL")                          |
| `slug`              | text        | NO       | —                    | UNIQUE. Value stored in `key_dates[].type`             |
| `color_class`       | text        | YES      | —                    | Tailwind classes for badge styling                     |
| `sort_order`        | smallint    | NO       | `0`                  | Display order                                          |
| `is_system`         | boolean     | NO       | `false`              | System-defined types cannot be deleted                |
| `show_in_scadenze`  | boolean     | NO       | `true`               | Whether this type surfaces in the deadlines view       |
| `created_by`        | uuid        | YES      | —                    | FK → `profiles(id)`                                    |
| `created_at`        | timestamptz | NO       | `now()`              | Row creation timestamp                                 |

**Indexes:**

- PK on `id`
- UNIQUE on `slug`

---

### `grant_assignments`

Assign internal staff to grants for tracking responsibility.

| Column        | Type        | Nullable | Default             | Description                           |
| ------------- | ----------- | -------- | ------------------- | ------------------------------------- |
| `id`          | uuid        | NO       | `gen_random_uuid()` | PK                                    |
| `grant_id`    | uuid        | NO       | —                   | FK → `grants(id)` ON DELETE CASCADE   |
| `assigned_to` | uuid        | NO       | —                   | FK → `profiles(id)` ON DELETE CASCADE |
| `assigned_by` | uuid        | YES      | —                   | FK → `profiles(id)`                   |
| `assigned_at` | timestamptz | NO       | `now()`             | Assignment timestamp                  |
| `note`        | text        | YES      | —                   | Assignment note                       |

**Constraints:** UNIQUE(`grant_id`, `assigned_to`)

---

### `grant_notes`

Internal notes attached to grants.

| Column       | Type            | Nullable | Default             | Description                         |
| ------------ | --------------- | -------- | ------------------- | ----------------------------------- |
| `id`         | uuid            | NO       | `gen_random_uuid()` | PK                                  |
| `grant_id`   | uuid            | NO       | —                   | FK → `grants(id)` ON DELETE CASCADE |
| `content`    | text            | NO       | —                   | Note content                        |
| `visibility` | note_visibility | NO       | `'team'`            | Who can see this note               |
| `created_by` | uuid            | YES      | —                   | FK → `profiles(id)`                 |
| `created_at` | timestamptz     | NO       | `now()`             | Row creation timestamp              |
| `updated_at` | timestamptz     | NO       | `now()`             | Auto-updated via trigger            |

---

### `grant_suggestions`

User-submitted grant suggestions for the editorial team.

| Column              | Type              | Nullable | Default             | Description                           |
| ------------------- | ----------------- | -------- | ------------------- | ------------------------------------- |
| `id`                | uuid              | NO       | `gen_random_uuid()` | PK                                    |
| `title`             | text              | NO       | —                   | Suggested grant title                 |
| `link`              | text              | NO       | —                   | Source link                           |
| `status`            | suggestion_status | NO       | `'pending'`         | Review status                         |
| `suggested_by`      | uuid              | NO       | —                   | FK → `profiles(id)` ON DELETE CASCADE |
| `notes`             | text              | YES      | —                   | Additional notes                      |
| `created_at`        | timestamptz       | NO       | `now()`             | Row creation timestamp                |
| `resolved_at`       | timestamptz       | YES      | —                   | Resolution timestamp                  |
| `resolved_grant_id` | uuid              | YES      | —                   | FK → `grants(id)`, resulting grant    |

---

### `grant_assets`

Junction table linking grants to their files. Replaces the old `grant_documents` child table.

| Column       | Type             | Nullable | Default             | Description                         |
| ------------ | ---------------- | -------- | ------------------- | ----------------------------------- |
| `id`         | uuid             | NO       | `gen_random_uuid()` | PK                                  |
| `grant_id`   | uuid             | NO       | —                   | FK → `grants(id)` ON DELETE CASCADE |
| `asset_id`   | uuid             | NO       | —                   | FK → `assets(id)` ON DELETE CASCADE |
| `role`       | grant_asset_role | NO       | —                   | What this file is to this grant     |
| `sort_order` | smallint         | NO       | `0`                 | Display order within the same role  |

**Constraints:** UNIQUE(`grant_id`, `asset_id`)

**Indexes:**

- PK on `id`
- `idx_grant_assets_grant` on `grant_id`
- `idx_grant_assets_asset` on `asset_id`
- `idx_grant_assets_role` on (`grant_id`, `role`)

---

## 3. RLS Policies

### `grants`

| Policy                 | Operation | Rule                   |
| ---------------------- | --------- | ---------------------- |
| Public reads published | SELECT    | `status = 'published'` |
| Internal manages all   | ALL       | `is_internal()`        |

**Notes:**

- Tenants do not get a separate SELECT policy — they see published grants through the same public-read policy (consulting firms are read-only consumers, not owners of grant content).
- `tenant_id` exists only to scope a white-label grant to one tenant's branding; it does not grant that tenant write access.

### `grant_faq`, `grant_tags`, `grant_tag_assignments`, `grant_date_type_labels`

| Policy                                   | Operation | Rule                                                                                                                                           |
| ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Public reads content of published grants | SELECT    | `grant_id IN (SELECT id FROM grants WHERE status = 'published')` (or, for tags/assignments/date-type labels, unconditional read — harmless categorization data) |
| Internal manages all                     | ALL       | `is_internal()`                                                                                                                                |

### `grant_versions`, `grant_assignments`, `grant_notes`, `grant_suggestions`

| Policy               | Operation | Rule            |
| -------------------- | --------- | --------------- |
| Internal manages all | ALL       | `is_internal()` |

### `grant_assets`

| Policy                                  | Operation | Rule                                                             |
| --------------------------------------- | --------- | ---------------------------------------------------------------- |
| Public reads assets of published grants | SELECT    | `grant_id IN (SELECT id FROM grants WHERE status = 'published')` |
| Internal manages all                    | ALL       | `is_internal()`                                                  |

**Notes:**

- These are internal editorial-workflow tables (edit version history, staff assignments, internal notes) — never exposed publicly or to tenants.
- `grant_suggestions` additionally allows the suggesting profile to INSERT their own row and SELECT it back (`suggested_by = auth.uid()`), even if not internal — anyone with an account can suggest a grant.

---

## 4. Entity Relationship

```
tenants (tenant_id, optional)        profiles (created_by/published_by/etc.)
     │                                       │
     └───────────────┬───────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────┐
│                       grants                            │
│  id, title, slug, status, creation_mode                │
│  general_info, funding (jsonb), regions[], provinces[]       │
│  links (jsonb), recurring_family_id                    │
└──────────────────────┬───────────────────────────────┘
                       │
     ┌─────────────┬───┴────────┬─────────────┬──────────────┐
     ▼             ▼            ▼             ▼              ▼
┌──────────────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌────────────────┐
│ content_versions │ │    faq    │ │ tag_assign │ │  assignments    │
└──────────────────┘ └───────────┘ └────────────┘ └────────────────┘
                                          │
                                          ▼
                                    ┌───────────┐
                                    │grant_tags │
                                    └───────────┘
     ┌──────────────┐       ┌─────────────────┐
     ▼              ▼       ▼                 │
┌──────────┐ ┌──────────────┐ ┌──────────────┐│
│  notes   │ │ suggestions  │ │ grant_assets ││
└──────────┘ └──────────────┘ └──────┬───────┘│
                                     ▼        │
                               ┌──────────┐   │
                               │  assets  │   │
                               │ (→ assets│   │
                               │  schema) │   │
                               └──────────┘   │
```

> Newsletter sends & recipients live in a separate diagram — see [grant-newsletter-schema.md](grant-newsletter-schema.md).

---

## 5. Migration from current schema

### Table renames

| Current                 | New                     | Notes                                                  |
| ----------------------- | ----------------------- | ------------------------------------------------------ |
| `bandi`                 | `grants`                | English naming convention                              |
| `bando_contents`        | —                       | DROP (EAV anti-pattern absorbed into `grants` columns) |
| `bando_documents`       | `grant_documents`       | Rename                                                 |
| `bando_versions`        | `grant_versions`        | Rename + redesign (see below)                          |
| `bando_faq`             | `grant_faq`             | Rename                                                 |
| `bando_tags`            | `grant_tags`            | Rename                                                 |
| `bando_tag_assignments` | `grant_tag_assignments` | Rename                                                 |
| `date_type_labels`      | `grant_date_type_labels`| Rename. Still global (not per-grant), referenced only from `key_dates[].type` at the app level |
| `bando_assignments`     | `grant_assignments`     | Rename                                                 |
| `bando_notes`           | `grant_notes`           | Rename                                                 |
| `bando_suggestions`     | `grant_suggestions`     | Rename                                                 |

### Enum changes

| Current enum   | New enum            | Changes                                 |
| -------------- | ------------------- | --------------------------------------- |
| `bando_status` | `grant_status`      | Rename. Value `todo` → `draft`          |
| —              | `creation_mode`     | NEW: `manual`, `scraper`, `ai_assisted` |
| —              | `faq_status`        | NEW: `draft`, `published`, `archived`   |
| —              | `note_visibility`   | NEW: `private`, `team`, `public`        |
| —              | `suggestion_status` | NEW: `pending`, `resolved`              |

### `bandi` → `grants` column changes

| Current column                                                                  | New column                 | Notes                                                                                                    |
| ------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `organization_id`                                                               | `tenant_id`                | Rename FK (now → `tenants(id)`, 2nd generation was `agency_id`)                                          |
| `is_published`                                                                  | —                          | DROP (redundant with `status = 'published'`)                                                             |
| `is_newsletter_sent`                                                            | —                          | DROP (newsletter state lives in grant-newsletter-schema)                                                 |
| `newsletter_sent_at`                                                            | —                          | DROP (same)                                                                                              |
| `date_updated` (boolean)                                                        | `dates_refreshed_at`       | Retype: boolean → timestamptz (when, not just whether)                                                   |
| `date_apertura`                                                                 | `opens_at`                 | Rename + English                                                                                         |
| `date_scadenza`                                                                 | `deadline_at`              | Rename + English                                                                                         |
| `data_a`                                                                        | `general_info`             | Rename (descriptive name)                                                                                |
| `data_b`                                                                        | `funding`                  | Rename (avoids `grants.contributions.contributions` redundancy)                                          |
| `incentivi_gov_data`                                                            | —                          | DROP (one-time import artifact, not used in production logic)                                            |
| `source_url`, `published_url`, `typeform_url`, `image_url`, `video_url`, `link` | `links` jsonb              | Collapse 6 columns into `{source_url, published_url, typeform_url, image_url, video_url, external_link}` |
| `creation_mode` (text)                                                          | `creation_mode`            | Retype: free text → proper enum                                                                          |
| —                                                                               | `source_document_id`       | NEW: single FK → `grant_documents(id)` (replaces `bando_contents.document_id` per-type refs)             |
| `requires_manual_download`                                                      | `requires_manual_download` | Unchanged                                                                                                |

### `bando_contents` → DROPPED

The current schema uses `bando_contents` as an EAV table (`UNIQUE(bando_id, type)` with `type IN ('general_info', 'contributions')`) to store what is really just 2 columns on 1 row. Each row holds a `document_id` FK and a `response` jsonb.

In the new schema: `grants.general_info` and `grants.funding` are direct jsonb columns, with a single `source_document_id` FK (both fields are always extracted from the same source document).

### `bando_versions` → `grant_versions` redesign

| Current column   | New column   | Notes                                                           |
| ---------------- | ------------ | --------------------------------------------------------------- |
| `version_number` | `version`    | Rename                                                          |
| `data_a`         | —            | DROP (old snapshot captured only extraction data)               |
| `data_b`         | —            | DROP (same)                                                     |
| `changed_by`     | `created_by` | Rename                                                          |
| —                | `snapshot`   | NEW: full grant state at save time (not just extraction fields) |
| —                | `changes`    | NEW: `{fields: [...]}` — which top-level fields changed         |

### All child tables

Every `bando_id` FK column → `grant_id` (pointing to `grants(id)` instead of `bandi(id)`).
