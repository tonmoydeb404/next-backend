import { buildResponseSchema } from "#common/response.ts";
import { z } from "zod";

const healthIndicatorSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
});

const healthCheckDataSchema = z.object({
  status: z.enum(["ok", "error"]),
  info: z.object({ database: healthIndicatorSchema }),
  details: z.object({ database: healthIndicatorSchema }),
});

export const healthCheckResponseSchema = buildResponseSchema(
  healthCheckDataSchema,
);

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
