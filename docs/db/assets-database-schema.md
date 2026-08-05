# BandiNet — Assets Schema

> **Engine:** PostgreSQL (Supabase)
> **RLS:** Enabled on every table
> **Language:** All table names, column names and values in English
> **Depends on:** [auth-database-schema.md](auth-database-schema.md) (`profiles`, `tenants`, `is_internal()`, `is_tenant_member()`)
> **Referenced by:** [bandi-database-schema.md](bandi-database-schema.md) (`grant_assets` junction)

---

## Table of Contents

1. [Enums](#1-enums)
2. [Tables](#2-tables)
   - [assets](#assets)
3. [RLS Policies](#3-rls-policies)
4. [Entity Relationship](#4-entity-relationship)
5. [Usage Patterns](#5-usage-patterns)
6. [Migration from current schema](#6-migration-from-current-schema)

---

## 1. Enums

### `asset_visibility`

| Value     | Description                                                      |
| --------- | ---------------------------------------------------------------- |
| `public`  | Publicly accessible (logos, cover images, published grant docs)  |
| `private` | Requires authorization — app layer controls access (signed URLs) |

### `asset_category`

| Value            | Folder prefix      | Description                         |
| ---------------- | ------------------ | ----------------------------------- |
| `avatar`         | `avatars/`         | User profile pictures               |
| `logo`           | `logos/`           | Tenant logos (square and wide)      |
| `grant_document` | `grant-documents/` | PDFs, source docs, attachments      |
| `grant_image`    | `grant-images/`    | Cover images, thumbnails for grants |

---

## 2. Tables

### `assets`

Universal file metadata registry. Storage-provider-agnostic — `path` is a relative key, the application layer builds the final accessible URL based on `visibility` and the current provider config.

| Column        | Type             | Nullable | Default             | Description                                                              |
| ------------- | ---------------- | -------- | ------------------- | ------------------------------------------------------------------------ |
| `id`          | uuid             | NO       | `gen_random_uuid()` | PK                                                                       |
| `category`    | asset_category   | NO       | —                   | File category — determines path prefix and UI grouping                   |
| `filename`    | text             | NO       | —                   | Original upload filename                                                 |
| `path`        | text             | NO       | —                   | Storage key, prefixed by category (e.g. `avatars/{uid}/pic.jpg`). UNIQUE |
| `file_hash`   | text             | YES      | —                   | Content hash (SHA-256) for dedup                                         |
| `file_size`   | integer          | YES      | —                   | Size in bytes                                                            |
| `mime_type`   | text             | NO       | —                   | MIME type (e.g. `application/pdf`, `image/png`)                          |
| `metadata`    | jsonb            | YES      | —                   | Per-mime-type structure (see shapes below)                               |
| `visibility`  | asset_visibility | NO       | `'private'`         | Access intent — app layer maps to provider-specific mechanism            |
| `uploaded_by` | uuid             | YES      | —                   | FK → `profiles(id)` ON DELETE SET NULL                                   |
| `created_at`  | timestamptz      | NO       | `now()`             | Row creation timestamp                                                   |

**Constraints:** UNIQUE(`path`)

**Indexes:**

- PK on `id`
- UNIQUE on `path`
- `idx_assets_category` on `category` (UI/API grouping)
- `idx_assets_hash` on `file_hash` (dedup lookups)
- `idx_assets_uploaded_by` on `uploaded_by`

**Notes:**

- Immutable — no `updated_at`. New version = new asset row, repoint the junction/FK.
- `path` is provider-agnostic: just a key. Supabase treats it as a storage path, Cloudinary as a public ID, S3 as an object key. The app builds the full URL.
- `visibility = 'private'` means the app must generate a time-limited signed URL (or equivalent) to serve the file. The DB never stores a publicly-accessible URL for private files.
- `uploaded_by` is SET NULL on delete — the file outlives the uploader.

**`metadata` shapes by mime_type:**

```json
// image/*
{"width": 1200, "height": 630, "format": "png"}

// application/pdf
{"page_count": 42, "has_text_layer": true}
```

---

## 3. RLS Policies

### `assets`

| Policy                | Operation | Rule                                                                                                                                      |
| --------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Public assets         | SELECT    | `visibility = 'public'`                                                                                                                   |
| Internal sees all     | SELECT    | `is_internal()`                                                                                                                           |
| Own uploads           | SELECT    | `uploaded_by = auth.uid()`                                                                                                                |
| Own avatar            | SELECT    | `id = (SELECT avatar_id FROM profiles WHERE id = auth.uid())`                                                                             |
| Own tenant logos      | SELECT    | `id IN (SELECT logo_square_id FROM tenants WHERE is_tenant_member(id) UNION SELECT logo_wide_id FROM tenants WHERE is_tenant_member(id))` |
| Internal manages all  | ALL       | `is_internal()`                                                                                                                           |
| Authenticated uploads | INSERT    | `auth.role() = 'authenticated'`                                                                                                           |

**Notes:**

- The app layer adds a second barrier: even if RLS allows row visibility, private files require a signed URL to actually download.
- Anyone authenticated can INSERT into `assets` (upload a file), but only internal staff can link it to a grant via `grant_assets` (see grants schema).

---

## 4. Entity Relationship

```
profiles (uploaded_by)           profiles (avatar_id)
     │                                │
     ▼                                │ 1:1 FK
┌──────────────────────────────────────┴───────┐
│                   assets                      │
│  id, category, filename, path, mime_type      │
│  visibility, metadata (jsonb)                 │
└───────┬──────────────────────────────────────┘
        │
        │ 1:1 FK
        ▼
┌──────────────┐
│   tenants     │
│ logo_square_id│
│ logo_wide_id  │
└──────────────┘

(grant_assets junction lives in bandi-database-schema.md)
```

---

## 5. Usage Patterns

**Uploading a file:**

```ts
// 1. Upload to storage provider (app layer)
const path = `grants/${grantId}/${filename}`;
await storage.upload(path, file);

// 2. Create asset row
const { data: asset } = await supabase
  .from("assets")
  .insert({
    filename: file.name,
    path,
    file_size: file.size,
    mime_type: file.type,
    visibility: "private",
  })
  .select()
  .single();

// 3. Link to grant
await supabase.from("grant_assets").insert({
  grant_id: grantId,
  asset_id: asset.id,
  role: "source_document",
});
```

**Reading the source document for a grant:**

```sql
SELECT a.* FROM grant_assets ga
JOIN assets a ON a.id = ga.asset_id
WHERE ga.grant_id = $1 AND ga.role = 'source_document'
```

**Building a download URL (app layer):**

```ts
function getAssetUrl(asset: Asset): string {
  if (asset.visibility === "public") {
    return `${STORAGE_BASE_URL}/${asset.path}`;
  }
  // Private: generate time-limited signed URL
  return storage.createSignedUrl(asset.path, { expiresIn: 3600 });
}
```

---

## 6. Migration from current schema

### Tables

| Current           | New                       | Notes                                                             |
| ----------------- | ------------------------- | ----------------------------------------------------------------- |
| `bando_documents` | `assets` + `grant_assets` | Split: file metadata → `assets`, grant linkage → `grant_assets`   |
| —                 | `assets`                  | NEW universal file registry                                       |
| —                 | `grant_assets`            | NEW junction (replaces direct `bando_id` FK on `bando_documents`) |

### `bando_documents` → `assets` + `grant_assets` mapping

| Current column | New location            | Notes                                           |
| -------------- | ----------------------- | ----------------------------------------------- |
| `id`           | `assets.id`             | Preserve UUIDs during migration                 |
| `bando_id`     | `grant_assets.grant_id` | Moved to junction                               |
| `filename`     | `assets.filename`       | Same                                            |
| `file_url`     | `assets.path`           | Strip base URL, keep only the relative path/key |
| `file_hash`    | `assets.file_hash`      | Same                                            |
| `file_size`    | `assets.file_size`      | Same                                            |
| `mime_type`    | `assets.mime_type`      | Same                                            |
| `doc_type`     | `grant_assets.role`     | Retype: free text → `grant_asset_role` enum     |
| `uploaded_by`  | `assets.uploaded_by`    | Same                                            |
| `created_at`   | `assets.created_at`     | Same                                            |

### Impact on other schemas

- **bandi-database-schema.md**: Drop `grant_documents` table and `source_document_id` FK from `grants`. Add note that grant files are managed via `grant_assets` in this schema.
- **auth-database-schema.md**: Add `avatar_id` FK on `profiles`, `logo_square_id`/`logo_wide_id` FKs on `tenants`.
- **ai-chat (planned)**: `gemini_files.grant_document_id` → `gemini_files.asset_id` FK to `assets(id)`.

### Enum mapping for `doc_type` → `grant_asset_role`

Current `bando_documents.doc_type` is free text. Known values in production:

- `null` / general docs → `attachment`
- Used as extraction source → `source_document`
- Cover images (stored in `bando-images` bucket) → `cover_image`
