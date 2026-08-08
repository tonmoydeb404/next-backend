import { GlobalExceptionFilter } from '@/common/filters';
import { envConfigFn, validate, type EnvConfig } from '@/config/env.config';
import { DatabaseModule } from '@/database/database.module';
import { CoreModule } from '@/modules/core/core.module';
import { GeographyModule } from '@/modules/geography/geography.module';
import { HealthModule } from '@/modules/health/health.module';
import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { GracefulShutdownModule } from '@tygra/nestjs-graceful-shutdown';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { LoggerModule } from 'pino-nestjs';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [envConfigFn],
      envFilePath: ['.env.local'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        pinoHttp: {
          level: config.get('LOGGING.LEVEL', { infer: true }),
          transport: config.get('ENV.DEV', { infer: true })
            ? { target: 'pino-pretty' }
            : undefined,
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
        },
        // Health checks are polled by Vercel Cron/uptime pings — skip per-request access logs.
        exclude: [{ method: RequestMethod.ALL, path: '/api/health' }],
      }),
    }),
    GracefulShutdownModule.forRoot(),
    DatabaseModule,
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
