import type { EnvConfig } from '@/config/env.config';
import { Module, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { LoggerModule as PinoLoggerModule } from 'pino-nestjs';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        pinoHttp: {
          level: config.get('LOGGING.LEVEL', { infer: true }),
          transport: config.get('ENV.DEV', { infer: true })
            ? { target: resolve(__dirname, 'pretty-transport.js') }
            : undefined,
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          customProps: () => ({ context: 'HTTP' }),
          // Trim req/res down to what's useful for a request log line — the
          // default serializers dump full headers/params on every request.
          serializers: {
            req: (req) => ({ method: req.method, url: req.url }),
            res: (res) => ({ statusCode: res.statusCode }),
          },
        },
        // Health checks are polled by Vercel Cron/uptime pings — skip per-request access logs.
        exclude: [{ method: RequestMethod.ALL, path: '/api/health' }],
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
