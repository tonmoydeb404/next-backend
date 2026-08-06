import { z } from "zod";

export const regionSchema = z.object({
  code: z.string(),
  name: z.string(),
});
export type Region = z.infer<typeof regionSchema>;
