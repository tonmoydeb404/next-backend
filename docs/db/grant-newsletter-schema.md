# BandiNet — Grant Newsletter Schema

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All table names, column names and values in English
> **Depends on:** [bandi-database-schema.md](bandi-database-schema.md) (`grants`), [auth-database-schema.md](auth-database-schema.md) (`profiles`)

Split out of `bandi-database-schema.md`: newsletter campaigns are their own domain (a grant doesn't need to know it was emailed), not a child concept of a grant.

---

## Table of Contents

1. [Enums](#1-enums)
2. [Tables](#2-tables)
   - [newsletter_sends](#newsletter_sends)
   - [newsletter_recipients](#newsletter_recipients)
3. [RLS Policies](#3-rls-policies)
4. [Entity Relationship](#4-entity-relationship)

---

## 1. Enums

### `newsletter_status`

| Value       | Description               |
| ----------- | ------------------------- |
| `draft`     | Not yet scheduled         |
| `scheduled` | Scheduled for future send |
| `sent`      | Successfully sent         |
| `failed`    | Send attempt failed       |

### `recipient_status`

| Value     | Description                    |
| --------- | ------------------------------ |
| `pending` | Queued, not yet dispatched     |
| `sent`    | Delivered to the mail provider |
| `failed`  | Delivery failed                |
| `bounced` | Delivered then bounced         |

---

## 2. Tables

### `newsletter_sends`

A newsletter campaign for one grant.

| Column          | Type              | Nullable | Default             | Description                         |
| --------------- | ----------------- | -------- | ------------------- | ----------------------------------- |
| `id`            | uuid              | NO       | `gen_random_uuid()` | PK                                  |
| `grant_id`      | uuid              | NO       | —                   | FK → `grants(id)` ON DELETE CASCADE |
| `sent_by`       | uuid              | YES      | —                   | FK → `profiles(id)`                 |
| `subject_line`  | text              | YES      | —                   | Email subject                       |
| `email_content` | text              | YES      | —                   | Email body                          |
| `scheduled_at`  | timestamptz       | YES      | —                   | Scheduled send time                 |
| `sent_at`       | timestamptz       | YES      | —                   | Actual send time                    |
| `status`        | newsletter_status | NO       | `'draft'`           | Send status                         |
| `created_at`    | timestamptz       | NO       | `now()`             | Row creation timestamp              |

**Removed vs. the original schema:**

- `recipients_count` → dropped. It's a pure aggregate of `newsletter_recipients` rows for this send (`COUNT(*) WHERE send_id = ...`); querying it directly can't drift out of sync the way a duplicated counter can.
- `recipients_filter` → dropped. In production this only ever held batching config (`{batched, batch_size, interval_days}`), never an actual targeting rule (there's no non-account recipient concept — see `newsletter_recipients` below). Kept as a `batch_size`/`interval_days` note if batching is reintroduced, but not modeled as a column until it's actually used for targeting.

---

### `newsletter_recipients`

One row per recipient per send — previously not tracked at all (only an aggregate `recipients_count`). Every recipient is a customer account; there is no non-account/email-only recipient concept in the product today.

| Column       | Type             | Nullable | Default             | Description                                   |
| ------------ | ---------------- | -------- | ------------------- | --------------------------------------------- |
| `id`         | uuid             | NO       | `gen_random_uuid()` | PK                                            |
| `send_id`    | uuid             | NO       | —                   | FK → `newsletter_sends(id)` ON DELETE CASCADE |
| `profile_id` | uuid             | NO       | —                   | FK → `profiles(id)` ON DELETE CASCADE         |
| `status`     | recipient_status | NO       | `'pending'`         | Delivery status for this recipient            |
| `sent_at`    | timestamptz      | YES      | —                   | Delivery timestamp                            |

**Constraints:** UNIQUE(`send_id`, `profile_id`)

**Indexes:**

- `idx_newsletter_recipients_send` on `send_id`
- `idx_newsletter_recipients_profile` on `profile_id`

---

## 3. RLS Policies

### `newsletter_sends`, `newsletter_recipients`

| Policy               | Operation | Rule            |
| -------------------- | --------- | --------------- |
| Internal manages all | ALL       | `is_internal()` |

**Notes:**

- Internal-only editorial tables — never exposed publicly or to tenants.
- A recipient never needs to read their own `newsletter_recipients` row (delivery status isn't shown to end-users), so no self-select policy is needed.

---

## 4. Entity Relationship

```
grants (grant_id)          profiles (sent_by / profile_id)
     │                             │
     ▼                             │
┌───────────────────┐              │
│  newsletter_sends  │              │
│  status, sent_at   │              │
└──────────┬─────────┘              │
           │                        │
           ▼                        │
┌────────────────────────┐          │
│ newsletter_recipients  │◄─────────┘
│ send_id, profile_id    │
│ status, sent_at        │
└────────────────────────┘
```

---

## 5. Migration from current schema

### Tables

| Current            | New                     | Notes                                       |
| ------------------ | ----------------------- | ------------------------------------------- |
| `newsletter_sends` | `newsletter_sends`      | Same name, column changes below             |
| —                  | `newsletter_recipients` | NEW table (per-recipient delivery tracking) |

### Enum changes

| Current | New                 | Notes                                   |
| ------- | ------------------- | --------------------------------------- |
| —       | `newsletter_status` | NEW: replaces free-text `status` column |
| —       | `recipient_status`  | NEW: per-recipient delivery state       |

### `newsletter_sends` column changes

| Current column      | New column | Notes                                                                         |
| ------------------- | ---------- | ----------------------------------------------------------------------------- |
| `bando_id`          | `grant_id` | Rename FK (now → `grants(id)`)                                                |
| `recipients_count`  | —          | DROP (derivable aggregate from `newsletter_recipients`)                       |
| `recipients_filter` | —          | DROP (only held batching config, never actual targeting — unused in practice) |
| `status` (text)     | `status`   | Retype: free text → `newsletter_status` enum                                  |
