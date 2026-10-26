import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PostType, PostAudience } from '../domain/post.model';
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

  public parseFeedCursor(cursor?: string): {
    cursorDate?: Date;
    cursorId?: string;
  } | null {
    if (!cursor || typeof cursor !== 'string') return null;
    const clean = cursor.trim();
    if (!clean || clean.startsWith('offset:')) return null;

    // Support prefixed base64 cursor (e.g. c_eyJ0Ijoi...})
    if (clean.startsWith('c_')) {
      try {
        const decoded = Buffer.from(clean.slice(2), 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        if (parsed.t) {
          const d = new Date(parsed.t);
          if (!isNaN(d.getTime())) {
            return {
              cursorDate: d,
              cursorId: parsed.id ? String(parsed.id) : undefined,
            };
          }
        }
      } catch {}
    }

    // Support compound cursor format: <isoDate>_<postId>
    if (clean.includes('_')) {
      const splitIdx = clean.indexOf('_');
      const dateStr = clean.slice(0, splitIdx);
      const idStr = clean.slice(splitIdx + 1);
      const d = new Date(dateStr);
      if (!isNaN(d.getTime()) && idStr) {
        return {
          cursorDate: d,
          cursorId: idStr,
        };
      }
    }

    // Support legacy plain ISO date string
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return {
        cursorDate: d,
      };
    }

    return null;
  }

  private async getEligiblePublicOrganizationIds(): Promise<any[]> {
    try {
      const orgCollection = this.postModel?.db?.collection('organizations');
      if (!orgCollection) return [];

      const docs = await orgCollection
        .find({
          visibility: 'PUBLIC',
          status: { $nin: ['SUSPENDED', 'REJECTED', 'DELETED'] },
          isDeleted: { $ne: true },
          $or: [{ status: 'APPROVED' }, { verificationStatus: 'VERIFIED' }],
        })
        .toArray();

      const idMatches: any[] = [];
      for (const doc of docs) {
        if (!doc || !doc._id) continue;
        const idStr = String(doc._id);
        idMatches.push(idStr);
        if (Types.ObjectId.isValid(idStr)) {
          idMatches.push(new Types.ObjectId(idStr));
        }
      }
      return idMatches;
    } catch {
      return [];
    }
  }

  // Optimized Aggregation Pipeline to populate author, media, viewer reaction and saved state
  async findFeed(params: {
    userId?: string;
    courseIds?: string[];
    limit?: number;
    cursor?: string;
    filter?: string;
    search?: string;
    tag?: string;
    organizationId?: string;
    excludedUserIds?: string[];
  }): Promise<{ items: any[]; nextCursor: string | null }> {
    const {
      userId,
      courseIds = [],
      limit = 10,
      cursor,
      filter,
      search,
      tag,
      organizationId,
      excludedUserIds = [],
    } = params;

    const matchStage: any = {
      isDeleted: false,
    };

    const appendCondition = (cond: any) => {
      if (matchStage.$and) {
        matchStage.$and.push(cond);
      } else if (matchStage.$or) {
        matchStage.$and = [{ $or: matchStage.$or }, cond];
        delete matchStage.$or;
      } else {
        matchStage.$and = [cond];
      }
    };

    if (Array.isArray(excludedUserIds) && excludedUserIds.length > 0) {
      appendCondition({ authorId: { $nin: excludedUserIds } });
    }

    const isCompanyFeed = Boolean(organizationId && organizationId.trim());

    if (isCompanyFeed) {
      const cleanOrgId = organizationId.trim();
      const orgMatches: any[] = [cleanOrgId];
      if (Types.ObjectId.isValid(cleanOrgId)) {
        orgMatches.push(new Types.ObjectId(cleanOrgId));
      }
      matchStage.organizationId = { $in: orgMatches };

      // In Company Feed, support video/reels content type filtering
      if (
        filter === 'video' ||
        filter === 'reels' ||
        filter === 'reels_trending'
      ) {
        const videoCondition = {
          $or: [{ type: 'VIDEO' }, { 'media.type': 'video' }],
        };
        appendCondition(videoCondition);
      }

      // Check if current viewer is the company creator or an active team member
      let isOrgAuthorizedViewer = false;
      if (userId && Types.ObjectId.isValid(userId)) {
        try {
          const orgFilter: any = {
            _id: Types.ObjectId.isValid(cleanOrgId)
              ? new Types.ObjectId(cleanOrgId)
              : cleanOrgId,
          };
          const orgDoc = await this.postModel.db
            .collection('organizations')
            .findOne(orgFilter);
          if (orgDoc && String(orgDoc.createdBy) === String(userId)) {
            isOrgAuthorizedViewer = true;
          } else {
            const memberFilter: any = {
              organizationId: Types.ObjectId.isValid(cleanOrgId)
                ? new Types.ObjectId(cleanOrgId)
                : cleanOrgId,
              userId: new Types.ObjectId(userId),
              status: 'ACTIVE',
            };
            const memberDoc = await this.postModel.db
              .collection('organization_memberships')
              .findOne(memberFilter);
            if (memberDoc) {
              isOrgAuthorizedViewer = true;
            }
          }
        } catch {}
      }

      // External / public visitors can strictly only see PUBLIC company posts
      if (!isOrgAuthorizedViewer) {
        appendCondition({ audience: 'PUBLIC' });
      }
    } else {
      const personalCondition = {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
          { organizationId: '' },
        ],
      };

      const personalAudience = {
        $and: [
          personalCondition,
          {
            $or: [
              { audience: 'PUBLIC' },
              ...(userId ? [{ authorId: userId }] : []),
              ...(courseIds.length > 0
                ? [{ audience: 'COURSE', courseId: { $in: courseIds } }]
                : []),
            ],
          },
        ],
      };

      if (filter === 'saved') {
        if (!userId) return { items: [], nextCursor: null };
        const savedDocs = await this.savedPostModel
          .find({ userId })
          .select('postId')
          .lean();
        const savedPostIds = savedDocs
          .map((d: any) => String(d.postId))
          .filter(Boolean);
        if (savedPostIds.length === 0) return { items: [], nextCursor: null };
        const idMatches: any[] = [];
        for (const pid of savedPostIds) {
          idMatches.push(pid);
          if (Types.ObjectId.isValid(pid)) {
            idMatches.push(new Types.ObjectId(pid));
          }
        }
        matchStage._id = { $in: idMatches };

        const eligibleOrgIds = await this.getEligiblePublicOrganizationIds();
        const companyAudience =
          eligibleOrgIds.length > 0
            ? {
                $and: [
                  { organizationId: { $in: eligibleOrgIds } },
                  { audience: 'PUBLIC' },
                ],
              }
            : null;

        const generalAudience = companyAudience
          ? { $or: [personalAudience, companyAudience] }
          : personalAudience;

        appendCondition(generalAudience);
      } else if (filter === 'following') {
        if (!userId) return { items: [], nextCursor: null };
        const userMatches: any[] = [userId];
        if (Types.ObjectId.isValid(userId)) {
          userMatches.push(new Types.ObjectId(userId));
        }

        // 1. Followed individuals from network_connections
        const connFilter = {
          $or: [
            { recipientId: { $in: userMatches }, status: 'accepted' },
            {
              requesterId: { $in: userMatches },
              status: { $in: ['accepted', 'pending'] },
            },
          ],
        };
        const connections = await this.postModel.db
          .collection('network_connections')
          .find(connFilter)
          .toArray();
        const currentUserIdStr = String(userId);
        const followingUserIds = connections
          .map((c: any) => {
            const reqStr = String(c.requesterId);
            const recStr = String(c.recipientId);
            return reqStr === currentUserIdStr ? recStr : reqStr;
          })
          .filter((id: string) => id && id !== currentUserIdStr);

        // 2. Followed public companies from organization_follows
        const followDocs = await this.postModel.db
          .collection('organization_follows')
          .find({ userId: { $in: userMatches } })
          .toArray();
        const followedOrgIdStrs = followDocs
          .map((f: any) => String(f.organizationId))
          .filter(Boolean);

        const eligibleOrgIds = await this.getEligiblePublicOrganizationIds();
        const eligibleOrgIdStrs = new Set(
          eligibleOrgIds.map((id) => String(id)),
        );

        const followedEligibleOrgIds: any[] = [];
        for (const fOrgId of followedOrgIdStrs) {
          if (eligibleOrgIdStrs.has(fOrgId)) {
            followedEligibleOrgIds.push(fOrgId);
            if (Types.ObjectId.isValid(fOrgId)) {
              followedEligibleOrgIds.push(new Types.ObjectId(fOrgId));
            }
          }
        }

        // If user follows neither individuals nor companies, return empty
        if (
          followingUserIds.length === 0 &&
          followedEligibleOrgIds.length === 0
        ) {
          return { items: [], nextCursor: null };
        }

        const authorMatches: any[] = [];
        for (const aid of followingUserIds) {
          authorMatches.push(aid);
          if (Types.ObjectId.isValid(aid)) {
            authorMatches.push(new Types.ObjectId(aid));
          }
        }

        if (authorMatches.length > 0 && followedEligibleOrgIds.length > 0) {
          const personalFollowingCondition = {
            authorId: { $in: authorMatches },
            ...personalCondition,
            $or: [
              { audience: 'PUBLIC' },
              ...(courseIds.length > 0
                ? [{ audience: 'COURSE', courseId: { $in: courseIds } }]
                : []),
            ],
          };
          const companyFollowingCondition = {
            organizationId: { $in: followedEligibleOrgIds },
            audience: 'PUBLIC',
          };
          appendCondition({
            $or: [personalFollowingCondition, companyFollowingCondition],
          });
        } else if (authorMatches.length > 0) {
          matchStage.authorId = { $in: authorMatches };
          appendCondition(personalCondition);
          appendCondition({
            $or: [
              { audience: 'PUBLIC' },
              ...(courseIds.length > 0
                ? [{ audience: 'COURSE', courseId: { $in: courseIds } }]
                : []),
            ],
          });
        } else if (followedEligibleOrgIds.length > 0) {
          matchStage.organizationId = { $in: followedEligibleOrgIds };
          appendCondition({ audience: 'PUBLIC' });
        }
      } else if (filter === 'cohort') {
        matchStage.audience = 'COURSE';
        if (courseIds.length > 0) {
          matchStage.courseId = { $in: courseIds };
        }
        appendCondition(personalCondition);
      } else if (filter === 'personal') {
        appendCondition(personalAudience);
      } else if (
        filter === 'video' ||
        filter === 'reels' ||
        filter === 'reels_trending'
      ) {
        const videoCondition = {
          $or: [{ type: 'VIDEO' }, { 'media.type': 'video' }],
        };
        appendCondition(videoCondition);

        const eligibleOrgIds = await this.getEligiblePublicOrganizationIds();
        const companyAudience =
          eligibleOrgIds.length > 0
            ? {
                $and: [
                  { organizationId: { $in: eligibleOrgIds } },
                  { audience: 'PUBLIC' },
                ],
              }
            : null;

        const generalAudience = companyAudience
          ? { $or: [personalAudience, companyAudience] }
          : personalAudience;

        appendCondition(generalAudience);
      } else {
        // General Community Feed: filter === 'all' or default / trending
        const eligibleOrgIds = await this.getEligiblePublicOrganizationIds();
        const companyAudience =
          eligibleOrgIds.length > 0
            ? {
                $and: [
                  { organizationId: { $in: eligibleOrgIds } },
                  { audience: 'PUBLIC' },
                ],
              }
            : null;

        const generalAudience = companyAudience
          ? { $or: [personalAudience, companyAudience] }
          : personalAudience;

        appendCondition(generalAudience);
      }
    }

    // Tag / Hashtag filter
    if (tag && tag.trim()) {
      const cleanTag = tag.trim().replace(/^#+/, '').toLowerCase();
      const escapedTag = cleanTag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const tagCondition = {
        $or: [
          { tags: { $in: [cleanTag, `#${cleanTag}`] } },
          { hashtags: { $in: [cleanTag, `#${cleanTag}`] } },
          { content: { $regex: `#${escapedTag}\\b`, $options: 'i' } },
        ],
      };
      appendCondition(tagCondition);
    }

    // Text search query
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const escapedSearch = cleanSearch.replace(
        /[-[\]{}()*+?.,\\^$|#\s]/g,
        '\\$&',
      );
      const searchRegex = new RegExp(escapedSearch, 'i');
      const tagForm = cleanSearch.replace(/^#+/, '').toLowerCase();
      const searchCondition = {
        $or: [
          { content: { $regex: searchRegex } },
          { tags: { $in: [tagForm, `#${tagForm}`] } },
          { hashtags: { $in: [tagForm, `#${tagForm}`] } },
        ],
      };
      appendCondition(searchCondition);
    }

    const isTrending = filter === 'trending' || filter === 'reels_trending';

    let skipCount = 0;
    if (isTrending && cursor && cursor.startsWith('offset:')) {
      skipCount = parseInt(cursor.replace('offset:', ''), 10) || 0;
    } else if (!isTrending && cursor) {
      const parsed = this.parseFeedCursor(cursor);
      if (parsed) {
        if (parsed.cursorDate && parsed.cursorId) {
          appendCondition({
            $or: [
              { createdAt: { $lt: parsed.cursorDate } },
              {
                createdAt: parsed.cursorDate,
                _id: { $lt: parsed.cursorId },
              },
            ],
          });
        } else if (parsed.cursorDate) {
          matchStage.createdAt = { $lt: parsed.cursorDate };
        }
      }
    }

    const pipeline: any[] = [
      { $match: matchStage },
      ...(isTrending
        ? [
            {
              $addFields: {
                engagementScore: {
                  $add: [
                    { $ifNull: ['$stats.likes', 0] },
                    { $ifNull: ['$stats.loves', 0] },
                    { $ifNull: ['$stats.celebrates', 0] },
                    { $ifNull: ['$stats.insightfuls', 0] },
                    { $multiply: [{ $ifNull: ['$stats.comments', 0] }, 2] },
                    { $multiply: [{ $ifNull: ['$stats.reposts', 0] }, 3] },
                    { $multiply: [{ $ifNull: ['$stats.shares', 0] }, 1.5] },
                  ],
                },
              },
            },
            { $sort: { engagementScore: -1, createdAt: -1, _id: -1 } },
            ...(skipCount > 0 ? [{ $skip: skipCount }] : []),
            { $limit: limit + 1 },
          ]
        : [{ $sort: { createdAt: -1, _id: -1 } }, { $limit: limit + 1 }]),

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

      // 1.5. Populate Organization from `organizations` collection safely (Phase 3 Company Feed)
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
                type: 1,
                industry: 1,
                status: 1,
                verificationStatus: 1,
                visibility: 1,
              },
            },
          ],
          as: 'orgList',
        },
      },
      {
        $addFields: {
          organization: {
            $cond: {
              if: {
                $and: ['$organizationId', { $gt: [{ $size: '$orgList' }, 0] }],
              },
              then: { $arrayElemAt: ['$orgList', 0] },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          orgList: 0,
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
                          {
                            $eq: [
                              '$_id',
                              {
                                $convert: {
                                  input: '$$origAuthorStr',
                                  to: 'objectId',
                                  onError: null,
                                  onNull: null,
                                },
                              },
                            ],
                          },
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
              if: {
                $gt: [{ $size: { $ifNull: ['$originalPostList', []] } }, 0],
              },
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
                          {
                            $eq: [
                              { $toString: '$originalPostId' },
                              '$$postIdStr',
                            ],
                          },
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
      posts.pop();
      if (isTrending) {
        nextCursor = `offset:${skipCount + limit}`;
      } else {
        const lastItem = posts[posts.length - 1];
        if (lastItem && lastItem.createdAt) {
          const isoDate = new Date(lastItem.createdAt).toISOString();
          const id = lastItem._id ? String(lastItem._id) : '';
          nextCursor = id ? `${isoDate}_${id}` : isoDate;
        }
      }
    }

    return {
      items: posts,
      nextCursor,
    };
  }

  // Unified Community Search: Posts, People, and Topics with verified real data
  async searchCommunity(params: {
    userId?: string;
    courseIds?: string[];
    query: string;
    type?: 'all' | 'posts' | 'people' | 'topics';
    limit?: number;
    excludedUserIds?: string[];
  }): Promise<{
    posts: any[];
    people: any[];
    topics: Array<{ tag: string; count: number }>;
  }> {
    const {
      userId,
      courseIds = [],
      query,
      type = 'all',
      limit = 10,
      excludedUserIds = [],
    } = params;
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      return { posts: [], people: [], topics: [] };
    }

    const escapedQuery = cleanQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const queryRegex = new RegExp(escapedQuery, 'i');

    const results: { posts: any[]; people: any[]; topics: any[] } = {
      posts: [],
      people: [],
      topics: [],
    };

    const tasks: Promise<void>[] = [];

    // 1. Search Posts (using findFeed pipeline for 100% full hydration & access safety)
    if (type === 'all' || type === 'posts') {
      tasks.push(
        (async () => {
          const feedResult = await this.findFeed({
            userId,
            courseIds,
            limit,
            search: cleanQuery,
            excludedUserIds,
          });
          results.posts = feedResult.items || [];
        })(),
      );
    }

    // 2. Search People
    if (type === 'all' || type === 'people') {
      tasks.push(
        (async () => {
          const userFilter: any = {
            'account_Status.isDeleted': { $ne: true },
            'account_Status.isBlocked': { $ne: true },
            profileVisibility: { $ne: 'PRIVATE' },
            $or: [
              { name: { $regex: queryRegex } },
              { username: { $regex: queryRegex } },
              { 'profile.headline': { $regex: queryRegex } },
              { headline: { $regex: queryRegex } },
              { primaryDiscipline: { $regex: queryRegex } },
              { primaryRole: { $regex: queryRegex } },
            ],
          };
          if (Array.isArray(excludedUserIds) && excludedUserIds.length > 0) {
            const excludedObjIds = excludedUserIds.map((id) =>
              Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id,
            );
            userFilter._id = { $nin: excludedObjIds };
          }
          const userMatches = await this.postModel.db
            .collection('users')
            .find(userFilter)
            .project({
              _id: 1,
              name: 1,
              username: 1,
              avatar: 1,
              role: 1,
              primaryRole: 1,
              headline: 1,
              'profile.headline': 1,
              primaryDiscipline: 1,
              'gamification.rank': 1,
              'gamification.level': 1,
            })
            .limit(limit)
            .toArray();

          const connectionMap = new Map<string, string>();
          if (userId && userMatches.length > 0) {
            const peerIds = userMatches.map((u: any) => String(u._id));
            const connDocs = await this.postModel.db
              .collection('network_connections')
              .find({
                $or: [
                  { requesterId: userId, recipientId: { $in: peerIds } },
                  { recipientId: userId, requesterId: { $in: peerIds } },
                ],
              })
              .toArray();

            for (const c of connDocs) {
              const otherId =
                String(c.requesterId) === String(userId)
                  ? String(c.recipientId)
                  : String(c.requesterId);
              if (c.status === 'accepted') {
                connectionMap.set(otherId, 'connected');
              } else if (c.status === 'pending') {
                connectionMap.set(
                  otherId,
                  String(c.requesterId) === String(userId)
                    ? 'outgoing_pending'
                    : 'incoming_pending',
                );
              }
            }
          }

          results.people = userMatches.map((u: any) => {
            const uId = String(u._id);
            return {
              _id: uId,
              id: uId,
              name: u.name || 'Zeitnah Member',
              username: u.username || '',
              avatar: u.avatar || '',
              role: u.primaryRole || u.role || 'MEMBER',
              headline:
                u.headline || u.profile?.headline || u.primaryDiscipline || '',
              connectionStatus: connectionMap.get(uId) || 'none',
              gamification: u.gamification || null,
            };
          });
        })(),
      );
    }

    // 3. Search Topics / Hashtags
    if (type === 'all' || type === 'topics') {
      tasks.push(
        (async () => {
          const audienceOr: any[] = [
            { audience: 'PUBLIC' },
            ...(courseIds.length > 0
              ? [{ audience: 'COURSE', courseId: { $in: courseIds } }]
              : []),
          ];
          if (userId) audienceOr.push({ authorId: userId });

          const topicAgg = await this.postModel.aggregate([
            {
              $match: {
                isDeleted: false,
                $or: audienceOr,
              },
            },
            {
              $project: {
                allTags: {
                  $concatArrays: [
                    { $ifNull: ['$tags', []] },
                    { $ifNull: ['$hashtags', []] },
                  ],
                },
              },
            },
            { $unwind: '$allTags' },
            {
              $project: {
                cleanTag: {
                  $toLower: {
                    $replaceAll: {
                      input: '$allTags',
                      find: '#',
                      replacement: '',
                    },
                  },
                },
              },
            },
            {
              $match: {
                cleanTag: { $regex: queryRegex },
              },
            },
            {
              $group: {
                _id: '$cleanTag',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: limit },
          ]);

          results.topics = topicAgg.map((t: any) => ({
            tag: t._id,
            count: t.count,
          }));
        })(),
      );
    }

    await Promise.all(tasks);
    return results;
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
      // 1.5. Populate Organization from `organizations` collection safely (Phase 3 Company Feed)
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
                type: 1,
                industry: 1,
                status: 1,
                verificationStatus: 1,
                visibility: 1,
              },
            },
          ],
          as: 'orgList',
        },
      },
      {
        $addFields: {
          organization: {
            $cond: {
              if: {
                $and: ['$organizationId', { $gt: [{ $size: '$orgList' }, 0] }],
              },
              then: { $arrayElemAt: ['$orgList', 0] },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          orgList: 0,
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
                          {
                            $eq: [
                              '$_id',
                              {
                                $convert: {
                                  input: '$$origAuthorStr',
                                  to: 'objectId',
                                  onError: null,
                                  onNull: null,
                                },
                              },
                            ],
                          },
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
              if: {
                $gt: [{ $size: { $ifNull: ['$originalPostList', []] } }, 0],
              },
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
                              {
                                $eq: [
                                  { $toString: '$originalPostId' },
                                  '$$postIdStr',
                                ],
                              },
                            ],
                          },
                          {
                            $or: [
                              { $eq: ['$authorId', viewerUserId] },
                              {
                                $eq: [{ $toString: '$authorId' }, viewerUserId],
                              },
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

  async replaceMedia(
    postId: string,
    mediaData: Partial<PostMedia>[],
  ): Promise<void> {
    const cleanPostId = String(postId);
    const existing = await this.postMediaModel
      .find({ postId: cleanPostId })
      .lean()
      .exec();

    try {
      await this.postMediaModel.deleteMany({ postId: cleanPostId });
      if (Array.isArray(mediaData) && mediaData.length > 0) {
        await this.postMediaModel.insertMany(mediaData);
      }
    } catch (err) {
      if (existing.length > 0) {
        try {
          await this.postMediaModel.deleteMany({ postId: cleanPostId });
          await this.postMediaModel.insertMany(existing);
        } catch {}
      }
      throw err;
    }
  }

  async findMediaByPostId(postId: string): Promise<PostMedia[]> {
    if (!postId) return [];
    return this.postMediaModel
      .find({ postId: String(postId), isDeleted: { $ne: true } })
      .lean()
      .exec();
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
    reactionId?: string;
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
        { returnDocument: 'after' },
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
        { returnDocument: 'after' },
      );
      return {
        success: true,
        action: 'changed',
        isLikedByMe: true,
        myReactionType: type,
        stats: updatedPost?.stats || post.stats,
        reactionId: existing._id ? String(existing._id) : undefined,
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
      { returnDocument: 'after' },
    );

    return {
      success: true,
      action: 'added',
      isLikedByMe: true,
      myReactionType: type,
      stats: updatedPost?.stats || post.stats,
      reactionId: reaction._id ? String(reaction._id) : undefined,
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
        { returnDocument: 'after' },
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
  async savePost(
    postId: string,
    userId: string,
  ): Promise<{ success: boolean; isSaved: boolean }> {
    const existing = await this.savedPostModel.findOne({ postId, userId });
    if (!existing) {
      await new this.savedPostModel({ postId, userId }).save();
    }
    return { success: true, isSaved: true };
  }

  async removeSavedPost(
    postId: string,
    userId: string,
  ): Promise<{ success: boolean; isSaved: boolean }> {
    await this.savedPostModel.deleteOne({ postId, userId });
    return { success: true, isSaved: false };
  }

  // Phase 3A: Repost & Quote Helpers
  async findActiveRepost(
    originalPostId: string,
    authorId: string,
  ): Promise<any> {
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

    // Canonical enum values — always uppercase, always valid
    const audienceEnum = (
      data.audience || PostAudience.PUBLIC
    ).toUpperCase() as PostAudience;
    const typeEnum = PostType.TEXT; // Repost documents always use TEXT

    // Check if a soft-deleted repost already exists for this pair to reuse the document
    const existingSoftDeleted = await this.postModel
      .findOne({
        originalPostId: { $in: origMatches },
        authorId: { $in: authorMatches },
        postType: 'repost',
        isDeleted: true,
      })
      .lean()
      .exec();

    if (existingSoftDeleted) {
      // Use findOneAndUpdate with $set to bypass Mongoose document setter/validator
      // on documents that may have been stored with pre-fix lowercase enum values.
      // $set writes the canonical uppercase values directly to MongoDB, guaranteed valid.
      const revived = await this.postModel
        .findOneAndUpdate(
          { _id: (existingSoftDeleted as any)._id },
          {
            $set: {
              isDeleted: false,
              type: typeEnum,
              audience: audienceEnum,
              courseId: data.courseId ?? null,
              batchId: data.batchId ?? null,
            },
            $unset: {
              deletedAt: '',
            },
          },
          {
            returnDocument: 'after', // return the updated document
            runValidators: true, // validate with canonical values AFTER $set
          },
        )
        .exec();
      return revived;
    }

    // No soft-deleted document exists — create a fresh repost record
    const post = new this.postModel({
      authorId: data.authorId,
      originalPostId: data.originalPostId,
      postType: 'repost',
      content: '',
      type: typeEnum,
      audience: audienceEnum,
      courseId: data.courseId,
      batchId: data.batchId,
      hashtags: [],
      mentions: [],
      tags: [],
      stats: {
        likes: 0,
        loves: 0,
        celebrates: 0,
        insightfuls: 0,
        comments: 0,
        shares: 0,
        views: 0,
        reposts: 0,
      },
      isDeleted: false,
    });
    return post.save();
  }

  async removeRepost(
    originalPostId: string,
    authorId: string,
  ): Promise<boolean> {
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

  async updateStats(
    id: string,
    stat: string,
    increment: number,
  ): Promise<void> {
    const idMatches: any[] = [id];
    if (Types.ObjectId.isValid(id)) {
      idMatches.push(new Types.ObjectId(id));
    }
    await this.postModel.updateMany(
      { _id: { $in: idMatches } },
      { $inc: { [`stats.${String(stat)}`]: increment } },
    );
  }

  async getCreatorInsights(userId: string): Promise<{
    overview: {
      totalPosts: number;
      totalReels: number;
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReposts: number;
      totalFollowers: number;
    };
    topPosts: any[];
  }> {
    const authorMatches: any[] = [userId];
    if (Types.ObjectId.isValid(userId)) {
      authorMatches.push(new Types.ObjectId(userId));
    }

    const matchFilter: any = {
      authorId: { $in: authorMatches },
      isDeleted: { $ne: true },
    };

    const [statsResult, topPostsResult, followersCount] = await Promise.all([
      this.postModel.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalReels: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$type', 'VIDEO'] },
                      {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: { $ifNull: ['$media', []] },
                                as: 'm',
                                cond: { $eq: ['$$m.type', 'video'] },
                              },
                            },
                          },
                          0,
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalViews: { $sum: { $ifNull: ['$stats.views', 0] } },
            totalLikes: {
              $sum: {
                $add: [
                  { $ifNull: ['$stats.likes', 0] },
                  { $ifNull: ['$stats.loves', 0] },
                  { $ifNull: ['$stats.celebrates', 0] },
                  { $ifNull: ['$stats.insightfuls', 0] },
                ],
              },
            },
            totalComments: { $sum: { $ifNull: ['$stats.comments', 0] } },
            totalShares: { $sum: { $ifNull: ['$stats.shares', 0] } },
            totalReposts: { $sum: { $ifNull: ['$stats.reposts', 0] } },
          },
        },
      ]),
      this.postModel
        .find(matchFilter)
        .sort({ 'stats.views': -1, createdAt: -1 })
        .limit(3)
        .select('_id content type media stats createdAt audience postType')
        .lean(),
      this.postModel.db
        .collection('network_connections')
        .countDocuments({
          $or: [
            { recipientId: userId, status: 'accepted' },
            ...(Types.ObjectId.isValid(userId)
              ? [
                  {
                    recipientId: new Types.ObjectId(userId),
                    status: 'accepted',
                  },
                ]
              : []),
          ],
        })
        .catch(() => 0),
    ]);

    const stats = statsResult[0] || {
      totalPosts: 0,
      totalReels: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalReposts: 0,
    };

    return {
      overview: {
        totalPosts: stats.totalPosts || 0,
        totalReels: stats.totalReels || 0,
        totalViews: stats.totalViews || 0,
        totalLikes: stats.totalLikes || 0,
        totalComments: stats.totalComments || 0,
        totalShares: stats.totalShares || 0,
        totalReposts: stats.totalReposts || 0,
        totalFollowers: followersCount || 0,
      },
      topPosts: topPostsResult || [],
    };
  }
}
