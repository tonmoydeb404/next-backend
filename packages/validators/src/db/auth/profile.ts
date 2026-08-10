import { z } from "zod";

export const profileSchema = z.object({
  id: z.uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  avatarId: z.uuid().nullable(),
  internalRoleId: z.uuid().nullable(),
  personalTenantId: z.uuid(),
  preferredLanguage: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Profile = z.infer<typeof profileSchema>;
