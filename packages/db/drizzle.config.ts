import { config } from "dotenv";
import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
}) satisfies Config;
