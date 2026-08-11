import { createHandler } from "@/lib/api/create-handler";
import type { TenantRoleCheckResponse } from "@repo/validators";
import {
  formatResponse,
  tenantRoleCheckResponseSchema,
} from "@repo/validators";
import { NextResponse } from "next/server";

// Kept in sync with the `tenantRoles` list passed to createHandler below.
const ALLOWED_ROLES = ["owner", "operator", "viewer"] as const;

export const GET = createHandler({
  auth: true,
  tenantRoles: [...ALLOWED_ROLES],
  tenantRolesLogic: "or",
  openapi: {
    summary: "Diagnostic check for the tenant role guard",
    tags: ["Debug"],
    responses: {
      200: {
        description: "Tenant role guard passed",
        schema: tenantRoleCheckResponseSchema,
      },
    },
  },
  handler: async ({ session }) => {
    return NextResponse.json(
      formatResponse({
        statusCode: 200,
        message: "Tenant role guard passed",
        results: {
          allowedRoles: [...ALLOWED_ROLES],
          activeSeat: session!.activeSeat,
        },
        meta: {},
      }) satisfies TenantRoleCheckResponse,
    );
  },
});
