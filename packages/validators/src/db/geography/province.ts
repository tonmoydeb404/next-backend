import { z } from "zod";

export const provinceSchema = z.object({
  code: z.string(),
  name: z.string(),
  regionCode: z.string(),
});
export type Province = z.infer<typeof provinceSchema>;
