import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PostsModule } from './modules/posts/posts.module';
import { MongooseModule } from '@nestjs/mongoose';


@Module({
  imports: [
    AuthModule,
    UsersModule,
    PostsModule,
    MongooseModule.forRoot('mongodb://127.0.0.1:27017/lms-platform'),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
