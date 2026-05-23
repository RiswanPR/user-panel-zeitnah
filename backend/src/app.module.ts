import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';

import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // ENV CONFIG
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // MONGODB
    MongooseModule.forRoot(process.env.MONGO_URL!),

    // AUTH MODULE
    AuthModule,

    // RATE LIMITING
    ThrottlerModule.forRoot([
      {
        ttl: 60000,

        limit: 5,
      },
    ]),
  ],

  providers: [
    {
      provide: APP_GUARD,

      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
