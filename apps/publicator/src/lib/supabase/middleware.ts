import { createSupabaseServerClient } from "@repo/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

import { envConfig } from "@/config/env.config";

// Refreshes the Supabase session cookie on the request/response pair Proxy is handling.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createSupabaseServerClient(
    envConfig.SUPABASE.URL,
    envConfig.SUPABASE.PUBLISHABLE_KEY,
    {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  );

  // getClaims() verifies the JWT signature locally on every call — unlike getSession(),
  // which must never be trusted in Proxy/server code since it doesn't revalidate the token.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  return { response, claims };
}
