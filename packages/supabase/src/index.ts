export * from "./admin.ts";
export * from "./browser.ts";
export * from "./server.ts";
export type { Database, Json } from "./types/database.types.ts";
// Re-exported so consumers don't need @supabase/supabase-js as a direct dependency.
export * from "@supabase/supabase-js";
