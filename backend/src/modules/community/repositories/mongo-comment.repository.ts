import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ICommentRepository } from './community.repository.interface';
import { IComment } from '../domain/comment.model';
import { Comment, CommentDocument } from '../schemas/comment.schema';

@Injectable()
export class MongoCommentRepository implements ICommentRepository {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<CommentDocument>,
  ) {}

  private toDomain(doc: CommentDocument): IComment {
    const obj = doc.toObject();
    return {
      id: obj._id,
      postId: obj.postId,
      authorId: obj.authorId,
      parentId: obj.parentId,
      content: obj.content,
      mentions: obj.mentions,
      stats: obj.stats,
      isPinned: obj.isPinned,
      isInstructorHighlight: obj.isInstructorHighlight,
      isMentorHighlight: obj.isMentorHighlight,
      isEdited: obj.isEdited,
      isDeleted: obj.isDeleted,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      deletedAt: obj.deletedAt,
    };
  }

  async create(commentData: Omit<IComment, 'id' | 'stats' | 'isPinned' | 'isInstructorHighlight' | 'isMentorHighlight' | 'isEdited' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Promise<IComment> {
    const createdComment = new this.commentModel(commentData);
    const saved = await createdComment.save();
    return this.toDomain(saved as CommentDocument);
  }

  async findByPostId(postId: string, limit: number, cursor?: string): Promise<{ items: IComment[]; nextCursor: string | null }> {
    const query: any = {
      postId,
      parentId: { $exists: false }, // Top-level comments only
      isDeleted: false,
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const comments = await this.commentModel
      .find(query)
      .sort({ createdAt: -1 }) // Or sort by score for 'Most Helpful'
      .limit(limit + 1)
      .exec();

    let nextCursor = null;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = (nextItem as any).createdAt.toISOString();
    }

    return {
      items: comments.map((c) => this.toDomain(c)),
      nextCursor,
    };
  }

  async findReplies(parentId: string, limit: number, cursor?: string): Promise<{ items: IComment[]; nextCursor: string | null }> {
    const query: any = {
      parentId,
      isDeleted: false,
    };

    if (cursor) {
      query.createdAt = { $gt: new Date(cursor) }; // Replies usually sorted oldest first
    }

    const replies = await this.commentModel
      .find(query)
      .sort({ createdAt: 1 })
      .limit(limit + 1)
      .exec();

    let nextCursor = null;
    if (replies.length > limit) {
      const nextItem = replies.pop();
      nextCursor = (nextItem as any).createdAt.toISOString();
    }

    return {
      items: replies.map((c) => this.toDomain(c)),
      nextCursor,
    };
  }

  async updateStats(id: string, stat: keyof IComment['stats'], increment: number): Promise<void> {
    const updateKey = `stats.${stat}`;
    await this.commentModel.updateOne(
      { _id: id as any },
      { $inc: { [updateKey]: increment } }
    ).exec();
  }

  async softDelete(id: string): Promise<void> {
    await this.commentModel.updateOne(
      { _id: id as any },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    ).exec();
  }
}
