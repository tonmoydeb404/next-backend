import { createHandler } from "@/lib/api/create-handler";
import type { Aal2CheckResponse } from "@repo/validators";
import { aal2CheckResponseSchema, formatResponse } from "@repo/validators";
import { NextResponse } from "next/server";

export const GET = createHandler({
  auth: true,
  aal2: true,
  openapi: {
    summary: "Diagnostic check for the aal2 guard",
    tags: ["Debug"],
    responses: {
      200: {
        description: "AAL2 guard passed",
        schema: aal2CheckResponseSchema,
      },
    },
  },
  handler: async ({ session }) => {
    return NextResponse.json(
      formatResponse({
        statusCode: 200,
        message: "AAL2 guard passed",
        results: { sub: session!.sub, aal: session!.aal },
        meta: {},
      }) satisfies Aal2CheckResponse,
    );
  },
});
