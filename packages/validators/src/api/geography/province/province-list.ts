import { buildResponseSchema } from "#common/response.ts";
import { provinceSchema } from "#db/index.ts";
import z from "zod";

export const provinceListQuerySchema = z.object({
  regionCode: z.string().length(2).optional(),
});
export type ProvinceListQuery = z.infer<typeof provinceListQuerySchema>;

export const provinceListResponseSchema = buildResponseSchema(
  provinceSchema.array(),
);
export type ProvinceListResponse = z.infer<typeof provinceListResponseSchema>;
