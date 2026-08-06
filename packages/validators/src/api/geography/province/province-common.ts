import { z } from "zod";

export const provinceCodeParamSchema = z.object({
  code: z.string().length(2),
});
