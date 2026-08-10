import { envConfig } from "@/config/env.config";
import { createSupabaseAdminClient } from "@repo/supabase";

export const supabaseAdmin = createSupabaseAdminClient(
  envConfig.SUPABASE.URL,
  envConfig.SUPABASE.SECRET_KEY,
);
