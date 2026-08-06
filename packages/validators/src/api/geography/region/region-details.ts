import { buildResponseSchema } from "#common/response.ts";
import { regionSchema } from "#db/index.ts";
import type { z } from "zod";

export const regionDetailsResponseSchema = buildResponseSchema(regionSchema);

export type RegionDetailsResponse = z.infer<typeof regionDetailsResponseSchema>;
