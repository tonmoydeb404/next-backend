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

**Env validation:** `src/config/env.config.ts` — Zod schema + `validate()`, exported `envConfig`
object (`ENV`, `BACKEND.BASE_URL`), mirroring the Backend's pattern. `next.config.ts` reads
`envConfig.BACKEND.BASE_URL` (from `NEXT_PUBLIC_BACKEND_BASE_URL` env var) for the
`/backend/api/**` rewrite destination — no raw `process.env` access elsewhere in the app.
`envConfig.ENV` is derived from `NEXT_PUBLIC_APP_ENV` (`development`/`staging`/`production`), not
`NODE_ENV` — Next.js always forces `NODE_ENV=production` on `next build`/`next start`, so it can't
distinguish deploy stages. Committed template: `example.env`; local values: gitignored `.env.local`.

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

**Env validation:** `src/config/env.config.ts` — same pattern as Publicator (Zod schema +
`envConfig`), consumed by `next.config.ts` for the `BACKEND_BASE_URL` rewrite destination.

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

**Current setup:**

- Path aliases: `@/*` → `./src/*` (via `tsconfig.json` `paths`), rewritten to relative paths in
  `dist/` at build time by `tsc-alias` (`nest build && tsc-alias -p tsconfig.build.json`)
- Structure: `src/modules/{domain}/` per feature (e.g. `modules/app`, `modules/health`), each with
  `controllers/`, `services/`, and `dto/` folders. Once a module covers more than one resource, its
  `dto/` folder splits into one subfolder per resource (e.g. `modules/geography/dto/{region,
province}/`, mirroring `@repo/validators`'s `api/<domain>/<resource>/` layout), each with its own
  barrel `index.ts` re-exported from the module-level `dto/index.ts`; `src/database/` holds the
  Drizzle client wiring and a `repositories/` folder (one `{entity}.repository.ts` per table,
  injected into services — no service should inject the Drizzle client directly)
- Validation/serialization: `nestjs-zod` (`ZodValidationPipe` + `ZodSerializerInterceptor`,
  registered globally in `AppModule`)
- Env validation: `@nestjs/config` with a Zod schema (`src/config/env.validation.ts`) as the
  single source of truth, exposed to the rest of the app via namespaced config factories
  (`src/config/{app,database,cors}.config.ts`, registered via `registerAs`)
- DB access: `DatabaseModule` (global), injects a Drizzle client (`DRIZZLE` token, via the
  `InjectDatabase()` helper decorator) built from `@repo/db`
- API docs: `@nestjs/swagger` document cleaned up via `nestjs-zod`'s `cleanupOpenApiDoc`, served
  as a Scalar UI at `/reference` (`@scalar/nestjs-api-reference`)
- Routes are versioned via NestJS URI versioning (`app.enableVersioning`), global prefix `/api`,
  default version `1` — e.g. `/api/v1/...`; `GET /health` is `VERSION_NEUTRAL` (unversioned)
- `GET /health` — `@nestjs/terminus` health check with a custom Drizzle DB-ping indicator
- CORS allow-list driven by the `CORS_ORIGINS` env var
- No `drizzle-zod`: shared validation schemas live in `packages/validators` as hand-written plain
  Zod, decoupled from `@repo/db`'s Drizzle tables, so they stay safe to import into frontend apps

---

## Packages

### `packages/db`

Drizzle ORM schema, migrations, and seed scripts. Single source of truth for the database structure.
Package name is `@repo/db` (repo convention, matching `@repo/eslint-config`/`@repo/typescript-config`).

- **Consumer:** Backend only (never imported by frontend apps)
- **Contains:** Drizzle table definitions (`postgres-js` driver), `drizzle.config.ts`, migrations
- **Reference:** `docs/db/` folder holds human-readable schema docs
- **Status:** scaffolded with the Geography domain (`regions`, `provinces`) as the reference
  implementation. The Auth & Identity domain (`profiles`, `internal_roles`, `tenants`, `seats`)
  was removed (2026-08-07) — no backend Auth module exists yet to consume it; re-add once that
  module is built. The other 7 domains (ATECO, subjects, grants, newsletter, matching, VAT
  lookups, assets) are not yet translated to Drizzle tables.

### `packages/validators`

Zod schemas for runtime validation. Lightweight, frontend-safe. Package name is `@repo/validators`.

- **Consumer:** All apps (backend, publicator, website) — currently linked from the backend only;
  add as a dependency to publicator/website when a form or API call needs to share a schema
- **Constraint:** Zero backend dependencies — no Drizzle, no Node-only packages
- **Structure:** `src/db/<domain>/<entity>.ts` — schemas mirroring `packages/db` tables 1:1 (e.g.
  `db/auth/profile.ts`, `db/geography/region.ts`); `src/api/<domain>/<resource>/<file>.ts` —
  request/response schemas per endpoint, grouped by resource, often built by `.omit()`/`.extend()`
  off the matching `db` schema, using the fixed filenames `<resource>-details.ts` (single-item
  response, wraps the `db` schema in `buildResponseSchema` — e.g. `regionDetailsResponseSchema`),
  `<resource>-list.ts` (collection response, wraps `<entity>Schema.array()` in
  `buildResponseSchema` — e.g. `regionListResponseSchema`), and `<resource>-common.ts` (params/
  query schemas shared by that resource's endpoints — e.g. `region-common.ts` holds
  `regionCodeParamSchema`, `province-common.ts` holds `provinceCodeParamSchema` +
  `listProvincesQuerySchema`; no separate `*-code-param.ts`/`*-query.ts` files); other operations
  (e.g. `profile-update.ts`) get their own descriptively-named file. `src/common/response.ts` —
  the shared response envelope (`buildResponseSchema`, `buildPaginatedResponseSchema`,
  `formatResponse`, `formatErrorResponse`, `serializePagination`, etc.), framework-agnostic (no
  `createZodDto`/`nestjs-zod`) — the response _schema_ (envelope + data) is built once in
  validators' `api/<domain>/<resource>/<resource>-details.ts`/`-list.ts`; backend `dto/*.ts` files
  only import that pre-built schema and wrap it with `createZodDto` where a NestJS DTO class is
  needed (no `buildResponseSchema` calls in backend). Each folder has a barrel `index.ts`; the
  package root re-exports `db`, `api`, and `common` flat, so consumer imports
  (`import { regionSchema } from '@repo/validators'`) don't need to change when files move.
  Backend `modules/<domain>/dto/<resource>/` mirrors the same `<resource>-details.dto.ts`,
  `<resource>-list.dto.ts`, `<resource>-common.dto.ts` filenames.
- **Status:** scaffolded with Geography (`regionSchema`, `provinceSchema` + params) as the
  reference domain, matching `packages/db`'s Geography schema. Auth & Identity validators
  (`profileSchema`, `updateProfileSchema`, `inviteSeatSchema`, `internalRoleSchema`) were removed
  (2026-08-06) — no backend Auth module/API exists yet to consume them; re-add following the same
  `db/` + `api/` split once that module is built. Other domains added as needed.

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
