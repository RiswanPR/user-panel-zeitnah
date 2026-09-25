import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LearningSpace,
  LearningSpaceDocument,
} from '../schemas/learning-space.schema';
import { Community, CommunityDocument } from '../schemas/community.schema';
import {
  CommunityMembership,
  CommunityMembershipDocument,
} from '../schemas/community-membership.schema';
import {
  CommunityDiscussion,
  CommunityDiscussionDocument,
} from '../schemas/community-discussion.schema';
import {
  CommunityReply,
  CommunityReplyDocument,
} from '../schemas/community-reply.schema';
import {
  CommunityAnnouncement,
  CommunityAnnouncementDocument,
} from '../schemas/community-announcement.schema';
import {
  CommunityResource,
  CommunityResourceDocument,
} from '../schemas/community-resource.schema';
import { User, UserDocument } from '../../auth/schemas/user.schema';
import {
  Notification,
  NotificationDocument,
} from '../../notifications/notification.schema';
import {
  CreateDiscussionDto,
  CreateReplyDto,
  CreateSpaceAnnouncementDto,
  CreateResourceDto,
} from '../dto/learning-space.dto';
import { escapeRegex, sanitizeText } from '../../../common/utils/regex.util';

@Injectable()
export class LearningSpacesService {
  constructor(
    @InjectModel(LearningSpace.name)
    private spaceModel: Model<LearningSpaceDocument>,
    @InjectModel(Community.name)
    private communityModel: Model<CommunityDocument>,
    @InjectModel(CommunityMembership.name)
    private membershipModel: Model<CommunityMembershipDocument>,
    @InjectModel(CommunityDiscussion.name)
    private discussionModel: Model<CommunityDiscussionDocument>,
    @InjectModel(CommunityReply.name)
    private replyModel: Model<CommunityReplyDocument>,
    @InjectModel(CommunityAnnouncement.name)
    private announcementModel: Model<CommunityAnnouncementDocument>,
    @InjectModel(CommunityResource.name)
    private resourceModel: Model<CommunityResourceDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ID format');
  }

  /**
   * Resolve a LearningSpace by ID, code, or linked community slug/ID
   */
  async resolveSpace(idOrSlug: string): Promise<LearningSpaceDocument> {
    let space: LearningSpaceDocument | null = null;

    if (Types.ObjectId.isValid(idOrSlug)) {
      space = await this.spaceModel.findById(idOrSlug);
      if (!space) {
        space = await this.spaceModel.findOne({
          communityId: new Types.ObjectId(idOrSlug),
        });
      }
    }

    if (!space) {
      space = await this.spaceModel.findOne({ code: idOrSlug.toUpperCase() });
    }

    if (!space) {
      const community = await this.communityModel.findOne({
        slug: idOrSlug.toLowerCase(),
      });
      if (community) {
        space = await this.spaceModel.findOne({ communityId: community._id });
        if (!space) {
          // Virtual space mapping if community exists without learning_spaces record
          return {
            _id: community._id,
            name: community.name,
            code: community.slug.toUpperCase(),
            description: community.description,
            category: 'Study Group',
            coverImage: community.coverImage,
            status: community.status,
            accessMode:
              community.visibility === 'public' ? 'open' : 'restricted',
            teachers: [],
            communityId: community._id,
            courseId: community.courseId,
            memberCount: community.memberCount,
            tags: community.topics,
          } as any;
        }
      }
    }

    if (!space) {
      throw new NotFoundException('Learning Space not found');
    }

    return space;
  }

  /**
   * Check if user is authorized to access a space
   */
  async checkSpaceAccess(
    space: LearningSpaceDocument,
    userId: string,
    role: string,
  ): Promise<{
    isMember: boolean;
    userRole: string;
    isTeacher: boolean;
    isAdmin: boolean;
  }> {
    const isAdmin = role === 'admin' || role === 'superuser';
    const userObjId = this.toObjectId(userId);

    const isTeacher =
      Array.isArray(space.teachers) &&
      space.teachers.some((t: any) =>
        t instanceof Types.ObjectId
          ? t.equals(userObjId)
          : String(t) === String(userId),
      );

    let isMember = false;
    let userRole = 'none';

    if (space.communityId) {
      const membership = await this.membershipModel.findOne({
        communityId: space.communityId,
        userId: userObjId,
        status: 'active',
      });
      if (membership) {
        isMember = true;
        userRole = membership.role;
      }
    }

    if (!isMember && (isTeacher || isAdmin)) {
      isMember = true;
      userRole = isTeacher ? 'moderator' : 'owner';
    }

    const isRestricted =
      space.accessMode === 'restricted' || space.accessMode === 'invite_only';
    if (isRestricted && !isMember && !isTeacher && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to access this Learning Space.',
      );
    }

    return { isMember, userRole, isTeacher, isAdmin };
  }

  /**
   * List Learning Spaces for the current user
   */
  async getSpaces(userId: string, role: string, query: any) {
    const userObjId = this.toObjectId(userId);
    const filter = query.filter || 'all';
    const search = (query.q || '').trim();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const userMemberships = await this.membershipModel
      .find(
        { userId: userObjId, status: 'active' },
        { communityId: 1, role: 1 },
      )
      .lean();
    const joinedCommunityIds = userMemberships.map((m) => m.communityId);

    const matchConditions: any = { status: { $ne: 'archived' } };

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      matchConditions.$or = [
        { name: regex },
        { code: regex },
        { description: regex },
        { tags: regex },
      ];
    }

    if (query.category) {
      matchConditions.category = query.category;
    }

    if (filter === 'joined') {
      matchConditions.$or = [
        { communityId: { $in: joinedCommunityIds } },
        { teachers: userObjId },
        { ownerId: userObjId },
      ];
    } else if (role === 'student' && filter !== 'discover') {
      matchConditions.$or = [
        { communityId: { $in: joinedCommunityIds } },
        { accessMode: 'open' },
      ];
    } else if (role === 'teacher' && filter !== 'discover') {
      matchConditions.$or = [
        { teachers: userObjId },
        { ownerId: userObjId },
        { accessMode: 'open' },
      ];
    }

    const total = await this.spaceModel.countDocuments(matchConditions);
    const spaces = await this.spaceModel
      .find(matchConditions)
      .populate('teachers', 'name email profileImage avatar')
      .populate('courseId', 'name title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const membershipMap = new Map(
      userMemberships.map((m) => [String(m.communityId), m.role]),
    );

    const enrichedSpaces = spaces.map((space) => {
      const isAssignedTeacher =
        Array.isArray(space.teachers) &&
        space.teachers.some((t: any) => String(t?._id || t) === String(userId));
      const roleInComm = space.communityId
        ? membershipMap.get(String(space.communityId))
        : null;

      const isMember = Boolean(
        roleInComm || isAssignedTeacher || role === 'admin',
      );
      const userRole =
        roleInComm ||
        (isAssignedTeacher ? 'moderator' : role === 'admin' ? 'owner' : 'none');

      return {
        ...space,
        isMember,
        userRole,
      };
    });

    return {
      spaces: enrichedSpaces,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single Learning Space details
   */
  async getSpaceDetails(idOrSlug: string, userId: string, role: string) {
    const space = await this.resolveSpace(idOrSlug);
    const access = await this.checkSpaceAccess(space, userId, role);

    const populatedSpace: any = await this.spaceModel
      .findById(space._id)
      .populate('teachers', 'name email profileImage avatar')
      .populate('courseId', 'name title')
      .lean();

    let community: any = null;
    if (space.communityId) {
      community = await this.communityModel.findById(space.communityId).lean();
    }

    return {
      ...(populatedSpace || space),
      community,
      access,
    };
  }

  /**
   * Join a Learning Space / Community
   */
  async joinSpace(idOrSlug: string, userId: string) {
    const space = await this.resolveSpace(idOrSlug);
    if (space.accessMode === 'restricted') {
      throw new ForbiddenException(
        'This Learning Space is restricted. Request an invitation from faculty or admin.',
      );
    }

    const userObjId = this.toObjectId(userId);
    const communityId = space.communityId || space._id;

    await this.membershipModel.updateOne(
      { communityId, userId: userObjId },
      {
        $setOnInsert: {
          communityId,
          userId: userObjId,
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
        },
      },
      { upsert: true },
    );

    await this.spaceModel.updateOne(
      { _id: space._id },
      { $inc: { memberCount: 1 } },
    );
    if (space.communityId) {
      await this.communityModel.updateOne(
        { _id: space.communityId },
        { $inc: { memberCount: 1 } },
      );
    }

    return { success: true, message: 'Successfully joined Learning Space' };
  }

  /**
   * Leave a Learning Space / Community
   */
  async leaveSpace(idOrSlug: string, userId: string) {
    const space = await this.resolveSpace(idOrSlug);
    const userObjId = this.toObjectId(userId);
    const communityId = space.communityId || space._id;

    const result = await this.membershipModel.deleteOne({
      communityId,
      userId: userObjId,
    });

    if (result.deletedCount > 0) {
      await this.spaceModel.updateOne(
        { _id: space._id, memberCount: { $gt: 0 } },
        { $inc: { memberCount: -1 } },
      );
      if (space.communityId) {
        await this.communityModel.updateOne(
          { _id: space.communityId, memberCount: { $gt: 0 } },
          { $inc: { memberCount: -1 } },
        );
      }
    }

    return { success: true, message: 'Successfully left Learning Space' };
  }

  /**
   * Get Space Announcements
   */
  async getAnnouncements(idOrSlug: string, userId: string, role: string) {
    const space = await this.resolveSpace(idOrSlug);
    await this.checkSpaceAccess(space, userId, role);

    const communityId = space.communityId || space._id;
    const announcements = await this.announcementModel
      .find({ communityId })
      .populate('authorId', 'name email avatar profileImage role')
      .sort({ pinned: -1, createdAt: -1 })
      .lean();

    return announcements;
  }

  /**
   * Create Space Announcement (Teachers assigned to space, moderators, or admins)
   */
  async createAnnouncement(
    idOrSlug: string,
    userId: string,
    role: string,
    dto: CreateSpaceAnnouncementDto,
  ) {
    const space = await this.resolveSpace(idOrSlug);
    const access = await this.checkSpaceAccess(space, userId, role);

    if (
      !access.isAdmin &&
      !access.isTeacher &&
      access.userRole !== 'owner' &&
      access.userRole !== 'moderator'
    ) {
      throw new ForbiddenException(
        'Only assigned teachers or moderators can create announcements.',
      );
    }

    const communityId = space.communityId || space._id;
    const userObjId = this.toObjectId(userId);

    const announcement = await this.announcementModel.create({
      communityId,
      authorId: userObjId,
      title: sanitizeText(dto.title),
      content: sanitizeText(dto.content),
      pinned: Boolean(dto.pinned),
    });

    // Send notifications to all active members of this space
    const members = await this.membershipModel
      .find(
        { communityId, status: 'active', userId: { $ne: userObjId } },
        { userId: 1 },
      )
      .lean();

    if (members.length > 0) {
      const notifDocs = members.map((m) => ({
        recipientId: m.userId,
        actorId: userObjId,
        type: 'space_announcement',
        category: 'spaces',
        priority: 'MEDIUM',
        title: `New announcement in ${space.name}`,
        message: dto.title,
        isRead: false,
        targetUrl: `/network/spaces/${space.code || space._id}?tab=announcements`,
      }));
      await this.notificationModel
        .insertMany(notifDocs, { ordered: false })
        .catch(() => {});
    }

    return announcement;
  }

  /**
   * Get Space Discussions
   */
  async getDiscussions(
    idOrSlug: string,
    userId: string,
    role: string,
    query: any,
  ) {
    const space = await this.resolveSpace(idOrSlug);
    await this.checkSpaceAccess(space, userId, role);

    const communityId = space.communityId || space._id;
    const filterConditions: any = { communityId, status: { $ne: 'removed' } };

    if (query.type) {
      filterConditions.type = query.type;
    }

    if (query.q) {
      const regex = new RegExp(escapeRegex(query.q), 'i');
      filterConditions.$or = [{ title: regex }, { body: regex }];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const total = await this.discussionModel.countDocuments(filterConditions);
    const discussions = await this.discussionModel
      .find(filterConditions)
      .populate('authorId', 'name email avatar profileImage role')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      discussions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Create Space Discussion
   */
  async createDiscussion(
    idOrSlug: string,
    userId: string,
    role: string,
    dto: CreateDiscussionDto,
  ) {
    const space = await this.resolveSpace(idOrSlug);
    await this.checkSpaceAccess(space, userId, role);

    const communityId = space.communityId || space._id;
    const userObjId = this.toObjectId(userId);

    const discussion = await this.discussionModel.create({
      communityId,
      authorId: userObjId,
      title: sanitizeText(dto.title),
      body: sanitizeText(dto.body),
      type: (dto.type as any) || 'discussion',
      status: 'published',
    });

    if (space.communityId) {
      await this.communityModel.updateOne(
        { _id: space.communityId },
        { $inc: { discussionCount: 1 } },
      );
    }

    return discussion;
  }

  /**
   * Get single discussion detail
   */
  async getDiscussionDetail(
    discussionId: string,
    userId: string,
    role: string,
  ) {
    const discObjId = this.toObjectId(discussionId);
    const discussion = await this.discussionModel
      .findById(discObjId)
      .populate('authorId', 'name email avatar profileImage role')
      .lean();

    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found');
    }

    const space = await this.spaceModel.findOne({
      communityId: discussion.communityId,
    });
    if (space) {
      await this.checkSpaceAccess(space, userId, role);
    }

    return { ...discussion, space };
  }

  /**
   * Get discussion replies
   */
  async getReplies(
    discussionId: string,
    userId: string,
    role: string,
    query: any,
  ) {
    const discObjId = this.toObjectId(discussionId);
    const discussion = await this.discussionModel.findById(discObjId);
    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found');
    }

    const space = await this.spaceModel.findOne({
      communityId: discussion.communityId,
    });
    if (space) {
      await this.checkSpaceAccess(space, userId, role);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 30), 100);
    const skip = (page - 1) * limit;

    const total = await this.replyModel.countDocuments({
      discussionId: discObjId,
      status: { $ne: 'removed' },
    });

    const replies = await this.replyModel
      .find({ discussionId: discObjId, status: { $ne: 'removed' } })
      .populate('authorId', 'name email avatar profileImage role')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      replies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Post a reply
   */
  async createReply(
    discussionId: string,
    userId: string,
    role: string,
    dto: CreateReplyDto,
  ) {
    const discObjId = this.toObjectId(discussionId);
    const discussion = await this.discussionModel.findById(discObjId);
    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found');
    }
    if (discussion.status === 'locked') {
      throw new ForbiddenException(
        'This discussion is locked and cannot receive replies.',
      );
    }

    const space = await this.spaceModel.findOne({
      communityId: discussion.communityId,
    });
    if (space) {
      await this.checkSpaceAccess(space, userId, role);
    }

    const userObjId = this.toObjectId(userId);
    const reply = await this.replyModel.create({
      discussionId: discObjId,
      communityId: discussion.communityId,
      authorId: userObjId,
      body: sanitizeText(dto.body),
      status: 'published',
    });

    await this.discussionModel.updateOne(
      { _id: discObjId },
      { $inc: { replyCount: 1 } },
    );

    // Notify discussion author if someone else replies
    if (discussion.authorId && !discussion.authorId.equals(userObjId)) {
      await this.notificationModel
        .create({
          recipientId: discussion.authorId,
          actorId: userObjId,
          type: 'discussion_reply',
          category: 'discussions',
          priority: 'LOW',
          title: 'New reply on your discussion',
          message: discussion.title,
          isRead: false,
          targetUrl: `/network/spaces/${space?.code || space?._id}/discussions/${discussion._id}`,
        })
        .catch(() => {});
    }

    return reply;
  }

  /**
   * Get Space Resources
   */
  async getResources(idOrSlug: string, userId: string, role: string) {
    const space = await this.resolveSpace(idOrSlug);
    await this.checkSpaceAccess(space, userId, role);

    const communityId = space.communityId || space._id;
    return this.resourceModel
      .find({ communityId })
      .populate('createdBy', 'name email avatar profileImage')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Create Space Resource
   */
  async createResource(
    idOrSlug: string,
    userId: string,
    role: string,
    dto: CreateResourceDto,
  ) {
    const space = await this.resolveSpace(idOrSlug);
    await this.checkSpaceAccess(space, userId, role);

    const communityId = space.communityId || space._id;
    const userObjId = this.toObjectId(userId);

    return this.resourceModel.create({
      communityId,
      title: sanitizeText(dto.title),
      description: sanitizeText(dto.description || ''),
      type: (dto.type as any) || 'link',
      url: dto.url || '',
      targetId: dto.targetId || '',
      createdBy: userObjId,
    });
  }

  /**
   * Get Space Members
   */
  async getMembers(idOrSlug: string, userId: string, role: string, query: any) {
    const space = await this.resolveSpace(idOrSlug);
    await this.checkSpaceAccess(space, userId, role);

    const communityId = space.communityId || space._id;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const total = await this.membershipModel.countDocuments({
      communityId,
      status: 'active',
    });

    const members = await this.membershipModel
      .find({ communityId, status: 'active' })
      .populate('userId', 'name email avatar profileImage role')
      .sort({ role: 1, joinedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
