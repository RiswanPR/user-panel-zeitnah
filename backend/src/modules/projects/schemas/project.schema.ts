import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

export enum ProjectVisibility {
  PUBLIC = 'PUBLIC',
  NETWORK = 'NETWORK',
  PRIVATE = 'PRIVATE',
}

@Schema({ timestamps: true, collection: 'ecosystem_projects' })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ type: [String], default: [], index: true })
  skills!: string[];

  @Prop({ default: 'Infrastructure', trim: true })
  projectType!: string;

  @Prop({ default: '', trim: true, index: true })
  infrastructureSector!: string;

  @Prop({ default: '', trim: true })
  location!: string;

  @Prop({ default: '', trim: true })
  responsibilities!: string;

  @Prop({ type: [String], default: [] })
  softwareUsed!: string[];

  @Prop({ default: '', trim: true })
  role!: string;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date, default: null })
  endDate!: Date | null;

  @Prop({
    type: {
      githubUrl: { type: String, default: '' },
      liveDemoUrl: { type: String, default: '' },
      externalUrl: { type: String, default: '' },
    },
    default: { githubUrl: '', liveDemoUrl: '', externalUrl: '' },
  })
  links!: {
    githubUrl?: string;
    liveDemoUrl?: string;
    externalUrl?: string;
  };

  @Prop({ type: [String], default: [] })
  media!: string[];

  @Prop({ type: String, default: '', index: true })
  organizationId!: string;

  @Prop({ default: false, index: true })
  featured!: boolean;

  @Prop({
    type: String,
    enum: Object.values(ProjectVisibility),
    default: ProjectVisibility.PUBLIC,
  })
  visibility!: ProjectVisibility;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ ownerId: 1, featured: -1, createdAt: -1 });
