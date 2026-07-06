import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IPostMedia, IPollOption, PostType, PostAudience } from '../domain/post.model';

export type PostDocument = Post & Document;

@Schema({ timestamps: true, collection: 'community_posts' })
export class Post {
  @Prop({ type: String, default: () => new Types.ObjectId().toString(), index: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  authorId: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, enum: PostType, required: true })
  type: PostType;

  @Prop({ type: String, enum: PostAudience, required: true, index: true })
  audience: PostAudience;

  @Prop({ type: String, index: true })
  courseId?: string;

  @Prop({ type: String, index: true })
  batchId?: string;

  @Prop({ type: Array, default: [] })
  media: IPostMedia[];

  @Prop({ type: Array, default: [] })
  pollOptions: IPollOption[];

  @Prop({ type: Date })
  pollExpiresAt?: Date;

  @Prop({ type: [String], default: [], index: true })
  hashtags: string[];

  @Prop({ type: [String], default: [], index: true })
  mentions: string[];

  @Prop({
    type: Object,
    default: {
      likes: 0,
      loves: 0,
      celebrates: 0,
      insightfuls: 0,
      comments: 0,
      shares: 0,
      views: 0,
    },
  })
  stats: {
    likes: number;
    loves: number;
    celebrates: number;
    insightfuls: number;
    comments: number;
    shares: number;
    views: number;
  };

  @Prop({ type: Boolean, default: false })
  isPinned: boolean;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Indexes for feed querying and sorting
PostSchema.index({ createdAt: -1 });
PostSchema.index({ audience: 1, courseId: 1, createdAt: -1 });
