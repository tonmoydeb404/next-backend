import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Same-origin path; each app's next.config.ts rewrites /backend/api/** to the backend.
const baseUrl = "/backend/api/v1";

export const Api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl }),
  tagTypes: ["Region", "Province", "Health"],
  endpoints: () => ({}),
});
