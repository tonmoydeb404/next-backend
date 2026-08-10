import { GlobalExceptionFilter } from '@/common/filters';
import { LoggerModule } from '@/common/logger/logger.module';
import { envConfigFn, validate } from '@/config/env.config';
import { DatabaseModule } from '@/database/database.module';
import { CoreModule } from '@/modules/core/core.module';
import { GeographyModule } from '@/modules/geography/geography.module';
import { HealthModule } from '@/modules/health/health.module';
import { SupabaseModule } from '@/supabase/supabase.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { GracefulShutdownModule } from '@tygra/nestjs-graceful-shutdown';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [envConfigFn],
      envFilePath: ['.env.local'],
    }),
    LoggerModule,
    GracefulShutdownModule.forRoot(),
    DatabaseModule,
    SupabaseModule,
    CoreModule,
    HealthModule,
    GeographyModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
