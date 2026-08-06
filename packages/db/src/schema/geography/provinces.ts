import { index, pgTable, text } from "drizzle-orm/pg-core";
import { regions } from "./regions.ts";

/** Italy's ~107 provinces (incl. metropolitan cities) — immutable ISTAT reference data. */
export const provinces = pgTable(
  "provinces",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    regionCode: text("region_code")
      .notNull()
      .references(() => regions.code),
  },
  (table) => [index("idx_provinces_region").on(table.regionCode)],
);
