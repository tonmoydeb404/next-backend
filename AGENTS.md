# AGENTS.md

Instructions for AI coding agents working in the **BandiNet** monorepo.

## Project overview

BandiNet is a Turborepo + pnpm monorepo with three apps and four shared packages:

```
apps/
  backend/      NestJS API — central gateway for all data access
  publicator/   Next.js (App Router) — internal admin dashboard
  website/      Next.js (App Router) — public site (Matchator + Studio)
packages/
  db/                 Drizzle ORM schema + migrations (@repo/db, backend-only consumer)
  validators/         Zod schemas, zero backend deps (@repo/validators, shared by all apps)
  store/              Redux Toolkit + RTK Query base API (@repo/store, frontend apps only)
  eslint-config/      Shared eslint configs (@repo/eslint-config)
  typescript-config/  Shared tsconfig bases (@repo/typescript-config)
docs/                 Architecture + per-domain DB schema docs (source of truth, read before big changes)
```

Full architecture reference: [docs/architecture.md](docs/architecture.md), [docs/system-diagram.md](docs/system-diagram.md), DB domain docs in [docs/db/](docs/db/).

## Tech stack

- **Backend**: NestJS 11, Drizzle ORM (`postgres-js` driver), `nestjs-zod` for validation/DTOs, `@nestjs/swagger` + Scalar UI (`/reference`), Supabase (Postgres + Auth + Queues/`pgmq`), `@nestjs/terminus` health checks.
- **Publicator & Website**: Next.js 16 (App Router), React 19, Redux Toolkit + RTK Query (via `@repo/store`), Tailwind v4, shadcn/ui, Zod v4.
- **Package manager**: pnpm (`packageManager: pnpm@9.0.0`), workspaces defined in `pnpm-workspace.yaml` (`apps/*`, `packages/*`).
- **Build orchestration**: Turborepo (`turbo.json`) — `build`, `lint`, `check-types`, `dev` pipelines.

## Key architectural rules (do not violate)

- **Backend is the sole gateway to the database.** Frontend apps (`publicator`, `website`) never call Supabase directly for data — only `@repo/store` → Backend API. Supabase Auth is used directly by frontends only for login/MFA.
- **`packages/db` (Drizzle) is imported by the backend only.** Never import it from frontend apps.
- **`packages/validators` has zero backend/Node-only dependencies.** It must stay safe to import into any app. No `drizzle-zod`, no NestJS-only helpers there.
- **API calls from frontends go through Next.js rewrites**, not cross-origin fetch: `next.config.ts` rewrites `/backend/api/:path*` → `envConfig.BACKEND.BASE_URL` (env var `NEXT_PUBLIC_BACKEND_BASE_URL`). RTK Query's `Api` in `@repo/store` uses the same-origin `/backend/api/v1` base URL.
- **Env access is always through a validated `envConfig`**, never raw `process.env` scattered in code — see `src/config/env.config.ts` (frontends) / `src/config/env.validation.ts` + `registerAs` factories (backend).
- **No new domain/module should be scaffolded ahead of an actual need.** Only Geography exists end-to-end (db → validators → backend module) as the reference implementation; the other 8 DB domains (see [docs/db/](docs/db/)) are documented but not yet implemented — follow the Geography pattern when adding a new one, don't pre-stub others.
- **Async work uses Supabase Queues (`pgmq`)**, triggered by Vercel Cron hitting a backend endpoint — no Redis/BullMQ/persistent worker process (backend deploys as a stateless Vercel Function).
- **Publicator-facing backend routes require AAL2 (2FA).** Any backend endpoint that exists to serve `apps/publicator` (internal/staff use) must enforce Supabase AAL2 (TOTP-completed session), not just a valid JWT — staff accounts are MFA-mandatory. Website/customer-facing routes don't require AAL2 unless the specific action demands it.
- **Avoid `any`.** Do not use `any` or `as any`/unchecked type casts to silence TypeScript — narrow with proper types, generics, or zod-inferred types instead. If a cast is truly unavoidable (e.g. a third-party type gap), prefer a precise cast (`as SpecificType`) with a one-line comment explaining why, never `as any`.

## File naming

- All file names use kebab-case (e.g. `region-details.dto.ts`, `use-app-selector.ts`), across every app and package — no camelCase or PascalCase file names.

## Conventions to follow when adding code

- **`packages/validators`**: `src/db/<domain>/<entity>.ts` mirrors a DB table 1:1. `src/api/<domain>/<resource>/<resource>-details.ts` / `-list.ts` / `-common.ts` hold response/param/query schemas (fixed filenames — don't invent new ones like `*-code-param.ts`). Response envelopes built once here via `buildResponseSchema`/`buildPaginatedResponseSchema` from `src/common/response.ts`. Cross-folder imports inside this package use Node subpath imports (`#*`), not `@/*` aliases.
- **`apps/backend`**: `src/modules/<domain>/` per feature, with `controllers/`, `services/`, `dto/`. Once a module has more than one resource, split `dto/` into `dto/<resource>/` subfolders mirroring validators' layout, each with a barrel `index.ts`. `dto/<resource>-details.dto.ts` etc. just wrap the pre-built validators schema with `createZodDto` — no `buildResponseSchema` calls in backend. Services inject repositories from `src/database/repositories/`, never the Drizzle client directly.
- **Every controller endpoint must be decorated with `@ZodResponse({ type: <ResponseDto> })`** (from `nestjs-zod`), pointing at the endpoint's response DTO — this drives response validation/serialization and the Swagger/Scalar schema, so it's required even where NestJS wouldn't strictly need a decorator.
- **`apps/publicator` / `apps/website`**: `src/store/` has `store.ts`, `hooks.ts`, `wrapper.tsx`, `features/<name>/` (local UI-only slices). API endpoints live in `packages/store/src/endpoints/<domain>/` via `Api.injectEndpoints`, typed from `@repo/validators`.
- Env template files are `example.env` (not `.env.example`) across the repo; local values go in gitignored `.env.local` (frontends) / `.env.local` (backend).

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

## Common commands

Run from repo root unless noted:

```sh
pnpm install                        # install all workspace deps
pnpm dev                            # turbo run dev (all apps)
pnpm dev:backend                    # dev backend only
pnpm dev:publicator                 # dev publicator only
pnpm dev:website                    # dev website only
pnpm build                          # turbo run build (all)
pnpm lint                           # turbo run lint (all)
pnpm check-types                    # turbo run check-types (all)
pnpm format                         # prettier --write across ts/tsx/md
```

Package-specific:

```sh
# packages/db
pnpm --filter @repo/db db:generate  # drizzle-kit generate (new migration from schema changes)
pnpm --filter @repo/db db:migrate   # drizzle-kit migrate
pnpm --filter @repo/db db:push      # drizzle-kit push
pnpm --filter @repo/db db:studio    # drizzle-kit studio

# apps/backend
pnpm --filter backend test          # jest unit tests
pnpm --filter backend test:e2e      # jest e2e tests
```

## Validation before finishing a task

- Prefer running the narrowest relevant command first (`pnpm --filter <pkg> check-types`, `pnpm --filter <pkg> lint`), then the root `pnpm check-types`/`pnpm lint` if the change spans packages.
- After editing `packages/db` schema, regenerate migrations (`db:generate`) — never hand-edit generated SQL in `packages/db/migrations/`.
- After editing `packages/validators`, check whether `apps/backend/src/modules/**/dto` needs matching updates.

## Documentation policy

- `docs/architecture.md` is the living architecture spec — treat it as authoritative over this file for anything not covered here, and update it when architecture-level decisions change (new domain implemented, new package, pattern change).
- `docs/db/*.md` documents all 9 planned DB domains; keep in sync when `packages/db` schema changes.
