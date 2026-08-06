import { AppModule } from '@/app/app.module';
import type { EnvConfig } from '@/config/env.config';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { setupGracefulShutdown } from '@tygra/nestjs-graceful-shutdown';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<EnvConfig, true>);
  setupGracefulShutdown({ app });

  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({ origin: config.get('APP.CORS_ORIGINS', { infer: true }) });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BandiNet API')
    .setDescription('BandiNet backend API')
    .setVersion('1.0')
    .build();
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  app.use('/reference', apiReference({ content: document }));

  const PORT = config.get('APP.PORT', { infer: true });
  const HOST = config.get('APP.HOST', { infer: true });

  await app.listen(PORT, HOST, () => {
    const url = `http://${HOST}:${PORT}`;
    console.log(`🚀 Server is running on ${url}`);
    console.log(`📖 API Reference: ${url}/reference`);
  });
}
void bootstrap();
