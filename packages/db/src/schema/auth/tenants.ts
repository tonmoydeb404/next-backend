import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Tenant company container: either an org (consulting firm/agency) or a profile's own
 * permanent personal tenant. Distinguish via `is_personal_tenant(id)`, not a dedicated column.
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
