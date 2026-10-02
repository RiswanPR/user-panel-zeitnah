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
  SavedPost,
  SavedPostDocument,
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
    @InjectModel(SavedPost.name)
    private savedPostModel: Model<SavedPostDocument>,
    @InjectModel(Poll.name) private pollModel: Model<PollDocument>,
    @InjectModel(PollOption.name)
    private pollOptionModel: Model<PollOptionDocument>,
  ) {
    super(postModel);
  }

  // Optimized Aggregation Pipeline to populate author, media, and viewer reaction state
  async findFeed(params: {
    userId?: string;
    courseIds?: string[];
    limit?: number;
    cursor?: string;
  }): Promise<{ items: any[]; nextCursor: string | null }> {
    const { userId, courseIds = [], limit = 10, cursor } = params;

    const matchStage: any = {
      isDeleted: false,
      $or: [
        { audience: 'PUBLIC' },
        ...(courseIds.length > 0 ? [{ audience: 'COURSE', courseId: { $in: courseIds } }] : []),
      ],
    };

    if (cursor) {
      matchStage.createdAt = { $lt: new Date(cursor) };
    }

    const pipeline: any[] = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $limit: limit + 1 },

      // 1. Populate Author from `users` collection safely
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
                role: 1,
                primaryRole: 1,
                'gamification.rank': 1,
                'gamification.level': 1,
              },
            },
          ],
          as: 'authorList',
        },
      },
      {
        $addFields: {
          author: { $arrayElemAt: ['$authorList', 0] },
        },
      },
      {
        $project: {
          authorList: 0,
        },
      },

      // 2. Populate Media from community_post_media if embedded media is empty
      {
        $lookup: {
          from: 'community_post_media',
          let: { postIdStr: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$postId', '$$postIdStr'] },
                    { $ne: ['$isDeleted', true] },
                  ],
                },
              },
            },
          ],
          as: 'externalMedia',
        },
      },
      {
        $addFields: {
          media: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$media', []] } }, 0] },
              then: '$media',
              else: '$externalMedia',
            },
          },
        },
      },
      {
        $project: {
          externalMedia: 0,
        },
      },

      // 3. Lookup Polls
      {
        $lookup: {
          from: 'community_polls',
          let: { postIdStr: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$postId', '$$postIdStr'] },
              },
            },
          ],
          as: 'poll',
        },
      },
      {
        $unwind: {
          path: '$poll',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // 4. Populate current viewer's reaction state
    if (userId) {
      pipeline.push(
        {
          $lookup: {
            from: 'community_post_reactions',
            let: { postIdStr: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$postId', '$$postIdStr'] },
                      { $eq: ['$userId', userId] },
                    ],
                  },
                },
              },
            ],
            as: 'myReactionDoc',
          },
        },
        {
          $addFields: {
            isLikedByMe: { $gt: [{ $size: '$myReactionDoc' }, 0] },
            myReactionType: {
              $ifNull: [{ $arrayElemAt: ['$myReactionDoc.type', 0] }, null],
            },
          },
        },
        {
          $project: {
            myReactionDoc: 0,
          },
        },
      );
    } else {
      pipeline.push({
        $addFields: {
          isLikedByMe: false,
          myReactionType: null,
        },
      });
    }

    const posts = await this.postModel.aggregate(pipeline).exec();

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem.createdAt ? new Date(nextItem.createdAt).toISOString() : null;
    }

    return {
      items: posts,
      nextCursor,
    };
  }

  // Retrieve single populated post
  async findByIdPopulated(postId: string, viewerUserId?: string): Promise<any> {
    // Directly match by ID
    const single = await this.postModel.aggregate([
      {
        $match: {
          $or: [
            { _id: postId as any },
            { _id: String(postId) },
          ],
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
                role: 1,
                primaryRole: 1,
                'gamification.rank': 1,
                'gamification.level': 1,
              },
            },
          ],
          as: 'authorList',
        },
      },
      {
        $addFields: {
          author: { $arrayElemAt: ['$authorList', 0] },
        },
      },
      {
        $project: { authorList: 0 },
      },
      ...(viewerUserId
        ? [
            {
              $lookup: {
                from: 'community_post_reactions',
                let: { postIdStr: { $toString: '$_id' } },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$postId', '$$postIdStr'] },
                          { $eq: ['$userId', viewerUserId] },
                        ],
                      },
                    },
                  },
                ],
                as: 'myReactionDoc',
              },
            },
            {
              $addFields: {
                isLikedByMe: { $gt: [{ $size: '$myReactionDoc' }, 0] },
                myReactionType: {
                  $ifNull: [{ $arrayElemAt: ['$myReactionDoc.type', 0] }, null],
                },
              },
            },
            { $project: { myReactionDoc: 0 } },
          ]
        : [
            {
              $addFields: {
                isLikedByMe: false,
                myReactionType: null,
              },
            },
          ]),
    ]);

    return single[0] || null;
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

  // Toggle reaction:
  // - No reaction -> Like: creates like
  // - Like -> Like again: removes like
  // - Like -> Love: changes type to love
  async addReaction(
    postId: string,
    userId: string,
    type: string,
  ): Promise<{
    success: boolean;
    action: 'added' | 'changed' | 'removed';
    isLikedByMe: boolean;
    myReactionType: string | null;
    stats: any;
  }> {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const existing = await this.postReactionModel.findOne({ postId, userId });

    // Case 1: Same reaction -> TOGGLE OFF (Unlike)
    if (existing && existing.type === type) {
      await this.postReactionModel.deleteOne({ _id: existing._id });
      const statKey = `${type}s`;
      const updateObj: any = { $inc: { [`stats.${statKey}`]: -1 } };
      if (type === 'like') {
        updateObj.$inc['stats.likes'] = -1;
      }
      const updatedPost = await this.postModel.findByIdAndUpdate(
        postId,
        updateObj,
        { new: true },
      );
      return {
        success: true,
        action: 'removed',
        isLikedByMe: false,
        myReactionType: null,
        stats: updatedPost?.stats || post.stats,
      };
    }

    // Case 2: Different reaction -> UPDATE TYPE
    if (existing && existing.type !== type) {
      const oldType = existing.type;
      existing.type = type;
      await existing.save();

      const updateObj: any = {
        $inc: {
          [`stats.${oldType}s`]: -1,
          [`stats.${type}s`]: 1,
        },
      };
      const updatedPost = await this.postModel.findByIdAndUpdate(
        postId,
        updateObj,
        { new: true },
      );
      return {
        success: true,
        action: 'changed',
        isLikedByMe: true,
        myReactionType: type,
        stats: updatedPost?.stats || post.stats,
      };
    }

    // Case 3: No existing reaction -> CREATE NEW
    const reaction = new this.postReactionModel({ postId, userId, type });
    await reaction.save();

    const statKey = `${type}s`;
    const updateObj: any = { $inc: { [`stats.${statKey}`]: 1 } };
    if (type === 'like') {
      updateObj.$inc['stats.likes'] = 1;
    }
    const updatedPost = await this.postModel.findByIdAndUpdate(
      postId,
      updateObj,
      { new: true },
    );

    return {
      success: true,
      action: 'added',
      isLikedByMe: true,
      myReactionType: type,
      stats: updatedPost?.stats || post.stats,
    };
  }

  async removeReaction(
    postId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    action: 'removed';
    isLikedByMe: boolean;
    myReactionType: null;
    stats: any;
  }> {
    const existing = await this.postReactionModel.findOneAndDelete({
      postId,
      userId,
    });
    if (existing) {
      const statKey = `${existing.type}s`;
      const updateObj: any = { $inc: { [`stats.${statKey}`]: -1 } };
      if (existing.type === 'like') {
        updateObj.$inc['stats.likes'] = -1;
      }
      const updatedPost = await this.postModel.findByIdAndUpdate(
        postId,
        updateObj,
        { new: true },
      );
      return {
        success: true,
        action: 'removed',
        isLikedByMe: false,
        myReactionType: null,
        stats: updatedPost?.stats || {},
      };
    }

    const post = await this.postModel.findById(postId);
    return {
      success: true,
      action: 'removed',
      isLikedByMe: false,
      myReactionType: null,
      stats: post?.stats || {},
    };
  }

  // Real bookmark persistence
  async savePost(postId: string, userId: string): Promise<{ success: boolean; isSaved: boolean }> {
    const existing = await this.savedPostModel.findOne({ postId, userId });
    if (!existing) {
      await new this.savedPostModel({ postId, userId }).save();
    }
    return { success: true, isSaved: true };
  }

  async removeSavedPost(postId: string, userId: string): Promise<{ success: boolean; isSaved: boolean }> {
    await this.savedPostModel.deleteOne({ postId, userId });
    return { success: true, isSaved: false };
  }
}
