import { createHandler } from "@/lib/api/create-handler";
import { provincesRepository } from "@/lib/api/repositories";
import {
  formatResponse,
  provinceListQuerySchema,
  provinceListResponseSchema,
  type ProvinceListResponse,
} from "@repo/validators";
import { NextResponse } from "next/server";

export const GET = createHandler({
  query: provinceListQuerySchema,
  openapi: {
    summary: "List provinces",
    tags: ["Geography"],
    responses: {
      200: {
        description: "Provinces retrieved successfully",
        schema: provinceListResponseSchema,
      },
    },
  },
  handler: async ({ query }) => {
    const provinces = query.regionCode
      ? await provincesRepository.findByRegionCode(query.regionCode)
      : await provincesRepository.query();

    return NextResponse.json(
      formatResponse({
        statusCode: 200,
        message: "Provinces retrieved successfully",
        results: provinces,
        meta: {},
      }) satisfies ProvinceListResponse,
    );
  },
});
