import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_JWKS_URL: z.url(),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof envSchema>;

// NestJS ConfigModule's `validate` hook: runs once against raw process.env at bootstrap.
export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export const envConfigFn = () => {
  const env = validate(process.env);

  return {
    ENV: {
      RAW: env.NODE_ENV,
      DEV: env.NODE_ENV === 'development',
      PROD: env.NODE_ENV === 'production',
      TEST: env.NODE_ENV === 'test',
    },
    APP: {
      HOST: env.HOST,
      PORT: env.PORT,
      CORS_ORIGINS: env.CORS_ORIGINS,
    },
    DATABASE: {
      URL: env.DATABASE_URL,
      DIRECT_URL: env.DIRECT_URL,
    },
    SUPABASE: {
      URL: env.SUPABASE_URL,
      JWKS_URL: env.SUPABASE_JWKS_URL,
    },
  };
};

export type EnvConfig = ReturnType<typeof envConfigFn>;
