import type { EnvConfig } from '@/config/env.config';
import { Global, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb } from '@repo/db';
import { DRIZZLE } from './constants/database.constants';
import * as repositories from './repositories';

const repositoryProviders: Provider[] = Object.values(repositories);

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        createDb(config.get('DATABASE.URL', { infer: true })),
    },
    ...repositoryProviders,
  ],
  exports: [DRIZZLE, ...repositoryProviders],
})
export class DatabaseModule {}
