import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Tenant company container — either a consulting firm/agency operating on the platform as an
 * org, or a profile's own permanent personal tenant (see `profiles.personalTenantId`). No
 * dedicated column distinguishes the two; check `is_personal_tenant(id)` at the DB level.
 *
 * `logoSquareId`/`logoWideId` will reference `assets(id)` once that domain is implemented in
 * Drizzle — kept as plain `uuid` columns for now (assets FK not yet modeled).
 */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  vatCode: text("vat_code").unique(),
  taxCode: text("tax_code"),
  pec: text("pec"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  atecoCode: text("ateco_code"),
  atecoDescription: text("ateco_description"),
  legalFormCode: text("legal_form_code"),
  legalFormDescription: text("legal_form_description"),
  address: jsonb("address"),
  branding: jsonb("branding"),
  logoSquareId: uuid("logo_square_id"),
  logoWideId: uuid("logo_wide_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
