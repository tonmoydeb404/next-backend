# `@repo/supabase`

Shared Supabase JS clients (`src/browser.ts`/`src/server.ts`/`src/admin.ts`) **and** the
Supabase CLI-managed project for this repo's database: `config.toml` + raw SQL `migrations/` —
the single source of truth for the entire schema (tables, indexes, FKs, triggers, functions, RLS,
grants). `packages/db` (Drizzle) only consumes this schema for typed queries in the backend; it
does not generate or own any migrations.

## Why migrations live here, not in packages/db

Supabase branching replays only this folder's migrations when spinning up a new branch database —
keeping the full schema here (not split across a second `drizzle-kit` migration history) means
every branch comes up complete automatically, with no separate manual step. It also avoids
ordering coordination between two independent migration tools touching the same database.

Every migration in this folder is written to be safely re-runnable (`IF NOT EXISTS`, guarded
`DO $$ ... EXCEPTION WHEN duplicate_object$$` blocks for `CREATE TYPE`/`ADD CONSTRAINT`,
`DROP ... IF EXISTS` before triggers/policies, `CREATE OR REPLACE FUNCTION`).

## Commands (run from repo root)

```sh
pnpm supabase:new <name>   # supabase migration new <name>
pnpm supabase:push         # supabase db push (apply pending migrations to the linked project)
pnpm supabase:pull         # supabase db pull (check for drift against the linked project)
pnpm supabase:types        # regenerate src/types/database.types.ts from the linked project
```

All four scripts pass `--workdir packages`. `supabase link --project-ref <ref> --workdir
packages/supabase` must be run once per machine before `push`/`pull`/`types` — requires the real
Supabase project ref and an access token, so it isn't scripted here.

## Types

`pnpm supabase:types` writes `src/types/database.types.ts` (the `Database` type consumed by all
three client factories) straight from the linked project's live schema. Run it after applying new
migrations (`supabase:push`) so the type stays in sync — it's committed to the repo, not generated
at build time, so consumers don't need a linked project just to type-check.
