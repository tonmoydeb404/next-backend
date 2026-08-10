import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_PUBLICATOR_BASE_URL: z.url().default("http://localhost:4002"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

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
  PUBLICATOR: {
    BASE_URL: env.NEXT_PUBLIC_PUBLICATOR_BASE_URL,
  },
  SUPABASE: {
    URL: env.NEXT_PUBLIC_SUPABASE_URL,
    PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
};

export type EnvConfig = typeof envConfig;
