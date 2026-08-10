import { Api } from "#base-api.ts";
import { AUTH_CACHE_KEYS } from "#endpoints/auth/constant.ts";
import { getSupabaseBrowserClient } from "#supabase-client.ts";
import type { JwtPayload } from "@repo/supabase";

type SignInInput = {
  email: string;
  password: string;
};

// Wraps the Supabase browser client directly (no HTTP call) — this is the client's own
// trust boundary, separate from the backend API's independently JWT-verified session.
export const sessionApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    session: builder.query<JwtPayload | null, void>({
      queryFn: async () => {
        const { data, error } =
          await getSupabaseBrowserClient().auth.getClaims();
        if (error)
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        return { data: data?.claims ?? null };
      },
      providesTags: [AUTH_CACHE_KEYS.SESSION],
    }),
    signIn: builder.mutation<null, SignInInput>({
      queryFn: async (credentials) => {
        const { error } =
          await getSupabaseBrowserClient().auth.signInWithPassword(credentials);
        if (error)
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        return { data: null };
      },
      invalidatesTags: [AUTH_CACHE_KEYS.SESSION],
    }),
    signOut: builder.mutation<null, void>({
      queryFn: async () => {
        const { error } = await getSupabaseBrowserClient().auth.signOut();
        if (error)
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        return { data: null };
      },
      invalidatesTags: [AUTH_CACHE_KEYS.SESSION],
    }),
  }),
});

export const { useSessionQuery, useSignInMutation, useSignOutMutation } =
  sessionApi;
