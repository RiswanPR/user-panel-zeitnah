import { NestFactory } from '@nestjs/core';

import { ValidationPipe } from '@nestjs/common';

import helmet from 'helmet';

import { AppModule } from './app.module';

import type { Express } from 'express';

async function bootstrap(): Promise<void> {

  const app =
    await NestFactory.create(
      AppModule,
    );

  // TRUST PROXY
  const expressApp =
    app
      .getHttpAdapter()
      .getInstance() as Express;

  expressApp.set(
    'trust proxy',
    true,
  );

  // GLOBAL PREFIX
  app.setGlobalPrefix(
    'api',
  );

  // HELMET
  app.use(
    helmet({
      crossOriginResourcePolicy:
        false,

      contentSecurityPolicy:
        false,
    }),
  );

  // VALIDATION
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted:
        true,

      transform: true,

      transformOptions: {
        enableImplicitConversion:
          true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  });

  const PORT =
    process.env.PORT ||
    3000;

  await app.listen(
    PORT,
  );

  console.log(
    `🚀 Server running on port ${PORT}`,
  );
}

void bootstrap();