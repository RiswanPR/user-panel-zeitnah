import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import {
  Story,
  StoryDocument,
  StoryMedia,
  StoryMediaDocument,
  StoryView,
  StoryViewDocument,
} from '../schemas/story.schema';

@Injectable()
export class StoryRepository extends BaseRepository<StoryDocument> {
  constructor(
    @InjectModel(Story.name) private storyModel: Model<StoryDocument>,
    @InjectModel(StoryMedia.name)
    private storyMediaModel: Model<StoryMediaDocument>,
    @InjectModel(StoryView.name)
    private storyViewModel: Model<StoryViewDocument>,
  ) {
    super(storyModel);
  }

  async getActiveStories(): Promise<any[]> {
    const now = new Date();
    return this.storyModel
      .aggregate([
        { $match: { isDeleted: false, expiresAt: { $gt: now } } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: 'community_story_media',
            localField: '_id',
            foreignField: 'storyId',
            as: 'media',
          },
        },
      ])
      .exec();
  }

  async addView(storyId: string, userId: string): Promise<void> {
    const exists = await this.storyViewModel.findOne({ storyId, userId });
    if (!exists) {
      await new this.storyViewModel({ storyId, userId }).save();
      await this.storyModel.updateOne(
        { _id: storyId as any },
        { $inc: { 'stats.views': 1 } },
      );
    }
  }

  async deleteExpiredStories(): Promise<number> {
    const now = new Date();
    // In a real scenario, we might want to soft delete instead of hard delete, depending on analytics requirements.
    // The requirement says "remove expired stories". We'll soft delete them.
    const result = await this.storyModel
      .updateMany(
        { expiresAt: { $lte: now }, isDeleted: false, isPinned: false },
        { $set: { isDeleted: true, deletedAt: now } },
      )
      .exec();

    return result.modifiedCount;
  }
}
