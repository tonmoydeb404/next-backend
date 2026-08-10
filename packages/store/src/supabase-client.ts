import { createSupabaseBrowserClient } from "@repo/supabase/browser";

// NEXT_PUBLIC_* vars are inlined by Next.js at build time — safe to read directly here
// since both apps declare the same names, and these values aren't secret.
let client: ReturnType<typeof createSupabaseBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  client ??= createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}
