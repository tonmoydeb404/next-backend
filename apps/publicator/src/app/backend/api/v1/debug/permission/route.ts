import { createHandler } from "@/lib/api/create-handler";
import type { PermissionCheckResponse } from "@repo/validators";
import {
  formatResponse,
  permissionCheckResponseSchema,
} from "@repo/validators";
import { NextResponse } from "next/server";

// Kept in sync with the `permissions` list passed to createHandler below.
const CHECKED_PERMISSION = "internal_roles:read" as const;

export const GET = createHandler({
  auth: true,
  aal2: true,
  permissions: [CHECKED_PERMISSION],
  openapi: {
    summary: "Diagnostic check for the permissions guard",
    tags: ["Debug"],
    responses: {
      200: {
        description: "Permission guard passed",
        schema: permissionCheckResponseSchema,
      },
    },
  },
  handler: async ({ session }) => {
    return NextResponse.json(
      formatResponse({
        statusCode: 200,
        message: "Permission guard passed",
        // Reaching the handler already proves the permission was granted.
        results: {
          permission: CHECKED_PERMISSION,
          granted: true,
          internalRole: session!.internalRole,
        },
        meta: {},
      }) satisfies PermissionCheckResponse,
    );
  },
});
