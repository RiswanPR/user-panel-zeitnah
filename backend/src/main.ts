import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Express } from 'express';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // TRUST PROXY
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', true);

  // INCREASE BODY PARSER PAYLOAD SIZE LIMIT (FIX HTTP 413)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // COOKIE PARSER
  app.use(cookieParser());

  // GLOBAL PREFIX (exclude .well-known for native Android & iOS verification)
  app.setGlobalPrefix('api', {
    exclude: [
      '.well-known/assetlinks.json',
      '.well-known/apple-app-site-association',
    ],
  });

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

  // CORS ALLOWLIST (Web + Capacitor Native Mobile + Local Dev)
  const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
    : ['https://beta.zeitnahacademy.com'];

  const defaultMobileAndWebOrigins = [
    'https://beta.zeitnahacademy.com',
    'https://zeitnahacademy.com',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  const allowedOrigins = Array.from(
    new Set([...configuredOrigins, ...defaultMobileAndWebOrigins].filter(Boolean)),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile native apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(
        new Error(`CORS blocked: Origin ${origin} is not in the allowlist`),
        false,
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  });

  // PORT
  const PORT = process.env.PORT || 3000;

  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Server running on port ${PORT}`);
}

void bootstrap();
