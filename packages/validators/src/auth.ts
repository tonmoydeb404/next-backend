import { z } from "zod";

/** Fields a user can edit on their own profile (see @repo/db profiles table). */
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(30).optional(),
  preferredLanguage: z.string().length(2).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const seatRoleSchema = z.enum(["owner", "operator", "viewer"]);

export const inviteSeatSchema = z.object({
  tenantId: z.uuid(),
  email: z.email(),
  seatRole: seatRoleSchema.default("operator"),
});

export type InviteSeatInput = z.infer<typeof inviteSeatSchema>;
