import { NestFactory } from '@nestjs/core';

import { ValidationPipe } from '@nestjs/common';

import helmet from 'helmet';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import type { Express } from 'express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // TRUST PROXY
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', true);

  // GLOBAL PREFIX
  app.setGlobalPrefix('api');

  // HELMET SECURITY
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // GLOBAL VALIDATION
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted: true,

      transform: true,

      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // GLOBAL EXCEPTION FILTER
  app.useGlobalFilters(new GlobalExceptionFilter());

  // SWAGGER
  const config = new DocumentBuilder()
    .setTitle('Zeitnah LMS Community API')
    .setDescription('Phase 1 - Community Module API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // CORS
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['https://beta.zeitnahacademy.com'];

  app.enableCors({
    origin: allowedOrigins,

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // PORT
  const PORT = process.env.PORT || 3000;

  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Server running on port ${PORT}`);
}

void bootstrap();
