# AGENTS.md

Instructions for AI coding agents working in the **BandiNet** monorepo.

## Project overview

BandiNet is a Turborepo + pnpm monorepo with two apps and four shared packages:

```
apps/
  publicator/   Next.js (App Router) — internal admin dashboard + the API (backend/api Route Handlers)
  website/      Next.js (App Router) — public site (Matchator + Studio)
packages/
  db/                 Drizzle ORM schema for typed queries (@repo/db, publicator-only consumer)
  validators/         Zod schemas, zero backend deps (@repo/validators, shared by all apps)
  store/              Redux Toolkit + RTK Query base API (@repo/store, frontend apps only)
  supabase/           Supabase JS client factories (@repo/supabase, shared by all apps)
  eslint-config/      Shared eslint configs (@repo/eslint-config)
  typescript-config/  Shared tsconfig bases (@repo/typescript-config)
docs/                 Architecture + per-domain DB schema docs (source of truth, read before big changes)
```

Full architecture reference: [docs/architecture.md](docs/architecture.md), [docs/system-diagram.md](docs/system-diagram.md), DB domain docs in [docs/db/](docs/db/).

## Tech stack

- **Backend API** (`apps/publicator/src/app/backend/`): Next.js Route Handlers, Drizzle ORM (`postgres-js` driver via `@repo/db`), Zod for request validation + `satisfies` for compile-time response typing, Supabase (Postgres + Auth + Queues/`pgmq`), `zod-openapi` + Scalar UI (`/backend/reference`) for API docs, Pino for logging.
- **Publicator & Website**: Next.js 16 (App Router), React 19, Redux Toolkit + RTK Query (via `@repo/store`), Tailwind v4, shadcn/ui, Zod v4.
- **Package manager**: pnpm (`packageManager: pnpm@9.0.0`), workspaces defined in `pnpm-workspace.yaml` (`apps/*`, `packages/*`).
- **Build orchestration**: Turborepo (`turbo.json`) — `build`, `lint`, `check-types`, `dev` pipelines.

## Key architectural rules (do not violate)

- **Publicator's Route Handlers (`apps/publicator/src/app/backend/api/`) are the sole gateway to the database.** `apps/website` never calls Supabase directly for data — only `@repo/store` → Publicator's API (via a `next.config.ts` rewrite to publicator's deployed URL). Supabase Auth is used directly by both frontends only for login/MFA.
- **`packages/db` (Drizzle) is imported by `apps/publicator` only.** Never import it from `apps/website`.
- **`packages/validators` has zero backend/Node-only dependencies.** It must stay safe to import into any app. No `drizzle-zod`, no framework-only helpers there.
- **API calls go through Next.js rewrites or direct same-origin routes, not cross-origin fetch:** publicator serves `/backend/api/v1/*` directly (no rewrite needed — it's a real route in that app); website's `next.config.ts` rewrites `/backend/api/:path*` → publicator's deployed URL (env var `NEXT_PUBLIC_PUBLICATOR_BASE_URL`). RTK Query's `Api` in `@repo/store` uses the same-origin `/backend/api/v1` base URL in both apps.
- **Env access is always through a validated `envConfig`**, never raw `process.env` scattered in code — see `src/config/env.config.ts` in each app (publicator's includes server-only vars like `DATABASE_URL`/`SUPABASE_SECRET_KEY`/`SUPABASE_JWKS_URL` alongside the `NEXT_PUBLIC_*` ones).
- **No new domain/module should be scaffolded ahead of an actual need.** Only Geography exists end-to-end (db → validators → publicator Route Handlers) as the reference implementation; the other 8 DB domains (see [docs/db/](docs/db/)) are documented but not yet implemented — follow the Geography pattern when adding a new one, don't pre-stub others.
- **Async work uses Supabase Queues (`pgmq`)**, triggered by Vercel Cron hitting a publicator Route Handler under `/backend/api/v1/jobs/*` — no Redis/BullMQ/persistent worker process (publicator deploys as a stateless Vercel Function). Cron-triggered job endpoints are secured via a shared `CRON_SECRET`, not `withAuth`'s JWT check.
- **`profiles`/`tenants`/`seats` are created/deleted in sync with `auth.users` at the DB level**, not in application code — a Postgres trigger (`packages/supabase/migrations/`) provisions them on signup, and `ON DELETE CASCADE` FKs clean them up on user deletion. Never add API logic to insert/delete these rows on signup/account-removal.
- **Publicator-facing API routes require AAL2 (2FA).** Any Route Handler under `src/app/backend/api/` that exists to serve staff/internal use must enforce Supabase AAL2 (TOTP-completed session) via `createHandler({ auth: true, aal2: true, ... })`, not just a valid JWT — staff accounts are MFA-mandatory. Website/customer-facing routes don't require AAL2 unless the specific action demands it.
- **Avoid `any`.** Do not use `any` or `as any`/unchecked type casts to silence TypeScript — narrow with proper types, generics, or zod-inferred types instead. If a cast is truly unavoidable (e.g. a third-party type gap), prefer a precise cast (`as SpecificType`) with a one-line comment explaining why, never `as any`.

## File naming

- All file names use kebab-case (e.g. `region-details.dto.ts`, `use-app-selector.ts`), across every app and package — no camelCase or PascalCase file names.

## Conventions to follow when adding code

- **`packages/validators`**: `src/db/<domain>/<entity>.ts` mirrors a DB table 1:1. `src/api/<domain>/<resource>/<resource>-details.ts` / `-list.ts` / `-common.ts` hold response/param/query schemas (fixed filenames — don't invent new ones like `*-code-param.ts`). Response envelopes built once here via `buildResponseSchema`/`buildPaginatedResponseSchema` from `src/common/response.ts`. Cross-folder imports inside this package use Node subpath imports (`#*`), not `@/*` aliases.
- **`apps/publicator/src/app/backend/`**: see [Backend API route rules](#backend-api-route-rules-appspublicatorsrcappbackend) below.
- **`apps/publicator` / `apps/website`**: `src/store/` has `store.ts`, `hooks.ts`, `wrapper.tsx`, `features/<name>/` (local UI-only slices). API endpoints live in `packages/store/src/endpoints/<domain>/` via `Api.injectEndpoints`, typed from `@repo/validators`.
- **`apps/publicator` / `apps/website`**: each app has a `src/config/paths.config.ts` exporting a single `paths` object with every route in the app — nested per section, leaf values are either a literal string or a function returning a string for dynamic segments, e.g.:
  ```ts
  export const paths = {
    root: "/",
    page: "/page",
    nestedPage: {
      root: "/nested-page",
      details: (slug: string) => `/nested-page/${slug}`,
    },
  };
  ```
  Never hardcode a naked path string (`"/some/route"`, template-literal route) in a component, `Link`, `redirect()`, or router call — always import from `paths` instead.
- Env template files are `example.env` (not `.env.example`) across the repo; local values go in gitignored `.env.local`.

## Frontend page/view structure (`apps/publicator`, `apps/website`)

Every route follows an `app/` + `view/` split — `app/` stays a thin routing shell, all real UI lives in `view/`:

```
src/
  app/
    <route>/
      page.tsx          # thin: renders the matching view's index, no business logic
  view/
    <route>/
      index.tsx          # composes the sections/components for this view
      sections/          # route-specific page sections
      components/        # route-specific components used only by this view
```

- `app/<route>/page.tsx` should stay minimal — import and render `view/<route>`'s `index.tsx`, not implement UI inline.
- Shared, cross-route components still live in `src/components/` (e.g. `components/ui/`), not under `view/`.
- **Every component (in `view/**`or`src/components/`) must stay under 150 lines.** Split into `sections/`/sub-components when it grows past that.

## Backend API route rules (`apps/publicator/src/app/backend/`)

- Route file location under `src/app/backend/api/v1/<domain>/<resource>/route.ts` _is_ the URL path (`[code]` → `{code}`) — no separate path registration.
- Define/reuse request+response schemas in `packages/validators` before writing the route file. Never inline a Zod schema in a route file.
- Add a `<entity>.repository.ts` in `packages/db/src/repositories/` for any table without one (framework-agnostic class extending `RepositoryBuilder`, constructor takes `db`); wire its singleton in `apps/publicator/src/lib/api/repositories.ts`. Route handlers never touch Drizzle directly.
- Every exported method (`GET`/`POST`/etc.) must be built via `createHandler({...})` from `src/lib/api/create-handler.ts` — never a raw `export async function GET(req) {...}`.
- Never call `.parse()` manually in a route file — pass `params`/`query`/`body` schemas to `createHandler` instead.
- `auth: true` requires a valid Supabase JWT; add `aal2: true` for staff/publicator-only routes. Use `permissions`/`permissionsLogic` (staff routes, checked against `internal_roles.permissions`) and `tenantRoles`/`tenantRolesLogic` (tenant-scoped routes, checked against the seat for the `x-tenant-id` header) for authorization — never a hand-rolled check inside the handler body. `permissions` must be typed `Permission[]` from `@repo/validators` (never raw strings) — add new `[resource]:[action]` entries to `rolePermissions` in `packages/validators/src/db/auth/permissions.ts` only as each domain is actually built, not ahead of time.
- `openapi: { summary, tags, responses }` is mandatory on every route — read by `scripts/generate-openapi.ts` to build `public/openapi.json`.
- Return responses via `formatResponse(...) satisfies <ResponseType>` + `NextResponse.json(...)`. No runtime response validation — `satisfies` is compile-time only.
- Throw `NotFoundError`/let `ZodError` propagate for errors — never construct an error `NextResponse` by hand; `createHandler` formats both consistently.
- Business logic stays inline in the handler for simple domains (Geography-style CRUD); extract to `src/lib/api/services/<domain>/<name>.service.ts` for complex ones (Grants, Matching).
- Regenerate the OpenAPI spec after adding/changing a route: `pnpm --filter publicator generate:openapi` (also runs via `predev`/`prebuild`).
- After changing `rolePermissions`, re-sync the `super_admin` internal role: `pnpm --filter publicator sync:roles` (idempotent — creates the role if missing, otherwise updates its permissions array; not run automatically on startup, deliberate to avoid permission drift).
- Async/queue endpoints (`/backend/api/v1/jobs/*`, triggered by Vercel Cron) skip `auth`/`aal2` and check a shared `CRON_SECRET` header instead — there's no user JWT on a cron-triggered request.

## Common commands

Run from repo root unless noted:

```sh
pnpm install                        # install all workspace deps
pnpm dev                            # turbo run dev (all apps)
pnpm dev:publicator                 # dev publicator only (serves the API too)
pnpm dev:website                    # dev website only
pnpm build                          # turbo run build (all)
pnpm lint                           # turbo run lint (all)
pnpm check-types                    # turbo run check-types (all)
pnpm format                         # prettier --write across ts/tsx/md
```

Package-specific:

```sh
# packages/db
pnpm --filter @repo/db db:studio    # drizzle-kit studio (browse via the src/schema/*.ts types)

# packages/supabase
pnpm supabase:new <name>            # supabase migration new <name> (schema source of truth)
pnpm supabase:push                  # apply pending migrations to the linked project
pnpm supabase:pull                  # check for drift against the linked project
pnpm supabase:types                 # regenerate src/types/database.types.ts

# apps/publicator
pnpm --filter publicator generate:openapi   # regenerate public/openapi.json (also runs automatically via predev/prebuild)
```

## Validation before finishing a task

- Prefer running the narrowest relevant command first (`pnpm --filter <pkg> check-types`, `pnpm --filter <pkg> lint`), then the root `pnpm check-types`/`pnpm lint` if the change spans packages.
- Schema changes are authored as SQL migrations in `packages/supabase/migrations/` (the sole schema source of truth, tables through RLS/grants) — `packages/db`'s TS schema is kept in sync by hand to match, for typed publicator queries only.
- **Every `packages/supabase/migrations/*.sql` file must be idempotent (safely re-runnable)** — never a plain one-shot `CREATE`/`ALTER`. Use: `CREATE TABLE IF NOT EXISTS` with just the PK, then one `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` per column (so re-running after a later column addition still applies it, not just the initial create); a guarded `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` block for `CREATE TYPE` and `ALTER TABLE ADD CONSTRAINT` (neither supports `IF NOT EXISTS`); `CREATE INDEX IF NOT EXISTS`; `CREATE OR REPLACE FUNCTION`; `DROP TRIGGER IF EXISTS`/`DROP POLICY IF EXISTS` before `CREATE TRIGGER`/`CREATE POLICY` (neither supports `IF NOT EXISTS` or `OR REPLACE`).
- After editing `packages/validators`, check whether `apps/publicator/src/app/backend/api/**/route.ts` handlers or their `openapi` metadata need matching updates.

## Documentation policy

- `docs/architecture.md` is the living architecture spec — treat it as authoritative over this file for anything not covered here, and update it when architecture-level decisions change (new domain implemented, new package, pattern change).
- `docs/db/*.md` documents all 9 planned DB domains; keep in sync when `packages/db` schema changes.
