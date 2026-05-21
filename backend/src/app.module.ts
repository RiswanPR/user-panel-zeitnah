import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core/constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot('mongodb://127.0.0.1:27017/lms-platform'),

    AuthModule,
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

    useClass:
      ThrottlerGuard,

  },

],
})
export class AppModule {}
