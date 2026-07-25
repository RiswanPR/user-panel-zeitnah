import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourseEnquiryDocument = CourseEnquiry & Document;

@Schema({ collection: 'course-enquiry', timestamps: true })
export class CourseEnquiry {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  courseName!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ trim: true, default: '' })
  message?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ default: 'PENDING', uppercase: true })
  status!: string;
}

export const CourseEnquirySchema = SchemaFactory.createForClass(CourseEnquiry);
