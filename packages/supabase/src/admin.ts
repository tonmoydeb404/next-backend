import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types/database.types.ts";

// Secret key client — backend only, never expose this key to frontends.
export function createSupabaseAdminClient(url: string, secretKey: string) {
  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
