import { buildResponseSchema } from "#common/response.ts";
import { z } from "zod";

export const aal2CheckResponseSchema = buildResponseSchema(
  z.object({
    sub: z.uuid(),
    aal: z.string(),
  }),
);

export type Aal2CheckResponse = z.infer<typeof aal2CheckResponseSchema>;
