# `@repo/supabase`

Shared Supabase JS clients (`src/browser.ts`/`src/server.ts`/`src/admin.ts`) **and** the
Supabase CLI-managed project for this repo's database: `config.toml` + raw SQL `migrations/` that
touch the `auth` schema (triggers, functions, cross-schema FKs) — anything `drizzle-kit` can't
express from a `public`-schema-only Drizzle model (see `packages/db`).

## Migration order

Two independent migration tools manage this database:

1. `packages/db` (drizzle-kit) — `public` schema tables (e.g. `profiles`/`tenants`/`seats`).
2. `packages/supabase/migrations` (this folder, Supabase CLI) — anything referencing `auth.users`
   (triggers, functions, FKs from `public` tables back to `auth.users`).

**Always apply drizzle-kit migrations before the matching Supabase CLI migration** — the SQL here
references tables that drizzle-kit creates.

## Commands (run from repo root)

```sh
pnpm supabase:new <name>   # supabase migration new <name>
pnpm supabase:push         # supabase db push (apply pending migrations to the linked project)
pnpm supabase:pull         # supabase db pull (check for drift against the linked project)
pnpm supabase:types        # regenerate src/types/database.types.ts from the linked project
```

All four scripts pass `--workdir packages/supabase`. `supabase link --project-ref <ref> --workdir
packages/supabase` must be run once per machine before `push`/`pull`/`types` — requires the real
Supabase project ref and an access token, so it isn't scripted here.

## Types

`pnpm supabase:types` writes `src/types/database.types.ts` (the `Database` type consumed by all
three client factories) straight from the linked project's live schema. Run it after applying new
migrations (`supabase:push`) so the type stays in sync — it's committed to the repo, not generated
at build time, so consumers don't need a linked project just to type-check.

