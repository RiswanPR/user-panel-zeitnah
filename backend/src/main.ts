import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

import {
  ValidationPipe,
} from '@nestjs/common';

import {
  ThrottlerGuard,
} from '@nestjs/throttler';
import {
  APP_GUARD,
} from '@nestjs/core';
async function bootstrap() {

  const app =
    await NestFactory.create(
      AppModule,
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

  // CORS
  app.enableCors({

    origin: [
      'http://localhost:5173',
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

  // PORT
  const PORT =
    process.env.PORT || 3000;

  await app.listen(PORT);

  console.log(
    `🚀 Server running on port ${PORT}`,
  );

}

bootstrap();