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

  async findByPostId(
    postId: string,
    limit: number,
    skip: number = 0,
  ): Promise<CommentDocument[]> {
    return this.commentModel
      .aggregate([
        { $match: { postId, parentId: { $exists: false }, isDeleted: false } },
        { $sort: { isAcceptedAnswer: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'community_comments',
            localField: '_id',
            foreignField: 'parentId',
            as: 'replies',
          },
        },
      ])
      .exec();
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
