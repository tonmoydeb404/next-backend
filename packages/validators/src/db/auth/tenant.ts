import { z } from "zod";

export const tenantSchema = z.object({
  id: z.uuid(),
  companyName: z.string(),
  vatCode: z.string().nullable(),
  taxCode: z.string().nullable(),
  pec: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  website: z.string().nullable(),
  atecoCode: z.string().nullable(),
  atecoDescription: z.string().nullable(),
  legalFormCode: z.string().nullable(),
  legalFormDescription: z.string().nullable(),
  address: z.record(z.string(), z.unknown()).nullable(),
  branding: z.record(z.string(), z.unknown()).nullable(),
  logoSquareId: z.uuid().nullable(),
  logoWideId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Tenant = z.infer<typeof tenantSchema>;
