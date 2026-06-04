import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
} from 'mongoose';

import {
  Types,
} from 'mongoose';

export type CourseDocument =
  Course & Document;

// =========================
// EXERCISE
// =========================

@Schema({
  _id: true,
})

class Exercise {

  @Prop()
  title!: string;

  @Prop()
  file!: string;

  @Prop()
  type!: string;

}

// =========================
// CLASS
// =========================

@Schema({
  _id: true,
})

class CourseClass {

    _id!: Types.ObjectId; 

  @Prop()
  title!: string;

  @Prop()
  order!: number;

  @Prop()
  duration!: string;

  @Prop()
  description!: string;

  @Prop()
  thumbnail!: string;

  @Prop()
  videoId!: string;

  @Prop({
    default: Date.now,
  })
  createdAt!: Date;

  @Prop({
    type: [Exercise],
    default: [],
  })
  exercises!: Exercise[];

}

// =========================
// CHAPTER
// =========================

@Schema({
  _id: false,
})

class Chapter {

  @Prop()
  package!: string;

  @Prop()
  title!: string;

  @Prop()
  order!: number;

  @Prop()
  description!: string;

  @Prop()
  imageName!: string;

  @Prop()
  uniqueCode!: string;

  @Prop()
  courseId!: string;

  @Prop({
    type: [CourseClass],
    default: [],
  })
  classes!: CourseClass[];

}

// =========================
// COURSE
// =========================

@Schema({
  timestamps: true,
})

export class Course {

  @Prop({
    required: true,
  })
  name!: string;

  @Prop({
    default: 'free',
  })
  accessType!: string;

  @Prop({
    default: '0',
  })
  Total_Fees!: string;

  @Prop({
    enum: [
      'online',
      'Recording',
    ],
  })
  type!: string;

  @Prop({
    default: '',
  })
  description!: string;

  @Prop({
    default: '',
  })
  image!: string;

  @Prop({
    type: [Chapter],
    default: [],
  })
  chapters!: Chapter[];

}

export const CourseSchema =
  SchemaFactory.createForClass(
    Course,
  );