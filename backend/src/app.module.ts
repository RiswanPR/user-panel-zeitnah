import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule }
from './modules/auth/auth.module';

@Module({
  imports: [

    MongooseModule.forRoot(
      'mongodb://127.0.0.1:27017/lms-platform',
    ),

    AuthModule,

  ],
})

export class AppModule {}