import { Api } from "#base-api.ts";
import { AUTH_CACHE_KEYS, AUTH_ENDPOINTS } from "#endpoints/auth/constant.ts";
import type { MeDetailsResponse } from "@repo/validators";

// Real HTTP call to the backend — DB-verified profile/internal_role_id, never trusted
// from the client's own session (see session-api.ts for that trust boundary).
export const authApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    me: builder.query<MeDetailsResponse, void>({
      query: () => AUTH_ENDPOINTS.ME,
      providesTags: [AUTH_CACHE_KEYS.ME],
    }),
  }),
});

export const { useMeQuery } = authApi;
