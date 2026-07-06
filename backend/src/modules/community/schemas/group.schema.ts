import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type GroupDocument = Group & Document;
export type GroupMemberDocument = GroupMember & Document;
export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true, collection: 'community_groups' })
export class Group {
  @Prop({ type: String, default: () => uuidv4(), index: true })
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true, index: true })
  creatorId: string;

  @Prop({ type: String, index: true })
  courseId?: string; // If this group is tied to a specific course

  @Prop({ type: String })
  coverImage?: string;

  @Prop({ type: Boolean, default: true })
  isPublic: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
GroupSchema.index({ courseId: 1 });

@Schema({ timestamps: true, collection: 'community_group_members' })
export class GroupMember {
  @Prop({ type: String, default: () => uuidv4(), index: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  groupId: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({
    type: String,
    enum: ['member', 'moderator', 'admin', 'owner'],
    default: 'member',
  })
  role: string;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);
GroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'community_announcements' })
export class Announcement {
  @Prop({ type: String, default: () => uuidv4(), index: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  authorId: string;

  @Prop({ type: String, index: true })
  groupId?: string;

  @Prop({ type: String, index: true })
  courseId?: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
AnnouncementSchema.index({ groupId: 1, createdAt: -1 });
AnnouncementSchema.index({ courseId: 1, createdAt: -1 });
