# BandiNet — Database Schema Overview

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All table names, column names, enum values in English (greenfield redesign)

---

## Schema Files

| #   | Domain              | File                                                             | Tables                                                                                                                                                                                   | Description                                                                                      |
| --- | ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Auth & Identity     | [auth-database-schema.md](auth-database-schema.md)               | `profiles`, `internal_roles`, `agencies`, `agency_members`                                                                                                                               | User accounts, staff roles/permissions, agency multi-tenancy                                     |
| 2   | ATECO Taxonomy      | [ateco-database-schema.md](ateco-database-schema.md)             | `ateco`, `ateco_crosswalk`, `ateco_division_slugs`                                                                                                                                       | Economic activity codes (multi-version), version migration mapping, subsector slugs for matching |
| 3   | Geography           | [geography-database-schema.md](geography-database-schema.md)     | `regions`, `provinces`                                                                                                                                                                   | Italian administrative regions/provinces reference data                                          |
| 4   | Subjects            | [subjects-database-schema.md](subjects-database-schema.md)       | `subjects`, `subject_shareholders`, `subject_operational_sites`, `subject_managers`, `subject_participations`, `subject_intents`, `subject_investment_projects`, `subject_openapi_cache` | Companies/freelancers/aspiring entrepreneurs and their relations                                 |
| 5   | Grants              | [bandi-database-schema.md](bandi-database-schema.md)             | `grants`, `grant_versions`, `grant_faq`, `grant_tags`, `grant_tag_assignments`, `grant_assignments`, `grant_notes`, `grant_suggestions`, `grant_assets`                                  | Grant lifecycle, editorial workflow, grant↔file junction                                         |
| 6   | Grant Newsletter    | [grant-newsletter-schema.md](grant-newsletter-schema.md)         | `newsletter_sends`, `newsletter_recipients`                                                                                                                                              | Newsletter campaigns and per-recipient delivery tracking                                         |
| 7   | Matching Engine     | [matching-database-schema.md](matching-database-schema.md)       | `grant_match_criteria`, `subject_grant_matches`                                                                                                                                          | Eligibility criteria projection, subject↔grant match results                                     |
| 8   | VAT Lookups & Audit | [vat-lookups-database-schema.md](vat-lookups-database-schema.md) | `vat_lookups`, `openapi_fetch_log`                                                                                                                                                       | VAT-first acquisition funnel, OpenAPI call audit/cost tracking                                   |
| 9   | Assets              | [assets-database-schema.md](assets-database-schema.md)           | `assets`                                                                                                                                                                                 | Universal file registry. Provider-agnostic storage metadata                                      |

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │  Auth & Identity  │
                    ┌──────────────────┐
                    │  Auth & Identity  │
                    │  (profiles,       │
                    │   agencies, etc.) │
                    └────────┬─────────┘
                             │
       ┌─────────────────────┼──────────────────────────────┐
       │              │      │                    │          │
       ▼              ▼      ▼                    ▼          ▼
┌───────────────┐ ┌────────────┐  ┌──────────────────┐ ┌─────────┐
│   Subjects    │ │   Grants   │  │  VAT Lookups     │ │ Assets  │
│               │ │            │  │  & Audit         │ │         │
└───────┬───────┘ └──────┬─────┘  └──────────────────┘ └────┬────┘
        │                 │                                   │
        │   ┌─────────────┼───────────────┐                  │
        │   │             │               │        ┌─────────┘
        │   ▼             ▼               ▼        ▼
        │ ┌───────────┐ ┌───────────┐ ┌──────────────────┐
        │ │ Matching  │ │ Newsletter│ │  AI Chat         │
        └─┤ Engine    │ │           │ │  (planned)       │
          └───────────┘ └───────────┘ └──────────────────┘

         ┌─────────────┐    ┌─────────────┐
         │   ATECO      │    │  Geography  │
         │  (reference) │    │ (reference) │
         └─────────────┘    └─────────────┘
```

Reference tables (`ateco`, `regions`, `provinces`) are read-only and referenced by multiple domains.

---

## Enums (all domains)

| Enum                         | Defined in  | Values                                                                       |
| ---------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `account_type`               | auth        | `internal`, `agency`, `customer`                                             |
| `org_role`                   | auth        | `owner`, `operator`, `viewer`                                                |
| `subject_type`               | subjects    | `registered_company`, `freelancer`, `aspiring_entrepreneur`, `non_ri_entity` |
| `data_source`                | subjects    | `openapi_auto`, `manual`, `openapi_partial`                                  |
| `intent_type`                | subjects    | 14 values (see file)                                                         |
| `intent_status`              | subjects    | `planned`, `wish`                                                            |
| `match_status`               | subjects    | `potential`, `candidate`, `won`, `lost`, `excluded`                          |
| `investment_area`            | subjects    | 16 values (see file)                                                         |
| `grant_status`               | grants      | `draft`, `scheduled`, `published`, `archived`                                |
| `creation_mode`              | grants      | `manual`, `scraper`, `ai_assisted`                                           |
| `faq_status`                 | grants      | `draft`, `published`, `archived`                                             |
| `note_visibility`            | grants      | `private`, `team`, `public`                                                  |
| `suggestion_status`          | grants      | `pending`, `resolved`                                                        |
| `newsletter_status`          | newsletter  | `draft`, `scheduled`, `sent`, `failed`                                       |
| `recipient_status`           | newsletter  | `pending`, `sent`, `failed`, `bounced`                                       |
| `local_presence_requirement` | matching    | 5 values (see file)                                                          |
| `applicant_person_category`  | matching    | 9 values (see file)                                                          |
| `applicant_category`         | matching    | 4 values (see file)                                                          |
| `vat_lookup_status`          | vat-lookups | `unclaimed`, `claimed`, `blocked`                                            |
| `openapi_fetch_status`       | vat-lookups | `success`, `not_found`, `ceased`, `error`, `rate_limited`, `cached_hit`      |
| `grant_asset_role`           | grants      | `source_document`, `attachment`, `cover_image`                               |
| `asset_visibility`           | assets      | `public`, `private`                                                          |
| `asset_category`             | assets      | `avatar`, `logo`, `grant_document`, `grant_image`                            |

---

## Table Count

| Domain              | Tables |
| ------------------- | ------ |
| Auth & Identity     | 4      |
| ATECO Taxonomy      | 3      |
| Geography           | 2      |
| Subjects            | 8      |
| Grants              | 9      |
| Grant Newsletter    | 2      |
| Matching Engine     | 2      |
| VAT Lookups & Audit | 2      |
| Assets              | 1      |
| **Total**           | **33** |

---

## Conventions

- **Flat columns** = indexed, filtered, used in WHERE/JOIN. **jsonb** = grouped data read together, rarely filtered individually.
- **Naming:** English snake_case. Table names are plural nouns. FK columns end with `_id`.
- **Timestamps:** `created_at` (always), `updated_at` (where mutable, auto-set via `update_updated_at` trigger).
- **UUIDs:** All PKs are `uuid DEFAULT gen_random_uuid()` unless the table is reference data with a natural key.
- **RLS:** Every table has RLS enabled. Policies documented per-file.
- **Enums:** Proper PostgreSQL enums (not text + CHECK) for any closed value set managed by the platform.
- **Geography:** Only codes stored; names derived via JOIN on `regions`/`provinces`.
- **No soft deletes:** Rows are hard-deleted. `is_active` flags on child records (shareholders, sites, managers) indicate current vs. historical — not deletion.

---

## Planned (not yet written)

- **AI Chat** — `chat_conversations`, `chat_messages`, `gemini_files` (grant-scoped AI Q&A)
