import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Community, CommunityDocument } from './schemas/community.schema';
import {
  CommunityMembership,
  CommunityMembershipDocument,
} from './schemas/community-membership.schema';
import {
  CommunityDiscussion,
  CommunityDiscussionDocument,
} from './schemas/community-discussion.schema';
import {
  CommunityReply,
  CommunityReplyDocument,
  ReplyStatus,
} from './schemas/community-reply.schema';
import {
  CommunityAnnouncement,
  CommunityAnnouncementDocument,
} from './schemas/community-announcement.schema';
import {
  CommunityResource,
  CommunityResourceDocument,
} from './schemas/community-resource.schema';
import {
  CommunityReport,
  CommunityReportDocument,
} from './schemas/community-report.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { NetworkService } from './network.service';
import {
  CommunityRole,
  MembershipStatus,
} from './schemas/community-membership.schema';
import {
  GetCommunitiesQueryDto,
  CreateDiscussionDto,
  UpdateDiscussionDto,
  CreateReplyDto,
  CreateAnnouncementDto,
  CreateResourceDto,
  CreateReportDto,
  CommunityResponseItem,
  PaginatedCommunitiesResponse,
  CommunityDetailResponse,
  DiscussionResponseItem,
  DiscussionDetailResponse,
  ReplyResponseItem,
  AnnouncementResponseItem,
  ResourceResponseItem,
  DiscussionAuthor,
} from './dto/community.dto';

interface UserMeta {
  _id: Types.ObjectId;
  name?: string;
  username?: string;
  avatar?: string;
  headline?: string;
  currentRole?: string;
  account_Status?: {
    isVerified?: boolean;
    isBlocked?: boolean;
    isDeleted?: boolean;
  };
  course?: Array<{ courseName: string }>;
  skills?: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    @InjectModel(Community.name)
    private readonly communityModel: Model<CommunityDocument>,
    @InjectModel(CommunityMembership.name)
    private readonly membershipModel: Model<CommunityMembershipDocument>,
    @InjectModel(CommunityDiscussion.name)
    private readonly discussionModel: Model<CommunityDiscussionDocument>,
    @InjectModel(CommunityReply.name)
    private readonly replyModel: Model<CommunityReplyDocument>,
    @InjectModel(CommunityAnnouncement.name)
    private readonly announcementModel: Model<CommunityAnnouncementDocument>,
    @InjectModel(CommunityResource.name)
    private readonly resourceModel: Model<CommunityResourceDocument>,
    @InjectModel(CommunityReport.name)
    private readonly reportModel: Model<CommunityReportDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    private readonly signedUrlService: SignedUrlService,
    private readonly networkService: NetworkService,
  ) {}

  /**
   * Bootstraps official initial learning communities derived from real LMS courses
   * and subjects if the collection is empty.
   */
  async bootstrapInitialCommunities(): Promise<void> {
    try {
      const count = await this.communityModel.estimatedDocumentCount();
      if (count > 0) return;

      this.logger.log('Initializing official Zeitnah learning communities...');

      // Find an eligible creator (admin or first student)
      const creator = await this.userModel.findOne().select('_id').exec();
      const creatorId = creator?._id || new Types.ObjectId();

      // Find existing courses to associate
      const courses = await this.courseModel
        .find()
        .select('_id name description')
        .limit(5)
        .exec();

      const initialCommunities = [
        {
          name: 'Web Development',
          slug: 'web-development',
          description:
            'A focused learning space for students building with modern web technologies, React, TypeScript, Node.js, and cloud architectures.',
          type: 'COURSE' as const,
          courseId: courses[0]?._id,
          topics: ['JavaScript', 'React', 'Node.js', 'Frontend', 'Backend'],
          visibility: 'public' as const,
          status: 'active' as const,
          creatorId,
          rules: [
            'Stay collaborative and help each other debug code.',
            'Share learning resources and project breakthroughs.',
            'Keep discussions centered on web engineering.',
            'No spam or commercial promotions.',
          ],
        },
        {
          name: 'Computer Science Fundamentals',
          slug: 'computer-science',
          description:
            'Deepen your understanding of data structures, algorithms, system design, and foundational computing principles.',
          type: 'SUBJECT' as const,
          topics: ['Algorithms', 'Data Structures', 'C++', 'Python', 'Systems'],
          visibility: 'public' as const,
          status: 'active' as const,
          creatorId,
          rules: [
            'Encourage problem-solving and algorithmic thinking.',
            'Avoid sharing direct homework solutions without explanation.',
            'Keep conversations rigorous and respectful.',
          ],
        },
        {
          name: 'UI/UX & Product Design',
          slug: 'ui-ux-design',
          description:
            'Explore modern design systems, user research, wireframing, Figma craft, and intuitive user experiences.',
          type: 'INTEREST' as const,
          topics: [
            'Figma',
            'Design Systems',
            'UX Research',
            'Typography',
            'Prototyping',
          ],
          visibility: 'public' as const,
          status: 'active' as const,
          creatorId,
          rules: [
            'Constructive critique only.',
            'Credit original designers when sharing inspiration.',
            'Share practical design patterns and case studies.',
          ],
        },
        {
          name: 'Study Together & Momentum',
          slug: 'study-together',
          description:
            'Accountability, study streak check-ins, study schedules, and community motivation for active learners.',
          type: 'GOAL' as const,
          topics: ['Study Habits', 'Focus', 'Streaks', 'Productivity'],
          visibility: 'public' as const,
          status: 'active' as const,
          creatorId,
          rules: [
            'Celebrate daily study consistency and milestones.',
            'Be respectful of everyone’s individual learning pace.',
            'Keep each other accountable with positive encouragement.',
          ],
        },
      ];

      for (const item of initialCommunities) {
        const comm = await this.communityModel.create(item);
        // Add creator as owner
        await this.membershipModel.create({
          communityId: comm._id,
          userId: creatorId,
          role: 'owner',
          status: 'active',
        });
        await this.communityModel.updateOne(
          { _id: comm._id },
          { $set: { memberCount: 1 } },
        );
      }

      this.logger.log(
        'Official learning communities initialized successfully.',
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to bootstrap initial communities: ${err instanceof Error ? err.message : JSON.stringify(err)}`,
      );
    }
  }

  /**
   * Helper: Resolves a DiscussionAuthor object with signed avatar.
   */
  private async resolveAuthor(
    user?: UserMeta | UserDocument | null,
  ): Promise<DiscussionAuthor> {
    if (!user) {
      return {
        id: '',
        name: 'Student',
        username: '',
        avatarUrl: '',
        headline: '',
        isVerified: false,
      };
    }

    let avatarUrl = '';
    if (user.avatar) {
      try {
        avatarUrl = await this.signedUrlService.generateSignedImageUrl(
          user.avatar,
        );
      } catch {
        avatarUrl = '';
      }
    }

    const userIdStr = user._id ? user._id.toString() : '';

    return {
      id: userIdStr,
      name: user.name || 'Student',
      username: user.username || '',
      avatarUrl,
      headline: user.headline || user.currentRole || '',
      isVerified: Boolean(user.account_Status?.isVerified),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMMUNITY DISCOVERY & DIRECTORY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves communities with search, filtering, deterministic recommendations,
   * caller membership state, and server-side pagination.
   */
  async getCommunities(
    query: GetCommunitiesQueryDto,
    currentUserId?: string,
  ): Promise<PaginatedCommunitiesResponse> {
    await this.bootstrapInitialCommunities();

    const filter: Record<string, unknown> = {
      status: 'active',
    };

    // Filter by type (normalize to uppercase, ignore if ALL)
    if (query.type) {
      const cleanType = query.type.toUpperCase();
      if (cleanType !== 'ALL') {
        filter.type = cleanType;
      }
    }

    // Filter by text search (name, description, topics)
    if (query.q && query.q.trim()) {
      const qClean = escapeRegex(query.q.trim());
      filter.$or = [
        { name: { $regex: qClean, $options: 'i' } },
        { description: { $regex: qClean, $options: 'i' } },
        { topics: { $regex: qClean, $options: 'i' } },
      ];
    }

    // "joined" / "myCommunities" filter: only communities current user belongs to
    let userJoinedCommunityIds: Types.ObjectId[] = [];
    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const userMemberships = await this.membershipModel
        .find({
          userId: new Types.ObjectId(currentUserId),
          status: 'active',
        })
        .select('communityId role status')
        .lean();
      userJoinedCommunityIds = userMemberships.map((m) => m.communityId);

      if (query.filter === 'joined' || query.myCommunities === 'true') {
        filter._id = { $in: userJoinedCommunityIds };
      }
    } else if (query.filter === 'joined' || query.myCommunities === 'true') {
      return {
        data: [],
        page: 1,
        limit: query.limit || 12,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      };
    }

    // Visibility boundary: do not expose private communities unless caller is a member
    if (!filter._id) {
      if (userJoinedCommunityIds.length > 0) {
        filter.$and = [
          {
            $or: [
              { visibility: { $in: ['public', 'restricted'] } },
              { _id: { $in: userJoinedCommunityIds } },
            ],
          },
        ];
      } else {
        filter.visibility = { $in: ['public', 'restricted'] };
      }
    }

    // Sorting
    const activeSort = query.sort || query.filter;
    let sortObj: Record<string, 1 | -1> = { memberCount: -1, createdAt: -1 };
    if (activeSort === 'popular') {
      sortObj = { memberCount: -1, discussionCount: -1 };
    } else if (activeSort === 'newest') {
      sortObj = { createdAt: -1 };
    } else if (activeSort === 'active') {
      sortObj = { updatedAt: -1 };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const [total, communities] = await Promise.all([
      this.communityModel.countDocuments(filter),
      this.communityModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    if (communities.length === 0) {
      return {
        data: [],
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
      };
    }

    // Pre-resolve caller's memberships for the returned page
    const communityIds = communities.map((c) => c._id);
    const membershipMap = new Map<string, { role: string; status: string }>();

    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const pageMemberships = await this.membershipModel
        .find({
          communityId: { $in: communityIds },
          userId: new Types.ObjectId(currentUserId),
        })
        .select('communityId role status')
        .lean();

      for (const m of pageMemberships) {
        membershipMap.set(m.communityId.toString(), {
          role: m.role,
          status: m.status,
        });
      }
    }

    // Pre-resolve caller's enrolled courses for deterministic recommendations
    let callerCourseNames: string[] = [];
    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const callerUser = (await this.userModel
        .findById(currentUserId)
        .select('course skills')
        .lean()
        .exec()) as unknown as UserMeta | null;
      if (callerUser?.course && Array.isArray(callerUser.course)) {
        callerCourseNames = callerUser.course.map((c) =>
          c.courseName.toLowerCase(),
        );
      }
    }

    // Construct enriched response items
    const data: CommunityResponseItem[] = [];

    for (const comm of communities) {
      const commIdStr = comm._id.toString();
      const mem = membershipMap.get(commIdStr);

      let membershipState:
        'not_member' | 'pending' | 'member' | 'moderator' | 'owner' =
        'not_member';

      if (mem) {
        if (mem.status === 'pending') {
          membershipState = 'pending';
        } else if (mem.status === 'active') {
          if (mem.role === 'owner') membershipState = 'owner';
          else if (mem.role === 'moderator') membershipState = 'moderator';
          else membershipState = 'member';
        }
      }

      // Deterministic recommendation signal
      let recommendationReason: string | undefined;
      if (callerCourseNames.length > 0) {
        const commNameLower = comm.name.toLowerCase();
        const matchedCourse = callerCourseNames.find(
          (c) =>
            commNameLower.includes(c) ||
            c.includes(commNameLower) ||
            comm.topics.some((t) => c.includes(t.toLowerCase())),
        );
        if (matchedCourse) {
          recommendationReason = 'Matches your enrolled curriculum';
        }
      }

      data.push({
        id: commIdStr,
        name: comm.name,
        slug: comm.slug,
        description: comm.description || '',
        type: comm.type,
        avatarUrl: comm.avatar || '',
        coverUrl: comm.coverImage || '',
        memberCount: comm.memberCount || 0,
        discussionCount: comm.discussionCount || 0,
        visibility: comm.visibility,
        status: comm.status,
        topics: comm.topics || [],
        membership: {
          state: membershipState,
          role: mem?.role as CommunityRole | undefined,
          status: mem?.status as MembershipStatus | undefined,
        },
        recommendationReason,
        createdAt: comm.createdAt
          ? comm.createdAt.toISOString()
          : new Date().toISOString(),
      });
    }

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
    };
  }

  /**
   * Retrieves full community details by unique slug.
   */
  async getCommunityBySlug(
    slug: string,
    currentUserId?: string,
  ): Promise<CommunityDetailResponse> {
    const cleanSlug = slugify(slug);
    const comm = await this.communityModel.findOne({ slug: cleanSlug }).lean();

    if (!comm) {
      throw new NotFoundException(`Community "${slug}" not found`);
    }

    const commIdStr = comm._id.toString();

    // Check membership & permissions
    let membershipState:
      'not_member' | 'pending' | 'member' | 'moderator' | 'owner' =
      'not_member';
    let memRole: string | undefined;
    let memStatus: string | undefined;

    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const membership = await this.membershipModel
        .findOne({
          communityId: comm._id,
          userId: new Types.ObjectId(currentUserId),
        })
        .lean();

      if (membership) {
        memRole = membership.role;
        memStatus = membership.status;

        if (membership.status === 'pending') {
          membershipState = 'pending';
        } else if (membership.status === 'active') {
          if (membership.role === 'owner') membershipState = 'owner';
          else if (membership.role === 'moderator')
            membershipState = 'moderator';
          else membershipState = 'member';
        }
      }
    }

    // Privacy verification: private communities are forbidden to non-members
    if (comm.visibility === 'private' && membershipState === 'not_member') {
      throw new ForbiddenException(
        'This learning community is private. An invitation or membership is required to access.',
      );
    }

    const isMember =
      membershipState === 'member' ||
      membershipState === 'moderator' ||
      membershipState === 'owner';
    const canModerate =
      membershipState === 'moderator' || membershipState === 'owner';
    const canManage = membershipState === 'owner';
    const canPost = isMember && comm.status === 'active';

    // Resolve associated course if any
    let courseInfo:
      { id: string; name: string; thumbnail?: string } | undefined;
    if (comm.courseId) {
      const courseDoc = await this.courseModel
        .findById(comm.courseId)
        .select('_id name coverImage image')
        .lean();
      if (courseDoc) {
        let thumbnail = '';
        const rawImg = courseDoc.coverImage || courseDoc.image;
        if (rawImg) {
          try {
            thumbnail =
              await this.signedUrlService.generateSignedImageUrl(rawImg);
          } catch {
            thumbnail = '';
          }
        }
        courseInfo = {
          id: courseDoc._id.toString(),
          name: courseDoc.name,
          thumbnail,
        };
      }
    }

    return {
      id: commIdStr,
      name: comm.name,
      slug: comm.slug,
      description: comm.description || '',
      type: comm.type,
      avatarUrl: comm.avatar || '',
      coverUrl: comm.coverImage || '',
      memberCount: comm.memberCount || 0,
      discussionCount: comm.discussionCount || 0,
      visibility: comm.visibility,
      status: comm.status,
      topics: comm.topics || [],
      rules: comm.rules || [],
      membership: {
        state: membershipState,
        role: memRole as CommunityRole | undefined,
        status: memStatus as MembershipStatus | undefined,
      },
      permissions: {
        isMember,
        canPost,
        canModerate,
        canManage,
      },
      course: courseInfo,
      createdAt: comm.createdAt
        ? comm.createdAt.toISOString()
        : new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MEMBERSHIP: JOIN & LEAVE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Joins a community (immediate for public, pending for restricted, forbidden for private).
   */
  async joinCommunity(
    communityId: string,
    currentUserId: string,
  ): Promise<{ success: boolean; state: string }> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const comm = await this.communityModel.findById(communityId).exec();
    if (!comm || comm.status !== 'active') {
      throw new NotFoundException('Community not found or inactive');
    }

    if (comm.visibility === 'private') {
      throw new ForbiddenException(
        'Private communities require an explicit invitation to join.',
      );
    }

    const initialStatus =
      comm.visibility === 'restricted' ? 'pending' : 'active';
    const userObjectId = new Types.ObjectId(currentUserId);
    const commObjectId = new Types.ObjectId(communityId);

    // Upsert membership
    const existing = await this.membershipModel
      .findOne({ communityId: commObjectId, userId: userObjectId })
      .exec();

    if (existing) {
      if (existing.status === 'active') {
        return { success: true, state: existing.role };
      }
      if (existing.status === 'pending') {
        return { success: true, state: 'pending' };
      }
      // Re-activate if previously removed
      existing.status = initialStatus;
      existing.joinedAt = new Date();
      await existing.save();

      if (initialStatus === 'active') {
        await this.communityModel.updateOne(
          { _id: commObjectId },
          { $inc: { memberCount: 1 } },
        );
      }
      return { success: true, state: initialStatus };
    }

    await this.membershipModel.create({
      communityId: commObjectId,
      userId: userObjectId,
      role: 'member',
      status: initialStatus,
      joinedAt: new Date(),
    });

    if (initialStatus === 'active') {
      await this.communityModel.updateOne(
        { _id: commObjectId },
        { $inc: { memberCount: 1 } },
      );

      // Record activity in network timeline
      await this.networkService.recordActivity({
        actorId: userObjectId,
        type: 'COURSE_JOINED', // Or generic event
        idempotencyKey: `${currentUserId}_COMMUNITY_JOINED_${communityId}`,
        courseName: comm.name,
        visibility: 'public',
      });
    }

    return { success: true, state: initialStatus };
  }

  /**
   * Leaves a community.
   */
  async leaveCommunity(
    communityId: string,
    currentUserId: string,
  ): Promise<{ success: boolean; state: string }> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const commObjectId = new Types.ObjectId(communityId);
    const userObjectId = new Types.ObjectId(currentUserId);

    const membership = await this.membershipModel
      .findOne({ communityId: commObjectId, userId: userObjectId })
      .exec();

    if (!membership || membership.status !== 'active') {
      throw new BadRequestException(
        'You are not an active member of this community',
      );
    }

    if (membership.role === 'owner') {
      throw new BadRequestException(
        'Community owners cannot leave without transferring ownership or archiving the community.',
      );
    }

    membership.status = 'removed';
    await membership.save();

    await this.communityModel.updateOne(
      { _id: commObjectId, memberCount: { $gt: 0 } },
      { $inc: { memberCount: -1 } },
    );

    return { success: true, state: 'not_member' };
  }

  /**
   * Retrieves paginated members of a community.
   */
  async getCommunityMembers(
    communityId: string,
    query: { q?: string; role?: string; page?: number; limit?: number } = {},
  ): Promise<{
    data: Array<{
      id: string;
      name: string;
      username?: string;
      avatarUrl?: string;
      headline?: string;
      role: string;
      joinedAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const commObjectId = new Types.ObjectId(communityId);
    const filter: Record<string, unknown> = {
      communityId: commObjectId,
      status: 'active',
    };

    if (query.role && query.role !== 'all') {
      filter.role = query.role;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, memberships] = await Promise.all([
      this.membershipModel.countDocuments(filter),
      this.membershipModel
        .find(filter)
        .sort({ role: 1, joinedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const userIds = memberships.map((m) => m.userId);
    const users = (await this.userModel
      .find({
        _id: { $in: userIds },
        'account_Status.isBlocked': { $ne: true },
        'account_Status.isDeleted': { $ne: true },
      })
      .select('_id name username avatar headline currentRole account_Status')
      .lean()
      .exec()) as unknown as UserMeta[];

    const userMap = new Map<string, UserMeta>();
    for (const u of users) {
      userMap.set(u._id.toString(), u);
    }

    const avatarMap = new Map<string, string>();
    await Promise.all(
      users.map(async (u) => {
        if (u.avatar) {
          try {
            const url = await this.signedUrlService.generateSignedImageUrl(
              u.avatar,
            );
            avatarMap.set(u._id.toString(), url);
          } catch {
            avatarMap.set(u._id.toString(), '');
          }
        }
      }),
    );

    const data: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string;
      headline: string;
      role: string;
      joinedAt: string;
    }[] = [];
    for (const m of memberships) {
      const u = userMap.get(m.userId.toString());
      if (!u) continue;

      data.push({
        id: u._id.toString(),
        name: u.name || 'Student',
        username: u.username || '',
        avatarUrl: avatarMap.get(u._id.toString()) || '',
        headline: u.headline || u.currentRole || '',
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      });
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DISCUSSIONS & REPLIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lists discussions for a community.
   */
  async getDiscussions(
    communityId: string,
    query: { type?: string; page?: number; limit?: number },
  ): Promise<{
    data: DiscussionResponseItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const commObjectId = new Types.ObjectId(communityId);
    const filter: Record<string, unknown> = {
      communityId: commObjectId,
      status: { $in: ['published', 'locked'] },
    };

    if (query.type && query.type !== 'all') {
      filter.type = query.type;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const [total, discussions] = await Promise.all([
      this.discussionModel.countDocuments(filter),
      this.discussionModel
        .find(filter)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    if (discussions.length === 0) {
      return {
        data: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    const authorIds = [...new Set(discussions.map((d) => d.authorId))];
    const authors = (await this.userModel
      .find({ _id: { $in: authorIds } })
      .select('_id name username avatar headline currentRole account_Status')
      .lean()
      .exec()) as unknown as UserMeta[];

    const authorMap = new Map<string, UserMeta>();
    for (const a of authors) {
      authorMap.set(a._id.toString(), a);
    }

    const avatarMap = new Map<string, string>();
    await Promise.all(
      authors.map(async (a) => {
        if (a.avatar) {
          try {
            const url = await this.signedUrlService.generateSignedImageUrl(
              a.avatar,
            );
            avatarMap.set(a._id.toString(), url);
          } catch {
            avatarMap.set(a._id.toString(), '');
          }
        }
      }),
    );

    const data: DiscussionResponseItem[] = discussions.map((d) => {
      const authorDoc = authorMap.get(d.authorId.toString());
      return {
        id: d._id.toString(),
        communityId: d.communityId.toString(),
        title: d.title,
        body: d.body,
        type: d.type,
        status: d.status,
        isPinned: d.isPinned,
        replyCount: d.replyCount || 0,
        isEdited: d.isEdited,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        author: {
          id: authorDoc ? authorDoc._id.toString() : '',
          name: authorDoc?.name || 'Student',
          username: authorDoc?.username || '',
          avatarUrl: authorDoc
            ? avatarMap.get(authorDoc._id.toString()) || ''
            : '',
          headline: authorDoc?.headline || authorDoc?.currentRole || '',
          isVerified: Boolean(authorDoc?.account_Status?.isVerified),
        },
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Creates a discussion in a community.
   */
  async createDiscussion(
    communityId: string,
    dto: CreateDiscussionDto,
    currentUserId: string,
  ): Promise<DiscussionResponseItem> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const commObjectId = new Types.ObjectId(communityId);
    const userObjectId = new Types.ObjectId(currentUserId);

    const comm = await this.communityModel.findById(commObjectId).exec();
    if (!comm || comm.status !== 'active') {
      throw new NotFoundException('Community not found or inactive');
    }

    // Verify membership
    const membership = await this.membershipModel
      .findOne({ communityId: commObjectId, userId: userObjectId })
      .exec();

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException(
        'You must be an active member of this community to start a discussion.',
      );
    }

    const doc = await this.discussionModel.create({
      communityId: commObjectId,
      authorId: userObjectId,
      title: dto.title.trim(),
      body: dto.body.trim(),
      type: dto.type || 'discussion',
      status: 'published',
      replyCount: 0,
    });

    await this.communityModel.updateOne(
      { _id: commObjectId },
      { $inc: { discussionCount: 1 } },
    );

    const user = (await this.userModel
      .findById(userObjectId)
      .lean()
      .exec()) as unknown as UserMeta | null;
    const author = await this.resolveAuthor(user);

    return {
      id: doc._id.toString(),
      communityId: communityId,
      communitySlug: comm.slug,
      communityName: comm.name,
      title: doc.title,
      body: doc.body,
      type: doc.type,
      status: doc.status,
      isPinned: doc.isPinned,
      replyCount: 0,
      isEdited: false,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      author,
    };
  }

  /**
   * Retrieves single discussion detail.
   */
  async getDiscussionDetail(
    discussionId: string,
    currentUserId?: string,
  ): Promise<DiscussionDetailResponse> {
    if (!Types.ObjectId.isValid(discussionId)) {
      throw new BadRequestException('Invalid discussion ID');
    }

    const discussion = await this.discussionModel.findById(discussionId).lean();
    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found or removed');
    }

    const comm = await this.communityModel
      .findById(discussion.communityId)
      .lean();
    if (!comm) {
      throw new NotFoundException('Community not found');
    }

    const authorDoc = (await this.userModel
      .findById(discussion.authorId)
      .lean()
      .exec()) as unknown as UserMeta | null;
    const author = await this.resolveAuthor(authorDoc);

    let canEdit = false;
    let canDelete = false;
    let canLock = false;

    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const isAuthor = currentUserId === discussion.authorId.toString();
      const membership = await this.membershipModel
        .findOne({
          communityId: discussion.communityId,
          userId: new Types.ObjectId(currentUserId),
          status: 'active',
        })
        .lean();

      const isModerator =
        membership?.role === 'moderator' || membership?.role === 'owner';

      canEdit = isAuthor && discussion.status !== 'locked';
      canDelete = isAuthor || isModerator;
      canLock = isModerator;
    }

    return {
      id: discussion._id.toString(),
      communityId: discussion.communityId.toString(),
      communitySlug: comm.slug,
      communityName: comm.name,
      title: discussion.title,
      body: discussion.body,
      type: discussion.type,
      status: discussion.status,
      isPinned: discussion.isPinned,
      replyCount: discussion.replyCount || 0,
      isEdited: discussion.isEdited,
      createdAt: discussion.createdAt.toISOString(),
      updatedAt: discussion.updatedAt.toISOString(),
      author,
      permissions: {
        canEdit,
        canDelete,
        canLock,
      },
    };
  }

  /**
   * Updates discussion title and body.
   */
  async updateDiscussion(
    discussionId: string,
    dto: UpdateDiscussionDto,
    currentUserId: string,
  ): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(discussionId)) {
      throw new BadRequestException('Invalid discussion ID');
    }

    const discussion = await this.discussionModel.findById(discussionId).exec();
    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found');
    }

    if (discussion.authorId.toString() !== currentUserId) {
      throw new ForbiddenException('You can only edit your own discussions');
    }

    if (discussion.status === 'locked') {
      throw new BadRequestException(
        'This discussion is locked and cannot be edited',
      );
    }

    if (dto.title) discussion.title = dto.title.trim();
    if (dto.body) discussion.body = dto.body.trim();
    discussion.isEdited = true;
    await discussion.save();

    return { success: true };
  }

  /**
   * Deletes a discussion.
   */
  async deleteDiscussion(
    discussionId: string,
    currentUserId: string,
  ): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(discussionId)) {
      throw new BadRequestException('Invalid discussion ID');
    }

    const discussion = await this.discussionModel.findById(discussionId).exec();
    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found');
    }

    const isAuthor = discussion.authorId.toString() === currentUserId;
    if (!isAuthor) {
      // Check if caller is moderator/owner
      const membership = await this.membershipModel
        .findOne({
          communityId: discussion.communityId,
          userId: new Types.ObjectId(currentUserId),
          status: 'active',
        })
        .lean();

      if (
        !membership ||
        (membership.role !== 'moderator' && membership.role !== 'owner')
      ) {
        throw new ForbiddenException(
          'You do not have permission to delete this discussion',
        );
      }
    }

    discussion.status = 'removed';
    await discussion.save();

    await this.communityModel.updateOne(
      { _id: discussion.communityId, discussionCount: { $gt: 0 } },
      { $inc: { discussionCount: -1 } },
    );

    return { success: true };
  }

  /**
   * Locks or unlocks a discussion (moderators/owners only).
   */
  async lockDiscussion(
    discussionId: string,
    locked: boolean,
    currentUserId: string,
  ): Promise<{ success: boolean; status: string }> {
    if (!Types.ObjectId.isValid(discussionId)) {
      throw new BadRequestException('Invalid discussion ID');
    }

    const discussion = await this.discussionModel.findById(discussionId).exec();
    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found');
    }

    const membership = await this.membershipModel
      .findOne({
        communityId: discussion.communityId,
        userId: new Types.ObjectId(currentUserId),
        status: 'active',
      })
      .lean();

    if (
      !membership ||
      (membership.role !== 'moderator' && membership.role !== 'owner')
    ) {
      throw new ForbiddenException(
        'Only community moderators can lock discussions',
      );
    }

    discussion.status = locked ? 'locked' : 'published';
    await discussion.save();

    return { success: true, status: discussion.status };
  }

  /**
   * Pins or unpins a discussion (moderators/owners only).
   */
  async togglePinDiscussion(
    discussionId: string,
    pinned?: boolean,
    currentUserId?: string,
  ): Promise<{ success: boolean; isPinned: boolean }> {
    if (!Types.ObjectId.isValid(discussionId)) {
      throw new BadRequestException('Invalid discussion ID');
    }

    const discussion = await this.discussionModel.findById(discussionId).exec();
    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found');
    }

    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const membership = await this.membershipModel
        .findOne({
          communityId: discussion.communityId,
          userId: new Types.ObjectId(currentUserId),
          status: 'active',
        })
        .lean();

      if (
        !membership ||
        (membership.role !== 'moderator' && membership.role !== 'owner')
      ) {
        throw new ForbiddenException(
          'Only community moderators or owners can pin discussions',
        );
      }
    }

    const nextPinned =
      typeof pinned === 'boolean' ? pinned : !discussion.isPinned;
    discussion.isPinned = nextPinned;
    await discussion.save();

    return { success: true, isPinned: nextPinned };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. REPLIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves flat chronological replies for a discussion.
   */
  async getReplies(
    discussionId: string,
    query: { page?: number; limit?: number },
  ): Promise<{
    data: ReplyResponseItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!Types.ObjectId.isValid(discussionId)) {
      throw new BadRequestException('Invalid discussion ID');
    }

    const discObjectId = new Types.ObjectId(discussionId);
    const filter: { discussionId: Types.ObjectId; status: ReplyStatus } = {
      discussionId: discObjectId,
      status: 'published',
    };

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, replies] = await Promise.all([
      this.replyModel.countDocuments(filter),
      this.replyModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    if (replies.length === 0) {
      return { data: [], total, page, limit };
    }

    const authorIds = [...new Set(replies.map((r) => r.authorId))];
    const authors = (await this.userModel
      .find({ _id: { $in: authorIds } })
      .select('_id name username avatar headline currentRole account_Status')
      .lean()
      .exec()) as unknown as UserMeta[];

    const authorMap = new Map<string, UserMeta>();
    for (const a of authors) {
      authorMap.set(a._id.toString(), a);
    }

    const avatarMap = new Map<string, string>();
    await Promise.all(
      authors.map(async (a) => {
        if (a.avatar) {
          try {
            const url = await this.signedUrlService.generateSignedImageUrl(
              a.avatar,
            );
            avatarMap.set(a._id.toString(), url);
          } catch {
            avatarMap.set(a._id.toString(), '');
          }
        }
      }),
    );

    const data: ReplyResponseItem[] = replies.map((r) => {
      const authorDoc = authorMap.get(r.authorId.toString());
      return {
        id: r._id.toString(),
        discussionId: r.discussionId.toString(),
        body: r.body,
        isEdited: r.isEdited,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        author: {
          id: authorDoc ? authorDoc._id.toString() : '',
          name: authorDoc?.name || 'Student',
          username: authorDoc?.username || '',
          avatarUrl: authorDoc
            ? avatarMap.get(authorDoc._id.toString()) || ''
            : '',
          headline: authorDoc?.headline || authorDoc?.currentRole || '',
          isVerified: Boolean(authorDoc?.account_Status?.isVerified),
        },
      };
    });

    return { data, total, page, limit };
  }

  /**
   * Adds a reply to a discussion.
   */
  async createReply(
    discussionId: string,
    dto: CreateReplyDto,
    currentUserId: string,
  ): Promise<ReplyResponseItem> {
    if (!Types.ObjectId.isValid(discussionId)) {
      throw new BadRequestException('Invalid discussion ID');
    }

    const discObjectId = new Types.ObjectId(discussionId);
    const userObjectId = new Types.ObjectId(currentUserId);

    const discussion = await this.discussionModel.findById(discObjectId).exec();
    if (!discussion || discussion.status === 'removed') {
      throw new NotFoundException('Discussion not found');
    }

    if (discussion.status === 'locked') {
      throw new ForbiddenException(
        'This discussion is locked. New replies are disabled.',
      );
    }

    // Verify community membership
    const membership = await this.membershipModel
      .findOne({
        communityId: discussion.communityId,
        userId: userObjectId,
        status: 'active',
      })
      .lean();

    if (!membership) {
      throw new ForbiddenException(
        'You must be a member of this community to reply.',
      );
    }

    const reply = await this.replyModel.create({
      discussionId: discObjectId,
      communityId: discussion.communityId,
      authorId: userObjectId,
      body: dto.body.trim(),
      status: 'published',
    });

    await this.discussionModel.updateOne(
      { _id: discObjectId },
      { $inc: { replyCount: 1 } },
    );

    const user = (await this.userModel
      .findById(userObjectId)
      .lean()
      .exec()) as unknown as UserMeta | null;
    const author = await this.resolveAuthor(user);

    return {
      id: reply._id.toString(),
      discussionId: discussionId,
      body: reply.body,
      isEdited: false,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
      author,
    };
  }

  /**
   * Deletes a reply.
   */
  async deleteReply(
    discussionId: string,
    replyId: string,
    currentUserId: string,
  ): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(replyId)) {
      throw new BadRequestException('Invalid reply ID');
    }

    const reply = await this.replyModel.findById(replyId).exec();
    if (!reply || reply.status === 'removed') {
      throw new NotFoundException('Reply not found');
    }

    const isAuthor = reply.authorId.toString() === currentUserId;
    if (!isAuthor) {
      const membership = await this.membershipModel
        .findOne({
          communityId: reply.communityId,
          userId: new Types.ObjectId(currentUserId),
          status: 'active',
        })
        .lean();

      if (
        !membership ||
        (membership.role !== 'moderator' && membership.role !== 'owner')
      ) {
        throw new ForbiddenException('Permission denied');
      }
    }

    reply.status = 'removed';
    await reply.save();

    await this.discussionModel.updateOne(
      { _id: reply.discussionId, replyCount: { $gt: 0 } },
      { $inc: { replyCount: -1 } },
    );

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ANNOUNCEMENTS & RESOURCES & REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves announcements for a community.
   */
  async getAnnouncements(
    communityId: string,
  ): Promise<AnnouncementResponseItem[]> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const commObjectId = new Types.ObjectId(communityId);
    const announcements = await this.announcementModel
      .find({ communityId: commObjectId })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(20)
      .lean();

    if (announcements.length === 0) return [];

    const authorIds = [...new Set(announcements.map((a) => a.authorId))];
    const authors = (await this.userModel
      .find({ _id: { $in: authorIds } })
      .select('_id name username avatar headline currentRole account_Status')
      .lean()
      .exec()) as unknown as UserMeta[];

    const authorMap = new Map<string, UserMeta>();
    for (const a of authors) {
      authorMap.set(a._id.toString(), a);
    }

    const avatarMap = new Map<string, string>();
    await Promise.all(
      authors.map(async (a) => {
        if (a.avatar) {
          try {
            const url = await this.signedUrlService.generateSignedImageUrl(
              a.avatar,
            );
            avatarMap.set(a._id.toString(), url);
          } catch {
            avatarMap.set(a._id.toString(), '');
          }
        }
      }),
    );

    return announcements.map((a) => {
      const authorDoc = authorMap.get(a.authorId.toString());
      return {
        id: a._id.toString(),
        communityId: a.communityId.toString(),
        title: a.title,
        content: a.content,
        pinned: a.pinned,
        createdAt: a.createdAt.toISOString(),
        author: {
          id: authorDoc ? authorDoc._id.toString() : '',
          name: authorDoc?.name || 'Moderator',
          username: authorDoc?.username || '',
          avatarUrl: authorDoc
            ? avatarMap.get(authorDoc._id.toString()) || ''
            : '',
          headline: authorDoc?.headline || authorDoc?.currentRole || '',
          isVerified: Boolean(authorDoc?.account_Status?.isVerified),
        },
      };
    });
  }

  /**
   * Creates an announcement (moderators/owners only).
   */
  async createAnnouncement(
    communityId: string,
    dto: CreateAnnouncementDto,
    currentUserId: string,
  ): Promise<AnnouncementResponseItem> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const commObjectId = new Types.ObjectId(communityId);
    const userObjectId = new Types.ObjectId(currentUserId);

    const membership = await this.membershipModel
      .findOne({
        communityId: commObjectId,
        userId: userObjectId,
        status: 'active',
      })
      .lean();

    if (
      !membership ||
      (membership.role !== 'moderator' && membership.role !== 'owner')
    ) {
      throw new ForbiddenException(
        'Only community moderators or owners can post announcements.',
      );
    }

    const doc = await this.announcementModel.create({
      communityId: commObjectId,
      authorId: userObjectId,
      title: dto.title.trim(),
      content: dto.content.trim(),
      pinned: Boolean(dto.pinned),
    });

    const user = (await this.userModel
      .findById(userObjectId)
      .lean()
      .exec()) as unknown as UserMeta | null;
    const author = await this.resolveAuthor(user);

    return {
      id: doc._id.toString(),
      communityId,
      title: doc.title,
      content: doc.content,
      pinned: doc.pinned,
      createdAt: doc.createdAt.toISOString(),
      author,
    };
  }

  /**
   * Retrieves resources for a community.
   */
  async getResources(communityId: string): Promise<ResourceResponseItem[]> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const commObjectId = new Types.ObjectId(communityId);
    const resources = await this.resourceModel
      .find({ communityId: commObjectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (resources.length === 0) return [];

    const creatorIds = [...new Set(resources.map((r) => r.createdBy))];
    const creators = (await this.userModel
      .find({ _id: { $in: creatorIds } })
      .select('_id name username avatar headline currentRole account_Status')
      .lean()
      .exec()) as unknown as UserMeta[];

    const creatorMap = new Map<string, UserMeta>();
    for (const c of creators) {
      creatorMap.set(c._id.toString(), c);
    }

    const avatarMap = new Map<string, string>();
    await Promise.all(
      creators.map(async (c) => {
        if (c.avatar) {
          try {
            const url = await this.signedUrlService.generateSignedImageUrl(
              c.avatar,
            );
            avatarMap.set(c._id.toString(), url);
          } catch {
            avatarMap.set(c._id.toString(), '');
          }
        }
      }),
    );

    return resources.map((r) => {
      const c = creatorMap.get(r.createdBy.toString());
      return {
        id: r._id.toString(),
        communityId: r.communityId.toString(),
        title: r.title,
        description: r.description || '',
        type: r.type,
        targetId: r.targetId || '',
        url: r.url || '',
        createdAt: r.createdAt.toISOString(),
        createdBy: {
          id: c ? c._id.toString() : '',
          name: c?.name || 'Student',
          username: c?.username || '',
          avatarUrl: c ? avatarMap.get(c._id.toString()) || '' : '',
          headline: c?.headline || c?.currentRole || '',
          isVerified: Boolean(c?.account_Status?.isVerified),
        },
      };
    });
  }

  /**
   * Adds a resource to a community.
   */
  async createResource(
    communityId: string,
    dto: CreateResourceDto,
    currentUserId: string,
  ): Promise<ResourceResponseItem> {
    if (!Types.ObjectId.isValid(communityId)) {
      throw new BadRequestException('Invalid community ID');
    }

    const commObjectId = new Types.ObjectId(communityId);
    const userObjectId = new Types.ObjectId(currentUserId);

    const membership = await this.membershipModel
      .findOne({
        communityId: commObjectId,
        userId: userObjectId,
        status: 'active',
      })
      .lean();

    if (!membership) {
      throw new ForbiddenException(
        'You must be an active member to share resources.',
      );
    }

    const doc = await this.resourceModel.create({
      communityId: commObjectId,
      title: dto.title.trim(),
      description: dto.description?.trim() || '',
      type: dto.type,
      targetId: dto.targetId || '',
      url: dto.url?.trim() || '',
      createdBy: userObjectId,
    });

    const user = (await this.userModel
      .findById(userObjectId)
      .lean()
      .exec()) as unknown as UserMeta | null;
    const createdBy = await this.resolveAuthor(user);

    return {
      id: doc._id.toString(),
      communityId,
      title: doc.title,
      description: doc.description || '',
      type: doc.type,
      targetId: doc.targetId || '',
      url: doc.url || '',
      createdAt: doc.createdAt.toISOString(),
      createdBy,
    };
  }

  /**
   * Minimal report submission.
   */
  async reportContent(
    dto: CreateReportDto,
    currentUserId: string,
  ): Promise<{ success: boolean }> {
    await this.reportModel.create({
      reporterId: new Types.ObjectId(currentUserId),
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason.trim(),
      status: 'pending',
    });

    return { success: true };
  }
}
