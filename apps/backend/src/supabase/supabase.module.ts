import type { EnvConfig } from '@/config/env.config';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdminClient } from '@repo/supabase';
import { SUPABASE_ADMIN } from './constants/supabase.constants';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        createSupabaseAdminClient(
          config.get('SUPABASE.URL', { infer: true }),
          config.get('SUPABASE.SECRET_KEY', { infer: true }),
        ),
    },
  ],
  exports: [SUPABASE_ADMIN],
})
export class SupabaseModule {}
