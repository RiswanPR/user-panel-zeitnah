import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  // Optimized Aggregation Pipeline to populate author, media, viewer reaction and saved state
  async findFeed(params: {
    userId?: string;
    courseIds?: string[];
    limit?: number;
    cursor?: string;
    filter?: string;
  }): Promise<{ items: any[]; nextCursor: string | null }> {
    const { userId, courseIds = [], limit = 10, cursor, filter } = params;

    const matchStage: any = {
      isDeleted: false,
    };

    if (filter === 'saved') {
      if (!userId) return { items: [], nextCursor: null };
      const savedDocs = await this.savedPostModel.find({ userId }).select('postId').lean();
      const savedPostIds = savedDocs.map((d: any) => String(d.postId)).filter(Boolean);
      if (savedPostIds.length === 0) return { items: [], nextCursor: null };
      const idMatches: any[] = [];
      for (const pid of savedPostIds) {
        idMatches.push(pid);
        if (Types.ObjectId.isValid(pid)) {
          idMatches.push(new Types.ObjectId(pid));
        }
      }
      matchStage._id = { $in: idMatches };
      matchStage.$or = [
        { audience: 'PUBLIC' },
        { authorId: userId },
        ...(courseIds.length > 0 ? [{ audience: 'COURSE', courseId: { $in: courseIds } }] : []),
      ];
    } else if (filter === 'following') {
      if (!userId) return { items: [], nextCursor: null };
      const connFilter = {
        $or: [
          { recipientId: userId, status: 'accepted' },
          { requesterId: userId, status: { $in: ['accepted', 'pending'] } },
        ],
      };
      const connections = await this.postModel.db.collection('network_connections').find(connFilter).toArray();
      const followingUserIds = connections.map((c: any) =>
        String(c.requesterId) === String(userId) ? String(c.recipientId) : String(c.requesterId)
      ).filter(Boolean);
      if (followingUserIds.length === 0) return { items: [], nextCursor: null };
      const authorMatches: any[] = [];
      for (const aid of followingUserIds) {
        authorMatches.push(aid);
        if (Types.ObjectId.isValid(aid)) {
          authorMatches.push(new Types.ObjectId(aid));
        }
      }
      matchStage.authorId = { $in: authorMatches };
    } else if (filter === 'cohort') {
      matchStage.audience = 'COURSE';
      if (courseIds.length > 0) {
        matchStage.courseId = { $in: courseIds };
      }
    } else {
      matchStage.$or = [
        { audience: 'PUBLIC' },
        ...(courseIds.length > 0 ? [{ audience: 'COURSE', courseId: { $in: courseIds } }] : []),
      ];
    }

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

      // 3.5. Lookup Original Post for Repost & Quote Post
      {
        $lookup: {
          from: 'community_posts',
          let: { origId: '$originalPostId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ['$_id', '$$origId'] },
                        { $eq: [{ $toString: '$_id' }, '$$origId'] },
                      ],
                    },
                    { $ne: ['$isDeleted', true] },
                  ],
                },
              },
            },
            // Lookup original post's author
            {
              $lookup: {
                from: 'users',
                let: { origAuthorStr: '$authorId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $or: [
                          { $eq: ['$_id', { $toObjectId: '$$origAuthorStr' }] },
                          { $eq: [{ $toString: '$_id' }, '$$origAuthorStr'] },
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
          ],
          as: 'originalPostList',
        },
      },
      {
        $addFields: {
          originalPost: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$originalPostList', []] } }, 0] },
              then: { $arrayElemAt: ['$originalPostList', 0] },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          originalPostList: 0,
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

    // 5. Populate current viewer's saved post state
    if (userId) {
      pipeline.push(
        {
          $lookup: {
            from: 'community_saved_posts',
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
            as: 'mySavedDoc',
          },
        },
        {
          $addFields: {
            isSaved: { $gt: [{ $size: '$mySavedDoc' }, 0] },
          },
        },
        {
          $project: {
            mySavedDoc: 0,
          },
        },
      );
    } else {
      pipeline.push({
        $addFields: {
          isSaved: false,
        },
      });
    }

    // 6. Populate current viewer's repost state
    if (userId) {
      pipeline.push(
        {
          $lookup: {
            from: 'community_posts',
            let: { postIdStr: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $or: [
                          { $eq: ['$originalPostId', '$$postIdStr'] },
                          { $eq: [{ $toString: '$originalPostId' }, '$$postIdStr'] },
                        ],
                      },
                      {
                        $or: [
                          { $eq: ['$authorId', userId] },
                          { $eq: [{ $toString: '$authorId' }, userId] },
                        ],
                      },
                      { $eq: ['$postType', 'repost'] },
                      { $ne: ['$isDeleted', true] },
                    ],
                  },
                },
              },
            ],
            as: 'myRepostDoc',
          },
        },
        {
          $addFields: {
            isRepostedByMe: { $gt: [{ $size: '$myRepostDoc' }, 0] },
          },
        },
        {
          $project: {
            myRepostDoc: 0,
          },
        },
      );
    } else {
      pipeline.push({
        $addFields: {
          isRepostedByMe: false,
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
    const idMatches: any[] = [postId];
    if (Types.ObjectId.isValid(postId)) {
      idMatches.push(new Types.ObjectId(postId));
    }

    const single = await this.postModel.aggregate([
      {
        $match: {
          _id: { $in: idMatches },
          isDeleted: false,
        },
      },
      // 1. Author
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
      // 4. Lookup Original Post for Repost & Quote Post
      {
        $lookup: {
          from: 'community_posts',
          let: { origId: '$originalPostId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ['$_id', '$$origId'] },
                        { $eq: [{ $toString: '$_id' }, '$$origId'] },
                      ],
                    },
                    { $ne: ['$isDeleted', true] },
                  ],
                },
              },
            },
            // Lookup original post's author
            {
              $lookup: {
                from: 'users',
                let: { origAuthorStr: '$authorId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $or: [
                          { $eq: ['$_id', { $toObjectId: '$$origAuthorStr' }] },
                          { $eq: [{ $toString: '$_id' }, '$$origAuthorStr'] },
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
          ],
          as: 'originalPostList',
        },
      },
      {
        $addFields: {
          originalPost: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$originalPostList', []] } }, 0] },
              then: { $arrayElemAt: ['$originalPostList', 0] },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          originalPostList: 0,
        },
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
            {
              $lookup: {
                from: 'community_saved_posts',
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
                as: 'mySavedDoc',
              },
            },
            {
              $addFields: {
                isSaved: { $gt: [{ $size: '$mySavedDoc' }, 0] },
              },
            },
            { $project: { mySavedDoc: 0 } },
            {
              $lookup: {
                from: 'community_posts',
                let: { postIdStr: { $toString: '$_id' } },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          {
                            $or: [
                              { $eq: ['$originalPostId', '$$postIdStr'] },
                              { $eq: [{ $toString: '$originalPostId' }, '$$postIdStr'] },
                            ],
                          },
                          {
                            $or: [
                              { $eq: ['$authorId', viewerUserId] },
                              { $eq: [{ $toString: '$authorId' }, viewerUserId] },
                            ],
                          },
                          { $eq: ['$postType', 'repost'] },
                          { $ne: ['$isDeleted', true] },
                        ],
                      },
                    },
                  },
                ],
                as: 'myRepostDoc',
              },
            },
            {
              $addFields: {
                isRepostedByMe: { $gt: [{ $size: '$myRepostDoc' }, 0] },
              },
            },
            { $project: { myRepostDoc: 0 } },
          ]
        : [
            {
              $addFields: {
                isLikedByMe: false,
                myReactionType: null,
                isSaved: false,
                isRepostedByMe: false,
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

  // Phase 3A: Repost & Quote Helpers
  async findActiveRepost(originalPostId: string, authorId: string): Promise<any> {
    const origMatches: any[] = [originalPostId];
    if (Types.ObjectId.isValid(originalPostId)) {
      origMatches.push(new Types.ObjectId(originalPostId));
    }
    const authorMatches: any[] = [authorId];
    if (Types.ObjectId.isValid(authorId)) {
      authorMatches.push(new Types.ObjectId(authorId));
    }
    return this.postModel
      .findOne({
        originalPostId: { $in: origMatches },
        authorId: { $in: authorMatches },
        postType: 'repost',
        isDeleted: { $ne: true },
      })
      .exec();
  }

  async createRepost(data: {
    originalPostId: string;
    authorId: string;
    audience?: string;
    courseId?: string;
    batchId?: string;
  }): Promise<any> {
    const origMatches: any[] = [data.originalPostId];
    if (Types.ObjectId.isValid(data.originalPostId)) {
      origMatches.push(new Types.ObjectId(data.originalPostId));
    }
    const authorMatches: any[] = [data.authorId];
    if (Types.ObjectId.isValid(data.authorId)) {
      authorMatches.push(new Types.ObjectId(data.authorId));
    }

    // Check if a soft-deleted repost already exists for this pair to avoid duplicate historical records
    const existingSoftDeleted = await this.postModel.findOne({
      originalPostId: { $in: origMatches },
      authorId: { $in: authorMatches },
      postType: 'repost',
      isDeleted: true,
    });

    if (existingSoftDeleted) {
      existingSoftDeleted.isDeleted = false;
      existingSoftDeleted.deletedAt = undefined;
      (existingSoftDeleted as any).createdAt = new Date();
      (existingSoftDeleted as any).updatedAt = new Date();
      existingSoftDeleted.audience = (data.audience as any) || 'PUBLIC';
      existingSoftDeleted.courseId = data.courseId;
      existingSoftDeleted.batchId = data.batchId;
      return existingSoftDeleted.save();
    }

    const post = new this.postModel({
      authorId: data.authorId,
      originalPostId: data.originalPostId,
      postType: 'repost',
      content: '',
      type: 'text',
      audience: data.audience || 'public',
      courseId: data.courseId,
      batchId: data.batchId,
      hashtags: [],
      mentions: [],
      tags: [],
      stats: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        reposts: 0,
      },
      isDeleted: false,
    });
    return post.save();
  }

  async removeRepost(originalPostId: string, authorId: string): Promise<boolean> {
    const origMatches: any[] = [originalPostId];
    if (Types.ObjectId.isValid(originalPostId)) {
      origMatches.push(new Types.ObjectId(originalPostId));
    }
    const authorMatches: any[] = [authorId];
    if (Types.ObjectId.isValid(authorId)) {
      authorMatches.push(new Types.ObjectId(authorId));
    }
    const res = await this.postModel.updateMany(
      {
        originalPostId: { $in: origMatches },
        authorId: { $in: authorMatches },
        postType: 'repost',
        isDeleted: { $ne: true },
      },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    return (res.modifiedCount || 0) > 0;
  }

  async adjustRepostCount(postId: string, delta: number): Promise<void> {
    const idMatches: any[] = [postId];
    if (Types.ObjectId.isValid(postId)) {
      idMatches.push(new Types.ObjectId(postId));
    }
    if (delta < 0) {
      // Prevent negative repost count
      await this.postModel.updateMany(
        { _id: { $in: idMatches }, 'stats.reposts': { $gt: 0 } },
        { $inc: { 'stats.reposts': delta } },
      );
    } else {
      await this.postModel.updateMany(
        { _id: { $in: idMatches } },
        { $inc: { 'stats.reposts': delta } },
      );
    }
  }
}
