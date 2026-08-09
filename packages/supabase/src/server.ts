import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./types/database.types.ts";

export interface SupabaseCookieAdapter {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options?: CookieOptions }[],
  ) => void;
}

// For server components, route handlers, and app-level middleware — each caller supplies its own
// cookies() binding since that API differs across those Next.js contexts.
export function createSupabaseServerClient(
  url: string,
  publishableKey: string,
  cookies: SupabaseCookieAdapter,
) {
  return createServerClient<Database>(url, publishableKey, { cookies });
}
