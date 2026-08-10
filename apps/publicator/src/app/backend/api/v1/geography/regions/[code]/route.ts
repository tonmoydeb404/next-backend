import { createHandler } from "@/lib/api/create-handler";
import { NotFoundError } from "@/lib/api/error-handler";
import { regionsRepository } from "@/lib/api/repositories";
import {
  errorResponseSchema,
  formatResponse,
  regionCodeParamSchema,
  regionDetailsResponseSchema,
  type RegionDetailsResponse,
} from "@repo/validators";
import { NextResponse } from "next/server";

export const GET = createHandler({
  params: regionCodeParamSchema,
  openapi: {
    summary: "Get region by code",
    tags: ["Geography"],
    responses: {
      200: {
        description: "Region retrieved successfully",
        schema: regionDetailsResponseSchema,
      },
      404: { description: "Region not found", schema: errorResponseSchema },
    },
  },
  handler: async ({ params }) => {
    const region = await regionsRepository.findByCode(params.code);
    if (!region) throw new NotFoundError(`Region "${params.code}" not found`);

    return NextResponse.json(
      formatResponse({
        statusCode: 200,
        message: "Region retrieved successfully",
        results: region,
        meta: {},
      }) satisfies RegionDetailsResponse,
    );
  },
});
