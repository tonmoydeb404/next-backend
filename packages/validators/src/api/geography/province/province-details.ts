import { buildResponseSchema } from "#common/response.ts";
import { provinceSchema } from "#db/index.ts";
import type { z } from "zod";

export const provinceDetailsResponseSchema =
  buildResponseSchema(provinceSchema);
export type ProvinceDetailsResponse = z.infer<
  typeof provinceDetailsResponseSchema
>;
