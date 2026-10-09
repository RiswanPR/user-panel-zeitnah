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

  private formatStory(s: any): any {
    const authorObj = s.authorData?.[0] || {};
    const orgObj = s.organizationData?.[0] || null;
    return {
      _id: s._id,
      id: s._id,
      authorId: s.authorId,
      organizationId: s.organizationId || null,
      organization: orgObj?._id
        ? {
            _id: String(orgObj._id),
            id: String(orgObj._id),
            name: orgObj.name,
            slug: orgObj.slug,
            logo: orgObj.logo,
            isVerified: Boolean(orgObj.isVerified),
            status: orgObj.status,
          }
        : null,
      type: s.type,
      text: s.text || '',
      backgroundColor: s.backgroundColor || '',
      link: s.link || '',
      courseTag: s.courseTag || '',
      stats: s.stats || { views: 0, reactions: 0, replies: 0 },
      isPinned: !!s.isPinned,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      media: s.media || [],
      mediaUrl: s.media?.[0]?.url || s.mediaUrl || '',
      author: {
        _id: authorObj._id ? String(authorObj._id) : s.authorId || '',
        id: authorObj._id ? String(authorObj._id) : s.authorId || '',
        name: authorObj.name || 'Zeitnah Member',
        displayName: authorObj.name || 'Zeitnah Member',
        username: authorObj.username || '',
        avatar: authorObj.avatar || authorObj.profileImage || '',
        role: authorObj.role || 'student',
        verified: !!authorObj.verified,
      },
    };
  }

  async createMedia(
    data: Partial<StoryMediaDocument>,
  ): Promise<StoryMediaDocument> {
    return new this.storyMediaModel(data).save();
  }

  async getActiveStories(): Promise<any[]> {
    const now = new Date();
    const rawStories = await this.storyModel
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
        {
          $lookup: {
            from: 'users',
            let: { authorStr: '$authorId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      {
                        $eq: [
                          '$_id',
                          {
                            $convert: {
                              input: '$$authorStr',
                              to: 'objectId',
                              onError: null,
                              onNull: null,
                            },
                          },
                        ],
                      },
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
                  profileImage: 1,
                  headline: 1,
                  role: 1,
                  verified: 1,
                },
              },
            ],
            as: 'authorData',
          },
        },
        {
          $lookup: {
            from: 'organizations',
            let: { orgStr: '$organizationId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $ne: ['$$orgStr', null] },
                      {
                        $or: [
                          {
                            $eq: [
                              '$_id',
                              {
                                $convert: {
                                  input: '$$orgStr',
                                  to: 'objectId',
                                  onError: null,
                                  onNull: null,
                                },
                              },
                            ],
                          },
                          { $eq: [{ $toString: '$_id' }, '$$orgStr'] },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  slug: 1,
                  logo: 1,
                  isVerified: 1,
                  status: 1,
                },
              },
            ],
            as: 'organizationData',
          },
        },
      ])
      .exec();

    return rawStories.map((s) => this.formatStory(s));
  }

  async findByIdPopulated(storyId: string): Promise<any> {
    const rawStories = await this.storyModel
      .aggregate([
        { $match: { _id: String(storyId), isDeleted: false } },
        {
          $lookup: {
            from: 'community_story_media',
            localField: '_id',
            foreignField: 'storyId',
            as: 'media',
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
                      {
                        $eq: [
                          '$_id',
                          {
                            $convert: {
                              input: '$$authorStr',
                              to: 'objectId',
                              onError: null,
                              onNull: null,
                            },
                          },
                        ],
                      },
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
                  profileImage: 1,
                  headline: 1,
                  role: 1,
                  verified: 1,
                },
              },
            ],
            as: 'authorData',
          },
        },
        {
          $lookup: {
            from: 'organizations',
            let: { orgStr: '$organizationId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $ne: ['$$orgStr', null] },
                      {
                        $or: [
                          {
                            $eq: [
                              '$_id',
                              {
                                $convert: {
                                  input: '$$orgStr',
                                  to: 'objectId',
                                  onError: null,
                                  onNull: null,
                                },
                              },
                            ],
                          },
                          { $eq: [{ $toString: '$_id' }, '$$orgStr'] },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  slug: 1,
                  logo: 1,
                  isVerified: 1,
                  status: 1,
                },
              },
            ],
            as: 'organizationData',
          },
        },
      ])
      .exec();

    if (!rawStories.length) return null;
    return this.formatStory(rawStories[0]);
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
    const result = await this.storyModel
      .updateMany(
        { expiresAt: { $lte: now }, isDeleted: false, isPinned: false },
        { $set: { isDeleted: true, deletedAt: now } },
      )
      .exec();

    return result.modifiedCount;
  }
}
