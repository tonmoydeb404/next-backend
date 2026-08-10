# BandiNet — Architecture

## Monorepo Structure

```
bandinet/
├── apps/
│   ├── publicator/         # Next.js admin dashboard + the API (src/app/backend/api)
│   └── website/            # Next.js (Matchator + Studio)
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

| Aspect    | Detail                                         |
| --------- | ---------------------------------------------- |
| Framework | Next.js (App Router)                           |
| UI        | Radix UI + shadcn/ui + Tailwind                |
| State     | Redux Toolkit + RTK Query → its own API routes |
| Auth      | Supabase Auth (staff accounts, MFA mandatory)  |

Never talks to Supabase directly for data — all data flows through its own `src/app/backend/api/` Route Handlers. Supabase Auth is used directly only for login/MFA, same pattern as Website.

**Env validation:** `src/config/env.config.ts` — Zod schema + `validate()`, exported `envConfig`
object (`ENV`, `SUPABASE`, `DATABASE`, `LOGGING`). Client-safe (`NEXT_PUBLIC_*`) and server-only
(`DATABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`) vars are validated together but the
server-only ones are never referenced outside `src/lib/api/`/Route Handlers. Since the API lives in
this app, no `next.config.ts` rewrite is needed for `/backend/api/**` — it's a real route.
`envConfig.ENV` is derived from `NEXT_PUBLIC_APP_ENV` (`development`/`staging`/`production`), not
`NODE_ENV` — Next.js always forces `NODE_ENV=production` on `next build`/`next start`, so it can't
distinguish deploy stages. Committed template: `example.env`; local values: gitignored `.env.local`.

**Dark mode:** `next-themes` (`src/components/theme-provider.tsx` wraps `ThemeProvider`, mounted in
`layout.tsx`; `src/components/mode-toggle.tsx` toggles + a global "d" keyboard shortcut).

**Showcase dashboard (`src/app/page.tsx`):** example bento-grid page calling its own API via
`@repo/store` (`useHealthCheckQuery`, `useRegionsListQuery`, `useProvincesListQuery`) to render
health/region/province status tiles — demonstrates the RTK Query wiring, not production UI.

### Website (`apps/website/`)

Public-facing Next.js app serving two audiences via route groups:

```
app/
├── (public)/         # Landing, pricing, auth pages
├── (matchator)/      # Customer portal: matching, grants, onboarding
└── (studio)/         # Tenant portal: client management, bulk matching
```

| Aspect    | Detail                                     |
| --------- | ------------------------------------------ |
| Framework | Next.js (App Router)                       |
| UI        | Radix UI + shadcn/ui + Tailwind            |
| State     | Redux Toolkit + RTK Query → Publicator API |
| Auth      | Supabase Auth (customer accounts)          |

**Matchator** = regular customers who browse and match with grants.
**Studio** = tenants (consulting firms) managing multiple client subjects.

Both share auth and components. Data calls go through Publicator's API — Website has no database
access or repositories of its own; it's a pure API consumer.

**Env validation:** `src/config/env.config.ts` — same pattern as Publicator (Zod schema +
`envConfig`), consumed by `next.config.ts` for the `/backend/api/:path*` rewrite, whose destination
is Publicator's deployed URL (env var `NEXT_PUBLIC_PUBLICATOR_BASE_URL`) — the only app with this
rewrite, since Publicator serves the routes directly.

**Dark mode & showcase dashboard:** same `next-themes` setup and example bento-grid `page.tsx` as
Publicator (see above) — mirrored here as a shared reference implementation.

### Backend API (`apps/publicator/src/app/backend/`)

Next.js Route Handlers inside Publicator — the sole gateway for both frontend apps and external
integrations. Not a separate app or deployment; it's a real route tree in the same Next.js project
as the admin dashboard UI.

| Aspect    | Detail                                   |
| --------- | ---------------------------------------- |
| Framework | Next.js Route Handlers                   |
| ORM       | Drizzle                                  |
| Queue     | Supabase Queues (`pgmq`)                 |
| Auth      | Supabase JWKS (RS256) + AAL2 enforcement |
| API       | Versioned (`/backend/api/v1/`)           |

Responsibilities:

- JWT validation via Supabase JWKS endpoint (RS256 algorithm)
- AAL2 (2FA) enforcement on protected routes
- Authorization logic (roles, ownership, tenant seat membership)
- All CRUD operations via Drizzle
- Async job dispatch (email, AI extraction) via Supabase Queues, processed by `/backend/api/v1/jobs/*`
  endpoints triggered by Vercel Cron
- Webhook ingestion (BOH, Stripe)
- Extractor orchestration — BOH calls this API, which triggers the AI extraction pipeline

No Supabase Edge Functions unless strictly required.

**Current setup:**

- Path aliases: `@/*` → `./src/*` (shared with the rest of Publicator, via `tsconfig.json` `paths`)
- Structure: `src/app/backend/api/v1/<domain>/<resource>/route.ts` (and `[code]/route.ts` for
  detail routes) — one folder per resource, file location _is_ the URL path (`[code]` → `{code}`
  in the generated OpenAPI spec, no separate path registration). `src/lib/api/` holds all
  framework-agnostic building blocks: `create-handler.ts` (`createHandler()` composable wrapper —
  parses `params`/`query`/`body` via Zod, optionally enforces auth/AAL2, catches errors), `with-
auth.ts` (JWT/JWKS verification + AAL2 check), `error-handler.ts` (ZodError → 400, NotFoundError
  → 404, unknown → 500), `logger.ts` (Pino), `database.ts`/`supabase-admin.ts` (singleton
  clients), and `repositories/` (one line per table instantiating a repository class imported from
  `@repo/db`, e.g. `export const regionsRepository = new RegionsRepository(db)` — the classes
  themselves live in `packages/db/src/repositories/` so they're reusable by any future consumer,
  not just publicator). Business logic lives inline in the handler for simple domains, or in
  `src/lib/api/services/<domain>/` for complex ones (Grants, Matching) — never query Drizzle
  directly from a route file.
- Validation: Zod schemas from `@repo/validators` passed declaratively to `createHandler({ params,
query, body, ... })` — request validation happens at runtime (trust boundary); response shape is
  checked at compile time only, via `satisfies <ResponseType>` (no runtime response validation
  layer, relies on TypeScript).
- Env validation: `src/config/env.config.ts` — single Zod schema covering both `NEXT_PUBLIC_*`
  (client-safe) and server-only vars (`DATABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`,
  `LOG_LEVEL`), exposing a namespaced `envConfig` object (`ENV`, `SUPABASE`, `DATABASE`, `LOGGING`)
- DB access: `src/lib/api/database.ts` exports a module-level Drizzle client singleton (`db`),
  built from `@repo/db`'s `createDb()`; passed into repository constructors at instantiation
- API docs: `scripts/generate-openapi.ts` scans every `route.ts` under `src/app/backend/**`,
  dynamically imports it, and reads the `openapi` metadata (`summary`, `tags`, `responses`)
  attached to each exported `GET`/`POST`/etc. by `createHandler` (as `__openapiMeta`) — no manual
  path registration, the path is derived from the file location. Runs via `predev`/`prebuild`
  npm hooks, writing `public/openapi.json` (gitignored, regenerated each run). Served as a Scalar
  UI at `/backend/reference` (`@scalar/nextjs-api-reference`, reading the static generated file).
- Routes are versioned via the folder structure — `/backend/api/v1/...`; `GET /backend/api/health`
  is version-neutral (unversioned)
- `GET /backend/api/health` — runs `SELECT 1` via Drizzle, returns a Terminus-style health envelope
- CORS: not required for same-origin publicator calls; Website's cross-origin calls go through its
  own `next.config.ts` rewrite to Publicator's URL, so no CORS headers needed there either
- No `drizzle-zod`: shared validation schemas live in `packages/validators` as hand-written plain
  Zod, decoupled from `@repo/db`'s Drizzle tables, so they stay safe to import into frontend apps

---

## Packages

### `packages/db`

Drizzle ORM schema for typed queries — a hand-maintained TS mirror of the schema that actually
lives in `packages/supabase/migrations` (see below for why migrations aren't authored here).
Package name is `@repo/db` (repo convention, matching `@repo/eslint-config`/`@repo/typescript-config`).

- **Consumer:** `apps/publicator` only (never imported by `apps/website`)
- **Contains:** Drizzle table definitions (`postgres-js` driver), `drizzle.config.ts` (backs
  `db:studio` only — no `db:generate`/`migrate`/`push`), and `src/repositories/` — the
  `RepositoryBuilder` base class (`repositories/builder/`) plus one `{entity}.repository.ts` class
  per table, each taking a `Database` client via its constructor (framework-agnostic, no singleton
  instances here — those are created by the consuming app, e.g. `apps/publicator/src/lib/api/
repositories/index.ts`)
- **Reference:** `docs/db/` folder holds human-readable schema docs
- **Status:** Geography (`regions`, `provinces`) and Auth & Identity (`profiles`,
  `internal_roles`, `tenants`, `seats`) domains are mirrored as Drizzle tables, matching the
  schema created by `packages/supabase/migrations`. No Auth API route consumes these tables
  yet. The other 7 domains (ATECO, subjects, grants, newsletter, matching, VAT lookups, assets)
  are not yet mirrored.

### `packages/supabase`

Shared Supabase JS clients **and** the sole schema source of truth (migrations). Package name is
`@repo/supabase`.

- **Consumer:** All apps — `apps/publicator`/`apps/website` use the browser/server client factories
  (`@supabase/ssr`) for login/MFA/session cookies (each app still owns its own `middleware.ts`,
  just calling the server factory); `apps/publicator`'s API routes (`src/lib/api/supabase-admin.ts`)
  use the admin client (`@supabase/supabase-js`, secret key, server-only) for admin operations
  (e.g. `auth.admin.deleteUser`).
- **Contains:** `src/browser.ts` (`createSupabaseBrowserClient`), `src/server.ts`
  (`createSupabaseServerClient`, takes a caller-supplied cookie adapter), `src/admin.ts`
  (`createSupabaseAdminClient`, secret key — server-only, key never exposed to the browser),
  `src/types/database.types.ts` (generated `Database` type, all three clients are parameterized
  with it), and `migrations/` — raw SQL, the single source of truth for the entire schema (tables,
  indexes, FKs, triggers, functions, RLS, grants), written idempotently. Kept here rather than
  split into `packages/db`/`drizzle-kit` so Supabase branching (which only replays this folder)
  can build a complete database for every branch with no extra manual step.
- **Types:** `pnpm supabase:types` (repo root) runs `supabase gen types typescript --linked` and
  writes `src/types/database.types.ts` from the linked project's live schema — regenerate after
  every `supabase:push` so types stay in sync; committed to the repo, not generated at build time
- **Status:** client factories + Geography/Auth & Identity schema migrations exist — no login/MFA
  UI or Auth API routes/guards yet

### `packages/validators`

Zod schemas for runtime validation. Lightweight, frontend-safe. Package name is `@repo/validators`.

- **Consumer:** All apps (publicator, website) — currently linked from publicator only (both its
  API routes and its frontend); add as a dependency to website when a form or API call needs to
  share a schema
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
  `formatResponse`, `formatErrorResponse`, `serializePagination`, `errorResponseSchema`, etc.),
  framework-agnostic — the response _schema_ (envelope + data) is built once here and consumed
  directly by Publicator's Route Handlers via `satisfies <ResponseType>` (no DTO wrapper layer —
  that was a NestJS-only concept, no longer needed). Each folder has a barrel `index.ts`; the
  package root re-exports `db`, `api`, and `common` flat, so consumer imports
  (`import { regionSchema } from '@repo/validators'`) don't need to change when files move.
- **Status:** scaffolded with Geography (`regionSchema`, `provinceSchema` + params) as the
  reference domain, matching `packages/db`'s Geography schema. Auth & Identity validators
  (`profileSchema`, `updateProfileSchema`, `inviteSeatSchema`, `internalRoleSchema`) were removed
  (2026-08-06) — no Auth API routes exist yet to consume them; re-add following the same
  `db/` + `api/` split once that's built. Other domains added as needed.

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

### Profile/Tenant Provisioning

Creating/deleting `profiles`/`tenants`/`seats` in lockstep with `auth.users` is handled entirely at
the DB level, not in application code:

- **Creation:** a `SECURITY DEFINER` Postgres trigger (`handle_new_user`) on `auth.users` inserts a
  `profiles` row + a personal `tenants` row + an owner `seats` row on signup — works regardless of
  signup path (Supabase Auth API, magic link, OAuth, etc.).
- **Deletion:** plain `ON DELETE CASCADE` FKs (`profiles.id → auth.users.id`, `tenants`/`seats` →
  `profiles.id`) — deleting an `auth.users` row (e.g. via `supabase.auth.admin.deleteUser`) cascades
  automatically; the API layer never manually deletes these rows.
- This SQL lives in `packages/supabase/migrations/` (Supabase-CLI-managed), separate from
  `packages/db`'s drizzle-kit migrations, since it references `auth.users` — see
  [packages/supabase/README.md](../packages/supabase/README.md) for the required migration ordering.

### JWT Validation

Publicator's `withAuth()` wrapper (`src/lib/api/with-auth.ts`) validates Supabase-issued JWTs using the JWKS endpoint with RS256 (via the `jose` library). AAL2 (Authenticator Assurance Level 2) is enforced on protected endpoints via `createHandler({ auth: true, aal2: true })` — requests without a completed 2FA challenge are rejected.

### RLS (Row-Level Security)

Mandatory defense-in-depth layer. Since the Supabase connection URL is inherently exposed, RLS policies prevent unauthorized direct DB access even if the API layer is bypassed. Publicator's server-side Supabase admin client uses the service role for writes but RLS remains active as a safety net.

Key RLS patterns across domains:

- **Public read** — reference data (`regions`, `provinces`, `ateco`) and published grants readable by `anon`
- **Tenant-scoped** — every profile always owns at least one tenant (its own permanent personal tenant, auto-provisioned at signup) and may hold seats on additional org tenants; subjects/matches are visible via `is_tenant_member(tenant_id)`, not a direct `owner_profile_id` check
- **Internal full access** — staff (`is_internal()`) has unrestricted read/write across all tables
- **No client-side writes** on sensitive tables — `internal_roles`, `vat_lookups`, `openapi_fetch_log` writable only via `service_role` or SECURITY DEFINER RPCs

### Access Pattern

```
Frontend App → Publicator API (Route Handlers; JWT validated, AAL2 checked, authz enforced) → Supabase DB (RLS as safety net)
```

Both apps hit the same base URL (`/backend/api/v1`) — Publicator serves it directly, Website reaches it via a `next.config.ts` rewrite to Publicator's deployed URL.

### External Integrations

```
BOH (third-party) → Publicator webhook endpoint → Supabase Queue job → Extractor pipeline → grants + grant_versions + grant_assets
```

---

## Async Processing

**Supabase Queues (`pgmq`)** for all async workloads — Postgres-native, no Redis/persistent worker process required. Vercel functions are stateless, so there's no long-running BullMQ-style worker; instead a **Vercel Cron Job** hits a Publicator Route Handler under `/backend/api/v1/jobs/*` on a schedule, which reads a batch off the queue (`pgmq.read`), processes it, and archives/deletes the message (`pgmq.archive`) on success. Cron-triggered endpoints are secured via a shared `CRON_SECRET` header (Vercel's built-in cron auth convention), not a user JWT:

- Email dispatch (transactional + newsletter via `newsletter_sends`/`newsletter_recipients`)
- AI extraction (BOH → Publicator API → Supabase Queue → Extractor processes signed doc URL + pre-extracted JSON → writes grants)
- Match recalculation on grant changes (regenerate `grant_match_criteria`, recompute `subject_grant_matches`)
- Webhook processing

---

## Out of Scope (Future)

| Item                    | Notes                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Extractor**           | AI extraction module inside Publicator's API routes. BOH calls the API, the API dispatches via Supabase Queues. TBD.                                                                                                                                             |
| **Deployment / CI/CD**  | Publicator (UI + API) and Website deploy to Vercel as two projects. Publicator runs zero-config as a Next.js Vercel Function (Fluid compute), serving both the admin UI and the API; async work runs via Vercel Cron + Supabase Queues, not a persistent worker. |
| **Email provider**      | Provider-based service (Resend, SES, or similar). TBD.                                                                                                                                                                                                           |
| **File/Asset pipeline** | Upload, signed URLs, virus scanning. Asset schema exists (`assets` table), pipeline undefined.                                                                                                                                                                   |
