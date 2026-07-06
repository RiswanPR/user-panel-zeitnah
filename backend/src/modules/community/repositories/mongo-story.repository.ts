import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IStoryRepository } from './community.repository.interface';
import { IStory } from '../domain/story.model';
import { Story, StoryDocument } from '../schemas/story.schema';

@Injectable()
export class MongoStoryRepository implements IStoryRepository {
  constructor(
    @InjectModel(Story.name) private readonly storyModel: Model<StoryDocument>,
  ) {}

  private toDomain(doc: StoryDocument): IStory {
    const obj = doc.toObject();
    return {
      id: obj._id,
      authorId: obj.authorId,
      type: obj.type,
      mediaUrl: obj.mediaUrl,
      thumbnailUrl: obj.thumbnailUrl,
      backgroundColor: obj.backgroundColor,
      text: obj.text,
      link: obj.link,
      courseTag: obj.courseTag,
      stats: obj.stats,
      isPinned: obj.isPinned,
      expiresAt: obj.expiresAt,
      isDeleted: obj.isDeleted,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  async create(storyData: Omit<IStory, 'id' | 'stats' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Promise<IStory> {
    const createdStory = new this.storyModel(storyData);
    const saved = await createdStory.save();
    return this.toDomain(saved as StoryDocument);
  }

  async findActiveStories(userIds: string[], courseIds: string[]): Promise<IStory[]> {
    // Find stories from specific users (like followed users or mentors) or specific course tags
    const query: any = {
      isDeleted: false,
      expiresAt: { $gt: new Date() }, // Redundant because of TTL, but safe
      $or: [
        { authorId: { $in: userIds } },
        { courseTag: { $in: courseIds } }
      ]
    };

    const stories = await this.storyModel
      .find(query)
      .sort({ createdAt: 1 }) // Chronological order for stories
      .exec();

    return stories.map((s) => this.toDomain(s));
  }

  async softDelete(id: string): Promise<void> {
    await this.storyModel.updateOne(
      { _id: id as any },
      { $set: { isDeleted: true } }
    ).exec();
  }
}
