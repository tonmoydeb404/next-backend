# BandiNet — Architecture

## Monorepo Structure

```
bandinet/
├── apps/
│   ├── publicator/         # Vite + React admin dashboard
│   ├── website/            # Next.js (Matchator + Studio)
│   └── backend/            # NestJS + Drizzle + Supabase Queues
├── packages/
│   ├── db/                 # Drizzle schema, migrations, seeds, RLS policies
│   ├── validators/         # Zod schemas (frontend-safe, zero backend deps)
│   └── shared/             # Pure TS types, enums, constants
├── db/                     # Database schema documentation (reference)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Tooling:** Turborepo + pnpm workspaces.

**System diagram:** [system-diagram.md](system-diagram.md)

---

## Apps

### Publicator (`apps/publicator/`)

Internal admin dashboard for managing grants, users, and content.

| Aspect    | Detail                                        |
| --------- | --------------------------------------------- |
| Framework | Next.js (App Router)                          |
| UI        | Radix UI + shadcn/ui + Tailwind               |
| State     | Redux Toolkit + RTK Query → Backend API       |
| Auth      | Supabase Auth (staff accounts, MFA mandatory) |

Never talks to Supabase directly for data — all data flows through the Backend API. Supabase Auth is used directly only for login/MFA, same pattern as Website.

### Website (`apps/website/`)

Public-facing Next.js app serving two audiences via route groups:

```
app/
├── (public)/         # Landing, pricing, auth pages
├── (matchator)/      # Customer portal: matching, grants, onboarding
└── (studio)/         # Tenant portal: client management, bulk matching
```

| Aspect    | Detail                                  |
| --------- | --------------------------------------- |
| Framework | Next.js (App Router)                    |
| UI        | Radix UI + shadcn/ui + Tailwind         |
| State     | Redux Toolkit + RTK Query → Backend API |
| Auth      | Supabase Auth (customer accounts)       |

**Matchator** = regular customers who browse and match with grants.
**Studio** = tenants (consulting firms) managing multiple client subjects.

Both share auth, components, and the same backend API. Differentiated by roles and middleware-gated routes.

### Backend (`apps/backend/`)

Central API server — the sole gateway for all frontend apps and external integrations.

| Aspect    | Detail                                   |
| --------- | ---------------------------------------- |
| Framework | NestJS                                   |
| ORM       | Drizzle                                  |
| Queue     | Supabase Queues (`pgmq`)                 |
| Auth      | Supabase JWKS (RS256) + AAL2 enforcement |
| API       | Versioned (`/api/v1/`)                   |

Responsibilities:

- JWT validation via Supabase JWKS endpoint (RS256 algorithm)
- AAL2 (2FA) enforcement on protected routes
- Authorization logic (roles, ownership, tenant seat membership)
- All CRUD operations via Drizzle
- Async job dispatch (email, AI extraction) via Supabase Queues
- Rate limiting and anti-abuse (NestJS throttler, in-memory store — no cache layer for now)
- Webhook ingestion (BOH, Stripe)
- Extractor orchestration — BOH calls Backend, Backend triggers the AI extraction pipeline

No Supabase Edge Functions unless strictly required.

---

## Packages

### `packages/db`

Drizzle ORM schema, migrations, and seed scripts. Single source of truth for the database structure.

- **Consumer:** Backend only (never imported by frontend apps)
- **Contains:** Drizzle table definitions, migration files, seed scripts, RLS policy definitions
- **Reference:** `db/` folder at repo root holds human-readable schema docs

### `packages/validators`

Zod schemas for runtime validation. Lightweight, frontend-safe.

- **Consumer:** All apps (backend, publicator, website)
- **Constraint:** Zero backend dependencies — no Drizzle, no Node-only packages
- **Contains:** Zod schemas for API request/response payloads, form validation

### `packages/shared`

Pure TypeScript types, enums, and constants.

- **Consumer:** All apps and packages
- **Constraint:** No runtime dependencies — types and constants only
- **Contains:** Enums (`subject_type`, `grant_status`, `seat_role`, etc.), TS interfaces, shared constants

---

## Auth & Security

### Authentication

- **Provider:** Supabase Auth (email/password + TOTP MFA)
- **Staff accounts** (Publicator): MFA mandatory, roles managed via `internal_roles` permissions array
- **Customer accounts** (Website): self-registration, email verification required before VAT claim
- **Tenant seat holders** (Website/Studio): regular customer accounts assigned to a vacant seat on a tenant, `seat_role`-based access — there is no separate `agency` account type
- **Single identity:** one email = one account across all apps
- **Suspension:** via Supabase Auth `banned_until` — no `is_active` column, blocks sign-in at auth layer

### JWT Validation

Backend validates Supabase-issued JWTs using the JWKS endpoint with RS256. AAL2 (Authenticator Assurance Level 2) is enforced on protected endpoints — requests without a completed 2FA challenge are rejected.

### RLS (Row-Level Security)

Mandatory defense-in-depth layer. Since the Supabase connection URL is inherently exposed, RLS policies prevent unauthorized direct DB access even if the backend is bypassed. Backend uses the service role for writes but RLS remains active as a safety net.

Key RLS patterns across domains:

- **Public read** — reference data (`regions`, `provinces`, `ateco`) and published grants readable by `anon`
- **Tenant-scoped** — every profile always owns at least one tenant (its own permanent personal tenant, auto-provisioned at signup) and may hold seats on additional org tenants; subjects/matches are visible via `is_tenant_member(tenant_id)`, not a direct `owner_profile_id` check
- **Internal full access** — staff (`is_internal()`) has unrestricted read/write across all tables
- **No client-side writes** on sensitive tables — `internal_roles`, `vat_lookups`, `openapi_fetch_log` writable only via `service_role` or SECURITY DEFINER RPCs

### Access Pattern

```
Frontend App → Backend API (JWT validated, AAL2 checked, authz enforced) → Supabase DB (RLS as safety net)
```

### External Integrations

```
BOH (third-party) → Backend webhook endpoint → Supabase Queue job → Extractor pipeline → grants + grant_versions + grant_assets
```

---

## Async Processing

**Supabase Queues (`pgmq`)** for all async workloads — Postgres-native, no Redis/persistent worker process required. Vercel functions are stateless, so there's no long-running BullMQ-style worker; instead a **Vercel Cron Job** hits a Backend endpoint on a schedule, which reads a batch off the queue (`pgmq.read`), processes it, and archives/deletes the message (`pgmq.archive`) on success:

- Email dispatch (transactional + newsletter via `newsletter_sends`/`newsletter_recipients`)
- AI extraction (BOH → Backend → Supabase Queue → Extractor processes signed doc URL + pre-extracted JSON → writes grants)
- Match recalculation on grant changes (regenerate `grant_match_criteria`, recompute `subject_grant_matches`)
- Webhook processing

---

## Out of Scope (Future)

| Item                    | Notes                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Extractor**           | AI extraction module inside Backend. BOH calls Backend, Backend dispatches via Supabase Queues. TBD.                                                                                                               |
| **Deployment / CI/CD**  | Entire project (Publicator, Website, Backend) deploys to Vercel. Backend runs zero-config as a NestJS Vercel Function (Fluid compute); async work runs via Vercel Cron + Supabase Queues, not a persistent worker. |
| **Email provider**      | Provider-based service (Resend, SES, or similar). TBD.                                                                                                                                                             |
| **File/Asset pipeline** | Upload, signed URLs, virus scanning. Asset schema exists (`assets` table), pipeline undefined.                                                                                                                     |
