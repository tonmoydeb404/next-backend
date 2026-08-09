import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { seatRoleEnum } from "./enums.ts";
import { profiles } from "./profiles.ts";
import { tenants } from "./tenants.ts";

/**
 * Tenant membership rows. A tenant purchases/is granted N seats up front; each row is a seat
 * slot that starts vacant (`profileId` NULL) and gets assigned to a customer profile when they
 * join. A profile may hold seats on multiple tenants simultaneously.
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
    seatRole: seatRoleEnum("seat_role").notNull().default("operator"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_seats_tenant").on(table.tenantId),
    index("idx_seats_profile").on(table.profileId),
    index("idx_seats_tenant_profile").on(table.tenantId, table.profileId),
    uniqueIndex("uq_seats_tenant_profile")
      .on(table.tenantId, table.profileId)
      .where(sql`${table.profileId} is not null`),
  ],
);
