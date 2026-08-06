import { Api } from "#base-api.ts";
import {
  HEALTH_CACHE_KEYS,
  HEALTH_ENDPOINTS,
} from "#endpoints/health/constant.ts";

export interface HealthIndicatorResult {
  status: "up" | "down";
  [key: string]: unknown;
}

export interface HealthCheckResponse {
  status: "ok" | "error" | "shutting_down";
  info?: Record<string, HealthIndicatorResult>;
  error?: Record<string, HealthIndicatorResult>;
  details: Record<string, HealthIndicatorResult>;
}

export const healthApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    healthCheck: builder.query<HealthCheckResponse, void>({
      query: () => HEALTH_ENDPOINTS.CHECK,
      providesTags: [HEALTH_CACHE_KEYS.CHECK],
    }),
  }),
});

export const { useHealthCheckQuery } = healthApi;
