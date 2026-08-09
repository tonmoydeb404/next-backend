import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { internalRoles } from "./internal-roles.ts";
import { tenants } from "./tenants.ts";

/**
 * Universal identity table, 1:1 with `auth.users`. `id`'s FK to `auth.users(id)` is declared in
 * `packages/supabase/migrations` (Drizzle only models the `public` schema, not `auth.users`).
 *
 * No `account_type`/`kind` column — internal staff vs. customer is discriminated purely by
 * `internalRoleId`: `NOT NULL` → internal staff, `NULL` → customer. No `email` column either —
 * email lives in `auth.users` only.
 *
 * `avatarId` will reference `assets(id)` once that domain is implemented in Drizzle — kept as a
 * plain `uuid` column for now (assets FK not yet modeled).
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    avatarId: uuid("avatar_id"),
    internalRoleId: uuid("internal_role_id").references(() => internalRoles.id),
    personalTenantId: uuid("personal_tenant_id")
      .notNull()
      .unique()
      .references(() => tenants.id),
    preferredLanguage: text("preferred_language").default("en"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_profiles_internal_role_id")
      .on(table.internalRoleId)
      .where(sql`${table.internalRoleId} is not null`),
  ],
);
