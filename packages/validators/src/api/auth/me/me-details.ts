import { buildResponseSchema } from "#common/response.ts";
import { internalRoleSchema, profileSchema, seatSchema } from "#db/index.ts";
import { z } from "zod";

// Mirrors with-auth.ts's AuthSession shape exactly (no createdAt on internalRole/seats —
// those fields are never resolved for the JWT-derived session object).
export const meDetailsResponseSchema = buildResponseSchema(
  z.object({
    profile: profileSchema
      .pick({
        id: true,
        firstName: true,
        lastName: true,
        avatarId: true,
        preferredLanguage: true,
      })
      .nullable(),
    internalRole: internalRoleSchema
      .pick({ id: true, name: true, permissions: true })
      .nullable(),
    seats: seatSchema.pick({ tenantId: true, seatRole: true }).array(),
  }),
);

export type MeDetailsResponse = z.infer<typeof meDetailsResponseSchema>;
