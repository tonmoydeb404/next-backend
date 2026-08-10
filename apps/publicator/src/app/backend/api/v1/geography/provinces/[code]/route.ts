import { createHandler } from "@/lib/api/create-handler";
import { NotFoundError } from "@/lib/api/error-handler";
import { provincesRepository } from "@/lib/api/repositories";
import {
  errorResponseSchema,
  formatResponse,
  provinceCodeParamSchema,
  provinceDetailsResponseSchema,
  type ProvinceDetailsResponse,
} from "@repo/validators";
import { NextResponse } from "next/server";

export const GET = createHandler({
  params: provinceCodeParamSchema,
  openapi: {
    summary: "Get province by code",
    tags: ["Geography"],
    responses: {
      200: {
        description: "Province retrieved successfully",
        schema: provinceDetailsResponseSchema,
      },
      404: { description: "Province not found", schema: errorResponseSchema },
    },
  },
  handler: async ({ params }) => {
    const province = await provincesRepository.findByCode(params.code);
    if (!province)
      throw new NotFoundError(`Province "${params.code}" not found`);

    return NextResponse.json(
      formatResponse({
        statusCode: 200,
        message: "Province retrieved successfully",
        results: province,
        meta: {},
      }) satisfies ProvinceDetailsResponse,
    );
  },
});
