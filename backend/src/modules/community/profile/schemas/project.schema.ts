import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true, collection: 'community_projects' })
export class Project {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String, default: '' })
  githubUrl: string;

  @Prop({ type: String, default: '' })
  liveDemoUrl: string;

  @Prop({ type: [String], default: [] })
  mediaUrls: string[];

  @Prop({ type: Boolean, default: false, index: true })
  featured: boolean;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ userId: 1, featured: -1, createdAt: -1 });
