import { z } from "zod";

export const regionCodeParamSchema = z.object({
  code: z.string().length(2),
});

export type RegionCodeParam = z.infer<typeof regionCodeParamSchema>;
