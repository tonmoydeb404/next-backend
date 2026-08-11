import { buildResponseSchema } from "#common/response.ts";
import { seatRoleSchema, seatSchema } from "#db/index.ts";
import { z } from "zod";

export const tenantRoleCheckResponseSchema = buildResponseSchema(
  z.object({
    allowedRoles: seatRoleSchema.array(),
    activeSeat: seatSchema.pick({ tenantId: true, seatRole: true }).nullable(),
  }),
);

export type TenantRoleCheckResponse = z.infer<
  typeof tenantRoleCheckResponseSchema
>;
