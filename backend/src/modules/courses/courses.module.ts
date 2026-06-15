import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { CoursesController } from './courses.controller';

import { CoursesService } from './courses.service';

import { Course, CourseSchema } from './schemas/course.schema';

import { User, UserSchema } from '../auth/schemas/user.schema';

import {
  ActiveStream,
  ActiveStreamSchema,
} from './schemas/active-stream.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Course.name,
        schema: CourseSchema,
      },

      {
        name: User.name,
        schema: UserSchema,
      },

      {
        name: ActiveStream.name,
        schema: ActiveStreamSchema,
      },
    ]),
  ],

  controllers: [CoursesController],

  providers: [CoursesService],
})
export class CoursesModule {}
