import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import {
  Post,
  PostDocument,
  PostMedia,
  PostMediaDocument,
  PostReaction,
  PostReactionDocument,
  Poll,
  PollDocument,
  PollOption,
  PollOptionDocument,
} from '../schemas/post.schema';

@Injectable()
export class PostRepository extends BaseRepository<PostDocument> {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(PostMedia.name)
    private postMediaModel: Model<PostMediaDocument>,
    @InjectModel(PostReaction.name)
    private postReactionModel: Model<PostReactionDocument>,
    @InjectModel(Poll.name) private pollModel: Model<PollDocument>,
    @InjectModel(PollOption.name)
    private pollOptionModel: Model<PollOptionDocument>,
  ) {
    super(postModel);
  }

  // Optimized Aggregation Pipeline to avoid N+1 queries
  async findFeed(params: {
    userId: string;
    courseIds: string[];
    limit: number;
    cursor?: string;
  }): Promise<any> {
    const { courseIds, limit, cursor } = params;

    const matchStage: any = {
      isDeleted: false,
      $or: [
        { audience: 'PUBLIC' },
        { audience: 'COURSE', courseId: { $in: courseIds } },
      ],
    };

    if (cursor) {
      matchStage.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await this.postModel
      .aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $limit: limit + 1 },
        // Lookup Media
        {
          $lookup: {
            from: 'community_post_media',
            localField: '_id',
            foreignField: 'postId',
            as: 'media',
          },
        },
        // Lookup Polls
        {
          $lookup: {
            from: 'community_polls',
            localField: '_id',
            foreignField: 'postId',
            as: 'poll',
          },
        },
        {
          $unwind: {
            path: '$poll',
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .exec();

    let nextCursor = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem.createdAt.toISOString();
    }

    return {
      items: posts,
      nextCursor,
    };
  }

  async createMedia(mediaData: Partial<PostMedia>[]): Promise<void> {
    if (mediaData.length > 0) {
      await this.postMediaModel.insertMany(mediaData);
    }
  }

  async createPoll(
    pollData: Partial<Poll>,
    options: Partial<PollOption>[],
  ): Promise<void> {
    const poll = new this.pollModel(pollData);
    await poll.save();

    const optionsWithPollId = options.map((opt) => ({
      ...opt,
      pollId: poll._id,
    }));
    await this.pollOptionModel.insertMany(optionsWithPollId);
  }

  async setAcceptedAnswer(postId: string, commentId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, {
      $set: { acceptedAnswerId: commentId },
    });
  }

  async setLockStatus(postId: string, isLocked: boolean): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $set: { isLocked } });
  }

  async addReaction(postId: string, userId: string, type: string): Promise<void> {
    // Check if reaction exists
    const existing = await this.postReactionModel.findOne({ postId, userId });
    if (existing) {
      if (existing.type === type) return; // same reaction
      // Remove old reaction stats
      await this.postModel.findByIdAndUpdate(postId, {
        $inc: { [`stats.${existing.type}s`]: -1 },
      });
      existing.type = type;
      await existing.save();
      await this.postModel.findByIdAndUpdate(postId, {
        $inc: { [`stats.${type}s`]: 1 },
      });
      return;
    }

    const reaction = new this.postReactionModel({ postId, userId, type });
    await reaction.save();
    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { [`stats.${type}s`]: 1 },
    });
  }

  async removeReaction(postId: string, userId: string): Promise<void> {
    const reaction = await this.postReactionModel.findOneAndDelete({ postId, userId });
    if (reaction) {
      await this.postModel.findByIdAndUpdate(postId, {
        $inc: { [`stats.${reaction.type}s`]: -1 },
      });
    }
  }
}
