import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types/database.types.ts";

// For client components — publishable key only, safe to expose to the browser.
export function createSupabaseBrowserClient(
  url: string,
  publishableKey: string,
) {
  return createBrowserClient<Database>(url, publishableKey);
}
