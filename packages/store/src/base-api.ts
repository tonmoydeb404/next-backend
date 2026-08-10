import { getSupabaseBrowserClient } from "#supabase-client.ts";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Same-origin path; each app's next.config.ts rewrites /backend/api/** to the backend.
const baseUrl = "/backend/api/v1";

export const Api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers) => {
      const {
        data: { session },
      } = await getSupabaseBrowserClient().auth.getSession();

      if (session) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }

      return headers;
    },
  }),
  tagTypes: ["Region", "Province", "Health", "Session", "AuthMe"],
  endpoints: () => ({}),
});
