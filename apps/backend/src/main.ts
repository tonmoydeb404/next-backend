import type { EnvConfig } from '@/config/env.config';
import { AppModule } from '@/modules/app/app.module';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { cleanupOpenApiDoc } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvConfig, true>);

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

  await app.listen(config.get('APP.PORT', { infer: true }));
}
void bootstrap();
