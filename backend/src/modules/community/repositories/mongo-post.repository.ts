import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IPostRepository } from './community.repository.interface';
import { IPost } from '../domain/post.model';
import { Post, PostDocument } from '../schemas/post.schema';

@Injectable()
export class MongoPostRepository implements IPostRepository {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  private toDomain(doc: PostDocument): IPost {
    const obj = doc.toObject();
    return {
      id: obj._id,
      authorId: obj.authorId,
      content: obj.content,
      type: obj.type,
      audience: obj.audience,
      courseId: obj.courseId,
      batchId: obj.batchId,
      media: obj.media,
      pollOptions: obj.pollOptions,
      pollExpiresAt: obj.pollExpiresAt,
      hashtags: obj.hashtags,
      mentions: obj.mentions,
      stats: obj.stats,
      isPinned: obj.isPinned,
      isEdited: obj.isEdited,
      isDeleted: obj.isDeleted,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      deletedAt: obj.deletedAt,
    };
  }

  async create(postData: Omit<IPost, 'id' | 'stats' | 'isPinned' | 'isEdited' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Promise<IPost> {
    const createdPost = new this.postModel(postData);
    const saved = await createdPost.save();
    return this.toDomain(saved as PostDocument);
  }

  async findById(id: string): Promise<IPost | null> {
    const post = await this.postModel.findOne({ _id: id as any, isDeleted: false }).exec();
    return post ? this.toDomain(post) : null;
  }

  async findFeed(params: {
    userId: string;
    courseIds: string[];
    limit: number;
    cursor?: string;
  }): Promise<{ items: IPost[]; nextCursor: string | null }> {
    const { courseIds, limit, cursor } = params;

    const query: any = {
      isDeleted: false,
      $or: [
        { audience: 'PUBLIC' },
        { audience: 'COURSE', courseId: { $in: courseIds } }
      ]
    };

    if (cursor) {
      // Cursor pagination based on createdAt string / timestamp logic
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await this.postModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec();

    let nextCursor = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = (nextItem as any).createdAt.toISOString();
    }

    return {
      items: posts.map((p) => this.toDomain(p)),
      nextCursor,
    };
  }

  async updateStats(id: string, stat: keyof IPost['stats'], increment: number): Promise<void> {
    const updateKey = `stats.${stat}`;
    await this.postModel.updateOne(
      { _id: id as any },
      { $inc: { [updateKey]: increment } }
    ).exec();
  }

  async softDelete(id: string): Promise<void> {
    await this.postModel.updateOne(
      { _id: id as any },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    ).exec();
  }
}
