import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles.js";
import { seatRole } from "./seat-role.js";
import { tenants } from "./tenants.js";

/**
 * Tenant membership rows. A seat starts vacant (profileId null) and is assigned to a customer
 * profile when they join. A profile may hold seats on multiple tenants simultaneously.
 */
export const seats = pgTable(
  "seats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    seatRole: seatRole("seat_role").notNull().default("operator"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_seats_tenant_profile")
      .on(table.tenantId, table.profileId)
      .where(sql`${table.profileId} is not null`),
    index("idx_seats_tenant").on(table.tenantId),
    index("idx_seats_profile").on(table.profileId),
    index("idx_seats_tenant_profile").on(table.tenantId, table.profileId),
  ],
);
