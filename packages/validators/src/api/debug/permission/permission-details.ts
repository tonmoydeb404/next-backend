import { buildResponseSchema } from "#common/response.ts";
import { internalRoleSchema, permissionSchema } from "#db/index.ts";
import { z } from "zod";

export const permissionCheckResponseSchema = buildResponseSchema(
  z.object({
    permission: permissionSchema,
    granted: z.boolean(),
    internalRole: internalRoleSchema
      .pick({ id: true, name: true, permissions: true })
      .nullable(),
  }),
);

export type PermissionCheckResponse = z.infer<
  typeof permissionCheckResponseSchema
>;
