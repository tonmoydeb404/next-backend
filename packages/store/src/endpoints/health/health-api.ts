import { Api } from "#base-api.ts";
import {
  HEALTH_CACHE_KEYS,
  HEALTH_ENDPOINTS,
} from "#endpoints/health/constant.ts";
import type { HealthCheckResponse } from "@repo/validators";

export const healthApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    healthCheck: builder.query<HealthCheckResponse, void>({
      query: () => HEALTH_ENDPOINTS.CHECK,
      providesTags: [HEALTH_CACHE_KEYS.CHECK],
    }),
  }),
});

export const { useHealthCheckQuery } = healthApi;
