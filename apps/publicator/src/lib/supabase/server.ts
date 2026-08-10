import { createSupabaseServerClient } from "@repo/supabase/server";
import { cookies } from "next/headers";

import { envConfig } from "@/config/env.config";

// Server Components can't write cookies — session refresh writes happen in proxy.ts instead.
export async function createClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    envConfig.SUPABASE.URL,
    envConfig.SUPABASE.PUBLISHABLE_KEY,
    {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — ignored, see comment above.
        }
      },
    },
  );
}
