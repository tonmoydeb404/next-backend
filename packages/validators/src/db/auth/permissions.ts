import { z } from "zod";

/**
 * Fixed catalog of `[resource]:[action]` permission strings. Any string outside this map fails
 * TypeScript compilation at call sites (`createHandler({ permissions })`) and Zod validation at
 * the DB write boundary (`internal_roles.permissions`).
 */
export const rolePermissions = {
  internal_roles: ["create", "read", "update", "delete"],
} as const;

type Resource = keyof typeof rolePermissions;
type Action<R extends Resource> = (typeof rolePermissions)[R][number];

/** e.g. `'internal_roles:create' | 'internal_roles:read' | ...` */
export type Permission = {
  [R in Resource]: `${R}:${Action<R>}`;
}[Resource];

export const permissionSchema = z.string().refine(
  (value): value is Permission => {
    const [resource, action] = value.split(":");
    const validActions = rolePermissions[resource as Resource] as
      | readonly string[]
      | undefined;
    return validActions ? validActions.includes(action ?? "") : false;
  },
  { message: "Invalid permission format. Must be [resource]:[action]" },
);
