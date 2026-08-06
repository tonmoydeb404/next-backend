import { z } from "zod";

export const provinceCodeParamSchema = z.object({
  code: z.string().length(2),
});
export type ProvinceCodeParam = z.infer<typeof provinceCodeParamSchema>;
