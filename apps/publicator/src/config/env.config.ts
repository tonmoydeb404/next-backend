import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  // Next.js always forces NODE_ENV=production for `next build`/`next start`, so use this to
  // distinguish deploy stages (e.g. staging vs production) instead.
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_BACKEND_BASE_URL: z.url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

// Runs once at module load (next.config.ts, server components/routes) against raw process.env.
function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

const env = validate(process.env);

export const envConfig = {
  ENV: {
    RAW: env.NEXT_PUBLIC_APP_ENV,
    DEV: env.NEXT_PUBLIC_APP_ENV === "development",
    STAGING: env.NEXT_PUBLIC_APP_ENV === "staging",
    PROD: env.NEXT_PUBLIC_APP_ENV === "production",
  },
  BACKEND: {
    BASE_URL: env.NEXT_PUBLIC_BACKEND_BASE_URL,
  },
};

export type EnvConfig = typeof envConfig;
