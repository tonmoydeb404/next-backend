import { buildResponseSchema } from "#common/response.ts";
import { provinceSchema } from "#db/index.ts";

export const provinceDetailsResponseSchema =
  buildResponseSchema(provinceSchema);
