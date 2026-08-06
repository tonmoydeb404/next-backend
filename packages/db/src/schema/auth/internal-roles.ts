import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Role definitions catalog for internal staff (super_admin, publishing, technical, support).
 * Writes are restricted to scripts/Edge Functions (service_role) only.
 */
export const internalRoles = pgTable("internal_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  permissions: text("permissions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
