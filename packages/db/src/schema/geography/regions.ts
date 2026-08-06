import { pgTable, text } from "drizzle-orm/pg-core";

/** Italy's 20 administrative regions — immutable ISTAT reference data. */
export const regions = pgTable("regions", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});
