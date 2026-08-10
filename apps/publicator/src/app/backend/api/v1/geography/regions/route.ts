import { createHandler } from "@/lib/api/create-handler";
import { regionsRepository } from "@/lib/api/repositories";
import type { RegionListResponse } from "@repo/validators";
import { formatResponse, regionListResponseSchema } from "@repo/validators";
import { NextResponse } from "next/server";

export const GET = createHandler({
  openapi: {
    summary: "List regions",
    tags: ["Geography"],
    responses: {
      200: {
        description: "Regions retrieved successfully",
        schema: regionListResponseSchema,
      },
    },
  },
  handler: async () => {
    const regions = await regionsRepository.query();

    return NextResponse.json(
      formatResponse({
        statusCode: 200,
        message: "Regions retrieved successfully",
        results: regions,
        meta: {},
      }) satisfies RegionListResponse,
    );
  },
});
