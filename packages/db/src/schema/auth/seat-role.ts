import { pgEnum } from "drizzle-orm/pg-core";

/** Tenant-internal hierarchy, enforced in RLS for tenant-scoped operations. */
export const seatRole = pgEnum("seat_role", ["owner", "operator", "viewer"]);
