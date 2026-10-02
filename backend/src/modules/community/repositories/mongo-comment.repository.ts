import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import {
  Comment,
  CommentDocument,
  CommentReaction,
  CommentReactionDocument,
} from '../schemas/comment.schema';

@Injectable()
export class CommentRepository extends BaseRepository<CommentDocument> {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(CommentReaction.name)
    private commentReactionModel: Model<CommentReactionDocument>,
  ) {
    super(commentModel);
  }

  private formatComment(c: any): any {
    const authorObj = c.authorData?.[0] || {};
    return {
      _id: c._id,
      id: c._id,
      postId: c.postId,
      authorId: c.authorId,
      parentId: c.parentId || null,
      content: c.content,
      mentions: c.mentions || [],
      stats: c.stats || { likes: 0, replies: 0 },
      isEdited: !!c.isEdited,
      isPinned: !!c.isPinned,
      isAcceptedAnswer: !!c.isAcceptedAnswer,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      author: {
        _id: authorObj._id ? String(authorObj._id) : (c.authorId || ''),
        id: authorObj._id ? String(authorObj._id) : (c.authorId || ''),
        name: authorObj.name || 'Zeitnah Member',
        displayName: authorObj.name || 'Zeitnah Member',
        username: authorObj.username || '',
        avatar: authorObj.avatar || '',
        role: authorObj.role || 'student',
        verified: !!authorObj.verified,
      },
    };
  }

  async findByPostId(
    postId: string,
    limit: number,
    skip: number = 0,
  ): Promise<any[]> {
    const comments = await this.commentModel
      .aggregate([
        {
          $match: {
            postId: String(postId),
            isDeleted: false,
          },
        },
        { $sort: { isAcceptedAnswer: -1, createdAt: 1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            let: { authorStr: '$authorId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$_id', { $toObjectId: '$$authorStr' }] },
                      { $eq: [{ $toString: '$_id' }, '$$authorStr'] },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  username: 1,
                  avatar: 1,
                  headline: 1,
                  role: 1,
                  verified: 1,
                },
              },
            ],
            as: 'authorData',
          },
        },
      ])
      .exec();

    return comments.map((c) => this.formatComment(c));
  }

  async findByIdPopulated(commentId: string): Promise<any> {
    const comments = await this.commentModel
      .aggregate([
        {
          $match: {
            _id: String(commentId),
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            let: { authorStr: '$authorId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$_id', { $toObjectId: '$$authorStr' }] },
                      { $eq: [{ $toString: '$_id' }, '$$authorStr'] },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  username: 1,
                  avatar: 1,
                  headline: 1,
                  role: 1,
                  verified: 1,
                },
              },
            ],
            as: 'authorData',
          },
        },
      ])
      .exec();

    if (!comments.length) return null;
    return this.formatComment(comments[0]);
  }

  async markAcceptedAnswer(postId: string, commentId: string): Promise<void> {
    await this.commentModel.updateMany(
      { postId },
      { $set: { isAcceptedAnswer: false } },
    );
    await this.commentModel.findByIdAndUpdate(commentId, {
      $set: { isAcceptedAnswer: true },
    });
  }
}
