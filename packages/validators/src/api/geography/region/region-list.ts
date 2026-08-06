import { buildResponseSchema } from "#common/response.ts";
import { regionSchema } from "#db/index.ts";
import type { z } from "zod";

export const regionListResponseSchema = buildResponseSchema(
  regionSchema.array(),
);

export type RegionListResponse = z.infer<typeof regionListResponseSchema>;
