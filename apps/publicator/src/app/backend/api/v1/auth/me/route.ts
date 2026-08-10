import { createHandler } from "@/lib/api/create-handler";
import { profilesRepository } from "@/lib/api/repositories";
import type { MeDetailsResponse } from "@repo/validators";
import { formatResponse, meDetailsResponseSchema } from "@repo/validators";
import { NextResponse } from "next/server";

export const GET = createHandler({
  auth: true,
  openapi: {
    summary: "Get the current session's profile and internal role",
    tags: ["Auth"],
    responses: {
      200: {
        description: "Session details retrieved successfully",
        schema: meDetailsResponseSchema,
      },
    },
  },
  handler: async ({ session }) => {
    // Re-queried here (not reused from with-auth.ts's AuthSession) since that only
    // resolves internalRole, never the full profile row.
    const profile = session?.sub
      ? await profilesRepository.findById(session.sub)
      : null;

    return NextResponse.json(
      formatResponse({
        statusCode: 200,
        message: "Session details retrieved successfully",
        // Both re-verified from the DB per-request — never trust a client-supplied value.
        results: {
          profile: profile
            ? {
                id: profile.id,
                firstName: profile.firstName,
                lastName: profile.lastName,
                avatarId: profile.avatarId,
                preferredLanguage: profile.preferredLanguage,
              }
            : null,
          internalRole: session?.internalRole ?? null,
          seats: session?.seats ?? [],
        },
        meta: {},
      }) satisfies MeDetailsResponse,
    );
  },
});
