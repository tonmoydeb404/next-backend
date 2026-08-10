import { z } from "zod";

// Client-side env vars (available in browser + server)
const clientSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Server-only env vars (never exposed to browser)
const serverSchema = z.object({
  DATABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_JWKS_URL: z.url(),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional(),
});

const envSchema = clientSchema.merge(serverSchema);

export type Env = z.infer<typeof envSchema>;

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
  SUPABASE: {
    URL: env.NEXT_PUBLIC_SUPABASE_URL,
    PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SECRET_KEY: env.SUPABASE_SECRET_KEY,
    JWKS_URL: env.SUPABASE_JWKS_URL,
  },
  DATABASE: {
    URL: env.DATABASE_URL,
  },
  LOGGING: {
    LEVEL:
      env.LOG_LEVEL ??
      (env.NEXT_PUBLIC_APP_ENV === "development" ? "debug" : "info"),
  },
};

export type EnvConfig = typeof envConfig;
