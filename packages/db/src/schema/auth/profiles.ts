import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { internalRoles } from "./internal-roles.js";
import { tenants } from "./tenants.js";

/**
 * Universal identity table, 1:1 with `auth.users`. Internal staff vs. customer is discriminated
 * purely by `internalRoleId`: set → internal staff, null → customer.
 */
export const profiles = pgTable(
  "profiles",
  {
    // FK -> auth.users(id) ON DELETE CASCADE (managed by Supabase, not this schema)
    id: uuid("id").primaryKey(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    avatarId: uuid("avatar_id"),
    internalRoleId: uuid("internal_role_id").references(() => internalRoles.id),
    personalTenantId: uuid("personal_tenant_id")
      .notNull()
      .references(() => tenants.id)
      .unique(),
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
