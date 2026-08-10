import { config } from "dotenv";
import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// Schema is authored in packages/supabase/migrations, not generated from here — this config only
// backs `db:studio` (browsing) against src/schema/index.ts's type definitions.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
}) satisfies Config;
