import { z } from "zod";
import { permissionSchema } from "./permissions.ts";

export const internalRoleSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  permissions: z.array(permissionSchema),
  createdAt: z.iso.datetime(),
});
export type InternalRole = z.infer<typeof internalRoleSchema>;
