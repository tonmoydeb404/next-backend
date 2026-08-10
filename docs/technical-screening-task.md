# Technical Screening Task

Small auth task in the BandiNet monorepo (`apps/publicator` + `apps/backend`). No AI coding
assistants — docs lookup is fine. Take a look around the repo first; the conventions you need
are already there.

**Time budget:** 3-4 hours. If you don't finish, stop and note what's left.

## Before you start

Read [AGENTS.md](../AGENTS.md) first — it documents the conventions and architectural rules for
this repo. Also look at what's already set up: `packages/supabase` (client factories), existing
modules under `apps/backend/src/modules` (e.g. Geography), and how `apps/publicator` is
structured. Follow the existing patterns rather than introducing your own.

## Tasks

1. **Setup sign-in page in Publicator** — a page where a user can log in with email/password.
2. **Setup auth guard in Publicator** — logged-out users shouldn't be able to reach protected pages.
3. **Setup JWT strategy in Backend** — the backend should be able to verify the token issued at sign-in.
4. **Create Auth Module in Backend** — wire up the pieces above as a proper Nest module.
5. **Create Auth Controller** — expose `/api/v1/auth/session` returning the logged-in user's
   `profile`, `internal_role`, and `tenant`.
