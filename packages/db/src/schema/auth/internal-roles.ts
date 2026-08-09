import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Role definitions catalog for internal staff (e.g. `super_admin`, `publishing`, `technical`,
 * `support`). Writes are restricted to scripts/Edge Functions (service_role) — see RLS policies
 * in `packages/supabase/migrations`.
 */
export const internalRoles = pgTable("internal_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  permissions: text("permissions").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
