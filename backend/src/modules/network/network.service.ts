import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { Connection, ConnectionDocument } from './schemas/connection.schema';
import {
  CommunityMembership,
  CommunityMembershipDocument,
} from './schemas/community-membership.schema';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GetStudentsDto } from './dto/get-students.dto';
import {
  DiscoverableStudent,
  PaginatedStudentsResponse,
  NetworkFiltersResponse,
} from './dto/discoverable-student.dto';
import {
  GetConnectionsQueryDto,
  PaginatedConnectionsResponse,
  ConnectionItem,
  ConnectionRequestItem,
  ConnectionCountsResponse,
  RelationshipStateResponse,
  RelationshipState,
  ProfileNetworkStatsResponse,
  NetworkUserItem,
  PaginatedNetworkUsersResponse,
} from './dto/connection-actions.dto';
import {
  PublicNetworkProfile,
  PublicCourseItem,
  PublicAchievementItem,
  PublicActivityItem,
} from './dto/network-profile.dto';
import {
  NetworkActivity,
  NetworkActivityDocument,
  NetworkActivityType,
  NetworkActivityVisibility,
} from './schemas/network-activity.schema';
import {
  GetNetworkActivityQueryDto,
  PaginatedNetworkActivityResponse,
  NetworkActivityResponseItem,
  NetworkActivitySummaryResponse,
} from './dto/network-activity.dto';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ACHIEVEMENT_METADATA: Record<
  string,
  { title: string; description: string; category: string; icon: string }
> = {
  'First Class Completed': {
    title: 'First Step',
    description: 'Streamed and completed their first lecture on Zeitnah.',
    category: 'Milestone',
    icon: 'Star',
  },
  'First Course Completed': {
    title: 'Course Graduate',
    description: 'Successfully finished an entire course track.',
    category: 'Curriculum',
    icon: 'Award',
  },
  '100 Points Earned': {
    title: 'Century Learner',
    description: 'Accumulated 100 learning XP points.',
    category: 'XP',
    icon: 'Sparkles',
  },
  '500 Points Earned': {
    title: 'Knowledge Builder',
    description: 'Accumulated 500 learning XP points.',
    category: 'XP',
    icon: 'Sparkles',
  },
  '1000 Points Earned': {
    title: 'Master Learner',
    description: 'Reached an elite milestone of 1,000 learning XP points.',
    category: 'XP',
    icon: 'Sparkles',
  },
  'Profile 100% Complete': {
    title: 'Identity Master',
    description: 'Reached 100% profile completeness and verification.',
    category: 'Identity',
    icon: 'ShieldCheck',
  },
  '7 Day Streak': {
    title: 'Weekly Consistency',
    description: 'Maintained a 7-day continuous learning streak.',
    category: 'Streak',
    icon: 'Flame',
  },
  '30 Day Streak': {
    title: 'Unstoppable Momentum',
    description: 'Maintained a 30-day continuous learning streak.',
    category: 'Streak',
    icon: 'Flame',
  },
  first_class: {
    title: 'First Step',
    description: 'Completed their first lecture video.',
    category: 'Milestone',
    icon: 'Star',
  },
  five_classes: {
    title: 'Dedicated Learner',
    description: 'Successfully completed 5 video classes.',
    category: 'Milestone',
    icon: 'CheckCircle2',
  },
  ten_classes: {
    title: 'Knowledge Seeker',
    description: 'Completed 10 interactive classes.',
    category: 'Milestone',
    icon: 'Award',
  },
  course_completed: {
    title: 'Course Graduate',
    description: 'Fully completed an entire curriculum course.',
    category: 'Curriculum',
    icon: 'Award',
  },
  profile_100: {
    title: 'Identity Master',
    description: 'Reached 100% profile completeness.',
    category: 'Identity',
    icon: 'Sparkles',
  },
};

function getNormalizedPair(
  idA: string,
  idB: string,
): { userLow: string; userHigh: string } {
  return idA < idB
    ? { userLow: idA, userHigh: idB }
    : { userLow: idB, userHigh: idA };
}

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Connection.name)
    private readonly connectionModel: Model<ConnectionDocument>,
    @InjectModel(CommunityMembership.name)
    private readonly membershipModel: Model<CommunityMembershipDocument>,
    @InjectModel(NetworkActivity.name)
    private readonly activityModel: Model<NetworkActivityDocument>,
    private readonly signedUrlService: SignedUrlService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Base filter ensuring only eligible active students are discoverable.
   */
  private getEligibleStudentFilter(
    currentUserId?: string,
  ): Record<string, any> {
    const filter: Record<string, any> = {
      role: 'student',
      'account_Status.isBlocked': { $ne: true },
      'account_Status.isDeleted': { $ne: true },
    };

    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      filter._id = { $ne: new Types.ObjectId(currentUserId) };
    }

    return filter;
  }

  /**
   * Maps a User document to a safe, public DiscoverableStudent object.
   */
  private async transformStudent(
    user: UserDocument,
    relationship?: { state: RelationshipState; connectionId?: string },
  ): Promise<DiscoverableStudent> {
    let avatarUrl = '';
    if (user.avatar) {
      avatarUrl = await this.signedUrlService.generateSignedImageUrl(
        user.avatar,
      );
    }

    const courseList = user.course;
    const primaryCourse =
      Array.isArray(courseList) && courseList.length > 0
        ? courseList[0]?.courseName || ''
        : '';

    const educationList = user.education;
    const institution =
      Array.isArray(educationList) && educationList.length > 0
        ? educationList[0]?.institution || ''
        : '';

    const level =
      user.gamification?.rank ||
      (user.gamification?.level
        ? `Level ${user.gamification.level}`
        : 'Beginner');

    const lastActiveAt = user.account_Status?.lastSeen
      ? new Date(user.account_Status.lastSeen).toISOString()
      : undefined;

    return {
      id: String(user._id),
      name: user.name || 'Anonymous Student',
      username: user.username || '',
      avatarUrl,
      headline: user.headline || user.currentRole || '',
      course: primaryCourse,
      interests: Array.isArray(user.skills) ? user.skills : [],
      institution,
      level,
      isActive: Boolean(user.account_Status?.isActive !== false),
      lastActiveAt,
      isVerified: Boolean(
        user.account_Status?.isVerified ||
        (user as any).verification?.status === 'VERIFIED',
      ),
      primaryRole: (user as any).primaryRole || 'STUDENT',
      capabilities: (user as any).capabilities || ['STUDENT'],
      availability: (user as any).availability || 'NOT_CURRENTLY_AVAILABLE',
      relationshipState: relationship?.state || 'none',
      connectionId: relationship?.connectionId,
    };
  }

  /**
   * Discovers students with search, filters, sorting, pagination,
   * and bulk relationship enrichment.
   */
  async getStudents(
    dto: GetStudentsDto,
    currentUserId?: string,
  ): Promise<PaginatedStudentsResponse> {
    const query = this.getEligibleStudentFilter(currentUserId);

    // Freeform text search across safe fields
    if (dto.q && dto.q.trim()) {
      const cleanQ = escapeRegex(dto.q.trim());
      const regex = new RegExp(cleanQ, 'i');
      query.$or = [
        { name: regex },
        { username: regex },
        { headline: regex },
        { currentRole: regex },
        { 'course.courseName': regex },
        { skills: regex },
        { 'education.institution': regex },
      ];
    }

    // Filter by Course
    if (dto.course && dto.course.trim()) {
      const cleanCourse = escapeRegex(dto.course.trim());
      query['course.courseName'] = new RegExp(`^${cleanCourse}$`, 'i');
    }

    // Filter by Interest / Skill
    if (dto.interest && dto.interest.trim()) {
      const cleanInterest = escapeRegex(dto.interest.trim());
      query.skills = new RegExp(`^${cleanInterest}$`, 'i');
    }

    // Filter by Institution
    if (dto.institution && dto.institution.trim()) {
      const cleanInst = escapeRegex(dto.institution.trim());
      query['education.institution'] = new RegExp(cleanInst, 'i');
    }

    // Filter by Level / Rank
    if (dto.level && dto.level.trim()) {
      const cleanLevel = dto.level.trim();
      const numLevel = Number(cleanLevel);
      if (!isNaN(numLevel) && numLevel > 0) {
        query['gamification.level'] = numLevel;
      } else {
        query['gamification.rank'] = new RegExp(
          `^${escapeRegex(cleanLevel)}$`,
          'i',
        );
      }
    }

    // Filter by Role
    if (dto.role && dto.role.trim()) {
      query.primaryRole = dto.role.trim().toUpperCase();
    }

    // Filter by Availability
    if (dto.availability && dto.availability.trim()) {
      query.availability = dto.availability.trim();
    }

    // Sorting
    let sortOptions: Record<string, any> = {
      'gamification.totalPoints': -1,
      'account_Status.lastSeen': -1,
    };
    if (dto.sort === 'recent') {
      sortOptions = { 'account_Status.lastSeen': -1, createdAt: -1 };
    } else if (dto.sort === 'name') {
      sortOptions = { name: 1 };
    }

    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(50, Math.max(1, dto.limit || 12));
    const skip = (page - 1) * limit;

    const projection =
      'name username avatar headline currentRole course skills education gamification account_Status createdAt primaryRole capabilities availability verification';

    const [total, students] = await Promise.all([
      this.userModel.countDocuments(query),
      this.userModel
        .find(query)
        .select(projection)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    // Bulk-fetch relationship states for current user
    const relationshipMap = new Map<
      string,
      { state: RelationshipState; connectionId?: string }
    >();

    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const userObjId = new Types.ObjectId(currentUserId);
      const activeConnections = await this.connectionModel
        .find({
          $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
          status: { $in: ['pending', 'accepted'] },
        })
        .lean()
        .exec();

      for (const conn of activeConnections) {
        const otherId =
          String(conn.requesterId) === currentUserId
            ? String(conn.recipientId)
            : String(conn.requesterId);

        let state: RelationshipState = 'none';
        if (conn.status === 'accepted') {
          state = 'connected';
        } else if (conn.status === 'pending') {
          state =
            String(conn.requesterId) === currentUserId
              ? 'outgoing_pending'
              : 'incoming_pending';
        }

        relationshipMap.set(otherId, {
          state,
          connectionId: String(conn._id),
        });
      }
    }

    const transformedData = await Promise.all(
      students.map((student) => {
        const studentId = String(student._id);
        const rel = relationshipMap.get(studentId) || { state: 'none' };
        return this.transformStudent(student, rel);
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: transformedData,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Retrieves real filter options available in the student population.
   */
  async getFilters(): Promise<NetworkFiltersResponse> {
    const baseFilter = this.getEligibleStudentFilter();

    const [coursesList, distinctSkillsRaw, distinctInstitutionsRaw] =
      await Promise.all([
        this.courseModel.find().select('name').lean<{ name: string }[]>(),
        this.userModel.distinct('skills', baseFilter),
        this.userModel.distinct('education.institution', baseFilter),
      ]);

    const courseNames: string[] = Array.from(
      new Set(coursesList.map((c) => c.name).filter(Boolean)),
    );

    const distinctSkills: string[] = (distinctSkillsRaw as unknown[]).filter(
      (s): s is string => typeof s === 'string',
    );

    const distinctInstitutions: string[] = (
      distinctInstitutionsRaw as unknown[]
    ).filter((inst): inst is string => typeof inst === 'string');

    const cleanSkills: string[] = Array.from(
      new Set(distinctSkills.map((s) => s.trim()).filter((s) => s.length > 0)),
    ).slice(0, 30);

    const cleanInstitutions: string[] = Array.from(
      new Set(
        distinctInstitutions
          .map((inst) => inst.trim())
          .filter((inst) => inst.length > 0),
      ),
    ).slice(0, 20);

    const levels = ['Beginner', 'Scholar', 'Master', 'Grandmaster'];
    const roles = [
      'STUDENT',
      'PROFESSIONAL',
      'EDUCATOR',
      'MENTOR',
      'RECRUITER',
      'FOUNDER',
    ];

    return {
      courses: courseNames,
      interests: cleanSkills,
      institutions: cleanInstitutions,
      levels,
      roles,
    };
  }

  /**
   * Retrieves a single student's public preview by username, enriched with relationship state.
   */
  async getStudentByUsername(
    rawUsername: string,
    currentUserId?: string,
  ): Promise<DiscoverableStudent> {
    const clean = rawUsername.trim().replace(/^@/, '');
    let student: any = null;

    if (Types.ObjectId.isValid(clean)) {
      student = await this.userModel
        .findOne({
          _id: new Types.ObjectId(clean),
          ...this.getEligibleStudentFilter(),
        })
        .select(
          'name username avatar headline currentRole course skills education gamification account_Status createdAt',
        )
        .exec();
    }

    if (!student) {
      student = await this.userModel
        .findOne({
          username: clean.toLowerCase(),
          ...this.getEligibleStudentFilter(),
        })
        .select(
          'name username avatar headline currentRole course skills education gamification account_Status createdAt',
        )
        .exec();
    }

    if (!student) {
      throw new NotFoundException(
        `Student profile not found or is no longer available.`,
      );
    }

    let rel: { state: RelationshipState; connectionId?: string } = {
      state: 'none',
    };

    if (currentUserId) {
      const relState = await this.getRelationshipState(
        currentUserId,
        String(student._id),
      );
      rel = { state: relState.state, connectionId: relState.connectionId };
    }

    return this.transformStudent(student, rel);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIP & CONNECTION ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves normalized relationship state between current user and target user.
   */
  async getRelationshipState(
    currentUserId: string,
    targetUserId: string,
  ): Promise<RelationshipStateResponse> {
    if (currentUserId === targetUserId) {
      return { targetUserId, state: 'self' };
    }

    const { userLow, userHigh } = getNormalizedPair(
      currentUserId,
      targetUserId,
    );

    const connection = await this.connectionModel
      .findOne({ userLow, userHigh })
      .exec();

    if (!connection) {
      return { targetUserId, state: 'none' };
    }

    if (connection.status === 'accepted') {
      return {
        targetUserId,
        state: 'connected',
        connectionId: String(connection._id),
      };
    }

    if (connection.status === 'pending') {
      const state: RelationshipState =
        String(connection.requesterId) === currentUserId
          ? 'outgoing_pending'
          : 'incoming_pending';
      return {
        targetUserId,
        state,
        connectionId: String(connection._id),
      };
    }

    return { targetUserId, state: 'none' };
  }

  /**
   * Sends a connection request from current user to target user.
   */
  async sendRequest(
    currentUserId: string,
    targetUserId: string,
  ): Promise<{
    success: boolean;
    state: RelationshipState;
    connectionId: string;
  }> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot connect with yourself.');
    }

    if (!Types.ObjectId.isValid(targetUserId)) {
      throw new BadRequestException('Invalid target user ID.');
    }

    // Verify recipient exists and is an active student
    const targetStudent = await this.userModel
      .findOne({
        _id: new Types.ObjectId(targetUserId),
        ...this.getEligibleStudentFilter(),
      })
      .select('_id')
      .exec();

    if (!targetStudent) {
      throw new NotFoundException('Student not found or unavailable.');
    }

    const { userLow, userHigh } = getNormalizedPair(
      currentUserId,
      targetUserId,
    );

    const existing = await this.connectionModel
      .findOne({ userLow, userHigh })
      .exec();

    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException(
          'You are already connected with this student.',
        );
      }

      if (existing.status === 'pending') {
        if (String(existing.requesterId) === currentUserId) {
          throw new BadRequestException('Connection request already sent.');
        }

        // Reverse request already exists from target -> auto-accept
        existing.status = 'accepted';
        await existing.save();
        return {
          success: true,
          state: 'connected',
          connectionId: String(existing._id),
        };
      }

      // Re-open previously declined or cancelled request
      existing.requesterId = new Types.ObjectId(currentUserId);
      existing.recipientId = new Types.ObjectId(targetUserId);
      existing.status = 'pending';
      await existing.save();

      return {
        success: true,
        state: 'outgoing_pending',
        connectionId: String(existing._id),
      };
    }

    const created = await this.connectionModel.create({
      requesterId: new Types.ObjectId(currentUserId),
      recipientId: new Types.ObjectId(targetUserId),
      userLow,
      userHigh,
      status: 'pending',
    });

    // Dispatch connection.requested notification asynchronously
    try {
      const requester = await this.userModel
        .findById(currentUserId)
        .select('name username avatar')
        .lean();
      if (requester) {
        await this.notificationsService.createNotification({
          recipientId: targetUserId,
          actorId: currentUserId,
          type: 'connection.requested',
          category: 'social',
          priority: 'important',
          title: `${requester.name || 'A student'} sent you a connection request`,
          message: 'You can review their profile and respond.',
          entityType: 'connection',
          entityId: String(created._id),
          actionUrl: '/network?tab=connections&subTab=requests',
          idempotencyKey: `conn_req_${currentUserId}_${targetUserId}`,
        });
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to dispatch connection.requested notification: ${err.message}`,
      );
    }

    return {
      success: true,
      state: 'outgoing_pending',
      connectionId: String(created._id),
    };
  }

  /**
   * Accepts an incoming connection request.
   */
  async acceptRequest(
    currentUserId: string,
    connectionId: string,
  ): Promise<{
    success: boolean;
    state: RelationshipState;
    connectionId: string;
  }> {
    if (!Types.ObjectId.isValid(connectionId)) {
      throw new BadRequestException('Invalid connection ID.');
    }

    const connection = await this.connectionModel.findById(connectionId).exec();

    if (!connection) {
      throw new NotFoundException('Connection request not found.');
    }

    if (String(connection.recipientId) !== currentUserId) {
      throw new ForbiddenException(
        'Only the recipient can accept this connection request.',
      );
    }

    if (connection.status === 'accepted') {
      return {
        success: true,
        state: 'connected',
        connectionId: String(connection._id),
      };
    }

    if (connection.status !== 'pending') {
      throw new BadRequestException(
        'This connection request is no longer pending.',
      );
    }

    connection.status = 'accepted';
    await connection.save();

    // Dispatch connection.accepted notification asynchronously
    try {
      const accepter = await this.userModel
        .findById(currentUserId)
        .select('name username avatar')
        .lean();
      if (accepter) {
        await this.notificationsService.createNotification({
          recipientId: String(connection.requesterId),
          actorId: currentUserId,
          type: 'connection.accepted',
          category: 'social',
          priority: 'normal',
          title: `${accepter.name || 'A student'} accepted your connection request`,
          message: 'You are now connected.',
          entityType: 'connection',
          entityId: String(connection._id),
          actionUrl: `/network/profile/${encodeURIComponent(accepter.username || '')}`,
          idempotencyKey: `conn_acc_${String(connection._id)}`,
        });
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to dispatch connection.accepted notification: ${err.message}`,
      );
    }

    return {
      success: true,
      state: 'connected',
      connectionId: String(connection._id),
    };
  }

  /**
   * Declines an incoming connection request.
   */
  async declineRequest(
    currentUserId: string,
    connectionId: string,
  ): Promise<{ success: boolean; state: RelationshipState }> {
    if (!Types.ObjectId.isValid(connectionId)) {
      throw new BadRequestException('Invalid connection ID.');
    }

    const connection = await this.connectionModel.findById(connectionId).exec();

    if (!connection) {
      throw new NotFoundException('Connection request not found.');
    }

    if (String(connection.recipientId) !== currentUserId) {
      throw new ForbiddenException(
        'Only the recipient can decline this connection request.',
      );
    }

    await this.connectionModel.findByIdAndDelete(connectionId).exec();

    return { success: true, state: 'none' };
  }

  /**
   * Cancels a sent connection request.
   */
  async cancelRequest(
    currentUserId: string,
    connectionId: string,
  ): Promise<{ success: boolean; state: RelationshipState }> {
    if (!Types.ObjectId.isValid(connectionId)) {
      throw new BadRequestException('Invalid connection ID.');
    }

    const connection = await this.connectionModel.findById(connectionId).exec();

    if (!connection) {
      throw new NotFoundException('Connection request not found.');
    }

    if (String(connection.requesterId) !== currentUserId) {
      throw new ForbiddenException(
        'Only the requester can cancel this request.',
      );
    }

    if (connection.status !== 'pending') {
      throw new BadRequestException(
        'Only pending connection requests can be cancelled.',
      );
    }

    await this.connectionModel.findByIdAndDelete(connectionId).exec();

    return { success: true, state: 'none' };
  }

  /**
   * Removes an existing active connection.
   */
  async removeConnection(
    currentUserId: string,
    connectionId: string,
  ): Promise<{ success: boolean; state: RelationshipState }> {
    let connection: ConnectionDocument | null = null;
    if (Types.ObjectId.isValid(connectionId)) {
      connection = await this.connectionModel.findById(connectionId).exec();
    }

    if (!connection) {
      const targetUser = await this.resolveUser(connectionId);
      if (targetUser) {
        const { userLow, userHigh } = getNormalizedPair(
          currentUserId,
          String(targetUser._id),
        );
        connection = await this.connectionModel
          .findOne({ userLow, userHigh })
          .exec();
      }
    }

    if (!connection) {
      throw new NotFoundException('Connection not found.');
    }

    if (
      String(connection.requesterId) !== currentUserId &&
      String(connection.recipientId) !== currentUserId
    ) {
      throw new ForbiddenException('You are not a member of this connection.');
    }

    await this.connectionModel.findByIdAndDelete(connectionId).exec();

    return { success: true, state: 'none' };
  }

  /**
   * Retrieves paginated connected students for current user.
   */
  async getConnections(
    currentUserId: string,
    query: GetConnectionsQueryDto,
  ): Promise<PaginatedConnectionsResponse> {
    const userObjId = new Types.ObjectId(currentUserId);

    let filter: Record<string, any> = {
      $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
      status: 'accepted',
    };

    if (query.q && query.q.trim()) {
      const cleanQ = escapeRegex(query.q.trim());
      const regex = new RegExp(cleanQ, 'i');
      const matchingUsers = await this.userModel
        .find({
          $or: [
            { name: regex },
            { username: regex },
            { headline: regex },
            { currentRole: regex },
            { 'course.courseName': regex },
          ],
        })
        .select('_id')
        .lean();
      const matchingIds = matchingUsers.map((u) => u._id);
      filter = {
        status: 'accepted',
        $or: [
          { requesterId: userObjId, recipientId: { $in: matchingIds } },
          { recipientId: userObjId, requesterId: { $in: matchingIds } },
        ],
      };
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 12));
    const skip = (page - 1) * limit;

    const [total, connections] = await Promise.all([
      this.connectionModel.countDocuments(filter),
      this.connectionModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    const otherUserIds = connections.map((c) =>
      String(c.requesterId) === currentUserId ? c.recipientId : c.requesterId,
    );

    const userDocs = await this.userModel
      .find({ _id: { $in: otherUserIds } })
      .select(
        'name username avatar headline currentRole course skills education gamification account_Status createdAt',
      )
      .exec();

    const userMap = new Map<string, UserDocument>();
    for (const u of userDocs) {
      userMap.set(String(u._id), u);
    }

    const data: ConnectionItem[] = [];
    for (const conn of connections) {
      const otherId =
        String(conn.requesterId) === currentUserId
          ? String(conn.recipientId)
          : String(conn.requesterId);

      const userDoc = userMap.get(otherId);
      if (userDoc) {
        const student = await this.transformStudent(userDoc, {
          state: 'connected',
          connectionId: String(conn._id),
        });

        data.push({
          connectionId: String(conn._id),
          user: student,
          connectedAt: conn.updatedAt
            ? new Date(conn.updatedAt).toISOString()
            : new Date().toISOString(),
        });
      }
    }

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      connections: data,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Retrieves pending incoming connection requests.
   */
  async getIncomingRequests(
    currentUserId: string,
  ): Promise<{ data: ConnectionRequestItem[]; total: number }> {
    const userObjId = new Types.ObjectId(currentUserId);

    const requests = await this.connectionModel
      .find({
        recipientId: userObjId,
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .exec();

    const requesterIds = requests.map((r) => r.requesterId);

    const userDocs = await this.userModel
      .find({ _id: { $in: requesterIds } })
      .select(
        'name username avatar headline currentRole course skills education gamification account_Status createdAt',
      )
      .exec();

    const userMap = new Map<string, UserDocument>();
    for (const u of userDocs) {
      userMap.set(String(u._id), u);
    }

    const data: ConnectionRequestItem[] = [];
    for (const req of requests) {
      const userDoc = userMap.get(String(req.requesterId));
      if (userDoc) {
        const student = await this.transformStudent(userDoc, {
          state: 'incoming_pending',
          connectionId: String(req._id),
        });

        data.push({
          connectionId: String(req._id),
          user: student,
          createdAt: req.createdAt
            ? new Date(req.createdAt).toISOString()
            : new Date().toISOString(),
        });
      }
    }

    return { data, total: data.length };
  }

  /**
   * Retrieves pending outgoing connection requests sent by current user.
   */
  async getOutgoingRequests(
    currentUserId: string,
  ): Promise<{ data: ConnectionRequestItem[]; total: number }> {
    const userObjId = new Types.ObjectId(currentUserId);

    const requests = await this.connectionModel
      .find({
        requesterId: userObjId,
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .exec();

    const recipientIds = requests.map((r) => r.recipientId);

    const userDocs = await this.userModel
      .find({ _id: { $in: recipientIds } })
      .select(
        'name username avatar headline currentRole course skills education gamification account_Status createdAt',
      )
      .exec();

    const userMap = new Map<string, UserDocument>();
    for (const u of userDocs) {
      userMap.set(String(u._id), u);
    }

    const data: ConnectionRequestItem[] = [];
    for (const req of requests) {
      const userDoc = userMap.get(String(req.recipientId));
      if (userDoc) {
        const student = await this.transformStudent(userDoc, {
          state: 'outgoing_pending',
          connectionId: String(req._id),
        });

        data.push({
          connectionId: String(req._id),
          user: student,
          createdAt: req.createdAt
            ? new Date(req.createdAt).toISOString()
            : new Date().toISOString(),
        });
      }
    }

    return { data, total: data.length };
  }

  /**
   * Retrieves real counts for connections, incoming requests, and outgoing requests.
   */
  async getConnectionCounts(
    currentUserId: string,
  ): Promise<ConnectionCountsResponse> {
    const userObjId = new Types.ObjectId(currentUserId);

    const [connectionsCount, incomingRequestsCount, outgoingRequestsCount] =
      await Promise.all([
        this.connectionModel.countDocuments({
          $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
          status: 'accepted',
        }),
        this.connectionModel.countDocuments({
          recipientId: userObjId,
          status: 'pending',
        }),
        this.connectionModel.countDocuments({
          requesterId: userObjId,
          status: 'pending',
        }),
      ]);

    return {
      connectionsCount,
      incomingRequestsCount,
      outgoingRequestsCount,
    };
  }

  /**
   * Retrieves real personal network metrics and platform telemetry.
   */
  async getNetworkStats(currentUserId?: string): Promise<{
    activeStudentsCount: number;
    connectionsCount: number;
    pendingRequestsCount: number;
    sentRequestsCount: number;
    joinedCommunitiesCount: number;
  }> {
    const userObjId =
      currentUserId && Types.ObjectId.isValid(currentUserId)
        ? new Types.ObjectId(currentUserId)
        : null;

    const [
      activeStudentsCount,
      connectionsCount,
      pendingRequestsCount,
      sentRequestsCount,
      joinedCommunitiesCount,
    ] = await Promise.all([
      this.userModel.countDocuments(this.getEligibleStudentFilter()),
      userObjId
        ? this.connectionModel.countDocuments({
            $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
            status: 'accepted',
          })
        : 0,
      userObjId
        ? this.connectionModel.countDocuments({
            recipientId: userObjId,
            status: 'pending',
          })
        : 0,
      userObjId
        ? this.connectionModel.countDocuments({
            requesterId: userObjId,
            status: 'pending',
          })
        : 0,
      userObjId
        ? this.membershipModel.countDocuments({
            userId: userObjId,
            status: 'active',
          })
        : 0,
    ]);

    return {
      activeStudentsCount,
      connectionsCount,
      pendingRequestsCount,
      sentRequestsCount,
      joinedCommunitiesCount,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE NETWORK STATISTICS & FOLLOWER / RELATIONSHIP ENHANCEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Helper to resolve a User document by string ID or username.
   */
  async resolveUser(userIdOrUsername: string): Promise<UserDocument | null> {
    if (!userIdOrUsername) return null;
    const cleanId = String(userIdOrUsername).trim();
    if (Types.ObjectId.isValid(cleanId)) {
      return this.userModel.findById(cleanId).exec();
    }
    return this.userModel.findOne({ username: cleanId.toLowerCase() }).exec();
  }

  /**
   * Helper to enrich a list of user documents with viewer's relationship state and avatar URLs.
   */
  private async enrichNetworkUsers(
    users: any[],
    viewerUserId?: string,
    followedDateMap?: Map<string, string>,
    connDateMap?: Map<string, { date: string; connId: string }>,
  ): Promise<NetworkUserItem[]> {
    if (!users || users.length === 0) return [];

    const otherUserIds = users.map((u) => String(u._id));
    const viewerIdStr = viewerUserId ? String(viewerUserId) : '';
    const viewerObjId =
      viewerUserId && Types.ObjectId.isValid(viewerUserId)
        ? new Types.ObjectId(viewerUserId)
        : null;

    const viewerFollowsMap = new Set<string>();
    const viewerFollowedByMap = new Set<string>();
    const viewerConnMap = new Map<
      string,
      { status: string; connId: string; isRequester: boolean }
    >();

    if (viewerObjId) {
      const connDocs = await this.connectionModel
        .find({
          $or: [
            {
              requesterId: viewerObjId,
              recipientId: {
                $in: otherUserIds
                  .filter((id) => Types.ObjectId.isValid(id))
                  .map((id) => new Types.ObjectId(id)),
              },
            },
            {
              recipientId: viewerObjId,
              requesterId: {
                $in: otherUserIds
                  .filter((id) => Types.ObjectId.isValid(id))
                  .map((id) => new Types.ObjectId(id)),
              },
            },
          ],
        })
        .lean();

      connDocs.forEach((c) => {
        const otherId =
          String(c.requesterId) === viewerIdStr
            ? String(c.recipientId)
            : String(c.requesterId);
        viewerConnMap.set(otherId, {
          status: c.status,
          connId: String(c._id),
          isRequester: String(c.requesterId) === viewerIdStr,
        });
      });
    }

    const items: NetworkUserItem[] = [];
    for (const u of users) {
      const uId = String(u._id);
      const isSelf = uId === viewerIdStr;

      let connectionStatus = 'none';
      let connectionId: string | null = null;
      let isFollowing = false;
      let isFollowedBy = false;

      if (isSelf) {
        connectionStatus = 'self';
      } else if (viewerConnMap.has(uId)) {
        const c = viewerConnMap.get(uId);
        connectionId = c.connId;
        if (c.status === 'accepted') {
          connectionStatus = 'connected';
          isFollowing = true;
          isFollowedBy = true;
        } else if (c.status === 'pending') {
          if (c.isRequester) {
            connectionStatus = 'pending_sent';
            isFollowing = true;
            isFollowedBy = false;
          } else {
            connectionStatus = 'pending_received';
            isFollowing = false;
            isFollowedBy = true;
          }
        }
      }

      let avatarUrl = '';
      if (u.avatar) {
        avatarUrl = await this.signedUrlService.generateSignedImageUrl(
          u.avatar,
        );
      }

      items.push({
        _id: uId,
        name: u.name || 'Student',
        username: u.username || '',
        email: u.email || '',
        avatar: u.avatar || '',
        avatarUrl,
        headline: u.headline || u.currentRole || '',
        currentRole: u.currentRole || '',
        role: u.role || 'student',
        isFollowing,
        isFollowedBy,
        connectionStatus,
        connectionId: connectionId || connDateMap?.get(uId)?.connId || null,
        followedSince: followedDateMap?.get(uId) || undefined,
        connectedSince: connDateMap?.get(uId)?.date || undefined,
      });
    }

    return items;
  }

  /**
   * Retrieves profile network statistics (followers, following, connections, and relationship with viewer).
   * Backed purely by authoritative database counting (countDocuments) on network_connections.
   */
  async getProfileNetworkStats(
    userIdOrUsername: string,
    viewerUserId?: string,
  ): Promise<ProfileNetworkStatsResponse> {
    const targetUser = await this.resolveUser(
      userIdOrUsername === 'me' ? viewerUserId : userIdOrUsername,
    );
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    const targetUserIdStr = String(targetUser._id);
    const targetUserObjId = targetUser._id;

    // Authoritative database-level counting on network_connections
    const [followersCount, followingCount, connectionsCount] =
      await Promise.all([
        this.connectionModel.countDocuments({
          $or: [
            { requesterId: targetUserObjId, status: 'accepted' },
            {
              recipientId: targetUserObjId,
              status: { $in: ['accepted', 'pending'] },
            },
          ],
        }),
        this.connectionModel.countDocuments({
          $or: [
            { recipientId: targetUserObjId, status: 'accepted' },
            {
              requesterId: targetUserObjId,
              status: { $in: ['accepted', 'pending'] },
            },
          ],
        }),
        this.connectionModel.countDocuments({
          $or: [
            { requesterId: targetUserObjId },
            { recipientId: targetUserObjId },
          ],
          status: 'accepted',
        }),
      ]);

    let relationship: any = undefined;
    if (viewerUserId && Types.ObjectId.isValid(viewerUserId)) {
      const viewerIdStr = String(viewerUserId);
      const isSelf = viewerIdStr === targetUserIdStr;
      if (isSelf) {
        relationship = {
          isFollowing: false,
          isFollowedBy: false,
          connectionStatus: 'self',
          requestSent: false,
          requestReceived: false,
          connectionId: null,
        };
      } else {
        const { userLow, userHigh } = getNormalizedPair(
          viewerUserId,
          targetUserIdStr,
        );
        const connectionDoc = await this.connectionModel
          .findOne({ userLow, userHigh })
          .lean();

        let connectionStatus = 'none';
        let isFollowing = false;
        let isFollowedBy = false;
        let requestSent = false;
        let requestReceived = false;

        if (connectionDoc) {
          if (connectionDoc.status === 'accepted') {
            connectionStatus = 'connected';
            isFollowing = true;
            isFollowedBy = true;
          } else if (connectionDoc.status === 'pending') {
            if (String(connectionDoc.requesterId) === viewerIdStr) {
              connectionStatus = 'pending_sent';
              isFollowing = true;
              isFollowedBy = false;
              requestSent = true;
            } else {
              connectionStatus = 'pending_received';
              isFollowing = false;
              isFollowedBy = true;
              requestReceived = true;
            }
          }
        }

        relationship = {
          isFollowing,
          isFollowedBy,
          connectionStatus,
          requestSent,
          requestReceived,
          connectionId: connectionDoc ? String(connectionDoc._id) : null,
        };
      }
    }

    return {
      userId: targetUserIdStr,
      username: targetUser.username || '',
      followers: followersCount,
      following: followingCount,
      connections: connectionsCount,
      followersCount,
      followingCount,
      connectionsCount,
      relationship,
    };
  }

  /**
   * Retrieves paginated followers of a user with viewer relationship metadata.
   */
  async getUserFollowers(
    userIdOrUsername: string,
    viewerUserId?: string,
    query?: GetConnectionsQueryDto,
  ): Promise<PaginatedNetworkUsersResponse> {
    const targetUser = await this.resolveUser(
      userIdOrUsername === 'me' ? viewerUserId : userIdOrUsername,
    );
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }
    const targetUserIdStr = String(targetUser._id);
    const targetUserObjId = targetUser._id;

    // Follower connections in network_connections
    const connFilter = {
      $or: [
        { requesterId: targetUserObjId, status: 'accepted' },
        {
          recipientId: targetUserObjId,
          status: { $in: ['accepted', 'pending'] },
        },
      ],
    };

    const connections = await this.connectionModel
      .find(connFilter)
      .sort({ updatedAt: -1 })
      .lean();

    const followerUserIds = connections.map((c) =>
      String(c.requesterId) === targetUserIdStr
        ? String(c.recipientId)
        : String(c.requesterId),
    );
    const followDateMap = new Map<string, string>();
    connections.forEach((c) => {
      const otherId =
        String(c.requesterId) === targetUserIdStr
          ? String(c.recipientId)
          : String(c.requesterId);
      followDateMap.set(
        otherId,
        c.updatedAt
          ? new Date(c.updatedAt).toISOString()
          : new Date().toISOString(),
      );
    });

    const userFilter: any = {
      _id: {
        $in: followerUserIds
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      },
      'account_Status.isDeleted': { $ne: true },
      'account_Status.isBlocked': { $ne: true },
    };

    if (query?.q && query.q.trim()) {
      const regex = new RegExp(escapeRegex(query.q.trim()), 'i');
      userFilter.$or = [
        { name: regex },
        { username: regex },
        { headline: regex },
        { email: regex },
      ];
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, userDocs] = await Promise.all([
      this.userModel.countDocuments(userFilter),
      this.userModel
        .find(userFilter)
        .select(
          'name username avatar headline currentRole role email account_Status',
        )
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const enriched = await this.enrichNetworkUsers(
      userDocs,
      viewerUserId,
      followDateMap,
    );
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: enriched,
      followers: enriched,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Retrieves paginated following of a user with viewer relationship metadata.
   */
  async getUserFollowing(
    userIdOrUsername: string,
    viewerUserId?: string,
    query?: GetConnectionsQueryDto,
  ): Promise<PaginatedNetworkUsersResponse> {
    const targetUser = await this.resolveUser(
      userIdOrUsername === 'me' ? viewerUserId : userIdOrUsername,
    );
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }
    const targetUserIdStr = String(targetUser._id);
    const targetUserObjId = targetUser._id;

    // Following connections in network_connections
    const connFilter = {
      $or: [
        { recipientId: targetUserObjId, status: 'accepted' },
        {
          requesterId: targetUserObjId,
          status: { $in: ['accepted', 'pending'] },
        },
      ],
    };

    const connections = await this.connectionModel
      .find(connFilter)
      .sort({ updatedAt: -1 })
      .lean();

    const followingUserIds = connections.map((c) =>
      String(c.requesterId) === targetUserIdStr
        ? String(c.recipientId)
        : String(c.requesterId),
    );
    const followDateMap = new Map<string, string>();
    connections.forEach((c) => {
      const otherId =
        String(c.requesterId) === targetUserIdStr
          ? String(c.recipientId)
          : String(c.requesterId);
      followDateMap.set(
        otherId,
        c.updatedAt
          ? new Date(c.updatedAt).toISOString()
          : new Date().toISOString(),
      );
    });

    const userFilter: any = {
      _id: {
        $in: followingUserIds
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      },
      'account_Status.isDeleted': { $ne: true },
      'account_Status.isBlocked': { $ne: true },
    };

    if (query?.q && query.q.trim()) {
      const regex = new RegExp(escapeRegex(query.q.trim()), 'i');
      userFilter.$or = [
        { name: regex },
        { username: regex },
        { headline: regex },
        { email: regex },
      ];
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, userDocs] = await Promise.all([
      this.userModel.countDocuments(userFilter),
      this.userModel
        .find(userFilter)
        .select(
          'name username avatar headline currentRole role email account_Status',
        )
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const enriched = await this.enrichNetworkUsers(
      userDocs,
      viewerUserId,
      followDateMap,
    );
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: enriched,
      following: enriched,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Retrieves paginated accepted connections of a specific user with viewer relationship metadata.
   */
  async getUserConnections(
    userIdOrUsername: string,
    viewerUserId?: string,
    query?: GetConnectionsQueryDto,
  ): Promise<PaginatedNetworkUsersResponse> {
    const targetUser = await this.resolveUser(
      userIdOrUsername === 'me' ? viewerUserId : userIdOrUsername,
    );
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }
    const targetUserObjId = targetUser._id;
    const targetUserIdStr = String(targetUser._id);

    const connFilter: any = {
      $or: [{ requesterId: targetUserObjId }, { recipientId: targetUserObjId }],
      status: 'accepted',
    };

    const connections = await this.connectionModel
      .find(connFilter)
      .sort({ updatedAt: -1 })
      .lean();

    const otherUserIds = connections.map((c) =>
      String(c.requesterId) === targetUserIdStr
        ? String(c.recipientId)
        : String(c.requesterId),
    );
    const connDateMap = new Map<string, { date: string; connId: string }>();
    connections.forEach((c) => {
      const otherId =
        String(c.requesterId) === targetUserIdStr
          ? String(c.recipientId)
          : String(c.requesterId);
      connDateMap.set(otherId, {
        date: c.updatedAt
          ? new Date(c.updatedAt).toISOString()
          : new Date().toISOString(),
        connId: String(c._id),
      });
    });

    const userFilter: any = {
      _id: {
        $in: otherUserIds
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      },
      'account_Status.isDeleted': { $ne: true },
      'account_Status.isBlocked': { $ne: true },
    };

    if (query?.q && query.q.trim()) {
      const regex = new RegExp(escapeRegex(query.q.trim()), 'i');
      userFilter.$or = [
        { name: regex },
        { username: regex },
        { headline: regex },
        { email: regex },
      ];
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, userDocs] = await Promise.all([
      this.userModel.countDocuments(userFilter),
      this.userModel
        .find(userFilter)
        .select(
          'name username avatar headline currentRole role email account_Status',
        )
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const enriched = await this.enrichNetworkUsers(
      userDocs,
      viewerUserId,
      undefined,
      connDateMap,
    );
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: enriched,
      connections: enriched,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Follows a user. Creates a pending relationship in network_connections if none exists.
   */
  async followUser(
    currentUserId: string,
    targetUserIdOrUsername: string,
  ): Promise<{
    success: boolean;
    isFollowing: boolean;
    followersCount: number;
  }> {
    const targetUser = await this.resolveUser(targetUserIdOrUsername);
    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }
    const targetUserIdStr = String(targetUser._id);
    if (currentUserId === targetUserIdStr) {
      throw new BadRequestException('You cannot follow yourself.');
    }

    if (
      targetUser.account_Status?.isBlocked ||
      targetUser.account_Status?.isDeleted
    ) {
      throw new BadRequestException('This user account is not active.');
    }

    const { userLow, userHigh } = getNormalizedPair(
      currentUserId,
      targetUserIdStr,
    );
    let connection = await this.connectionModel
      .findOne({ userLow, userHigh })
      .exec();

    if (!connection) {
      connection = await this.connectionModel.create({
        requesterId: new Types.ObjectId(currentUserId),
        recipientId: targetUser._id,
        userLow,
        userHigh,
        status: 'pending',
      });

      try {
        const follower = await this.userModel
          .findById(currentUserId)
          .select('name username avatar')
          .lean();
        if (follower) {
          await this.notificationsService.createNotification({
            recipientId: targetUserIdStr,
            actorId: currentUserId,
            type: 'follow',
            category: 'social',
            priority: 'normal',
            title: 'New Follower',
            message: `${follower.name || `@${follower.username}`} started following you.`,
            entityType: 'user',
            entityId: currentUserId,
            actionUrl: `/network/profile/${encodeURIComponent(follower.username || '')}`,
            idempotencyKey: `follow_${currentUserId}_${targetUserIdStr}`,
          });
        }
      } catch (err: any) {
        this.logger.warn(
          `Failed to dispatch follow notification: ${err.message}`,
        );
      }
    } else if (
      connection.status === 'declined' ||
      connection.status === 'cancelled'
    ) {
      connection.status = 'pending';
      connection.requesterId = new Types.ObjectId(currentUserId);
      connection.recipientId = targetUser._id;
      await connection.save();
    }

    const followersCount = await this.connectionModel.countDocuments({
      $or: [
        { requesterId: targetUser._id, status: 'accepted' },
        {
          recipientId: targetUser._id,
          status: { $in: ['accepted', 'pending'] },
        },
      ],
    });

    return { success: true, isFollowing: true, followersCount };
  }

  /**
   * Unfollows a user.
   */
  async unfollowUser(
    currentUserId: string,
    targetUserIdOrUsername: string,
  ): Promise<{
    success: boolean;
    isFollowing: boolean;
    followersCount: number;
  }> {
    const targetUser = await this.resolveUser(targetUserIdOrUsername);
    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }
    const targetUserIdStr = String(targetUser._id);
    if (currentUserId === targetUserIdStr) {
      throw new BadRequestException('You cannot unfollow yourself.');
    }

    const { userLow, userHigh } = getNormalizedPair(
      currentUserId,
      targetUserIdStr,
    );
    const connection = await this.connectionModel
      .findOne({ userLow, userHigh })
      .exec();

    if (connection) {
      if (
        connection.status === 'pending' &&
        String(connection.requesterId) === currentUserId
      ) {
        await this.connectionModel.deleteOne({ _id: connection._id }).exec();
      } else if (connection.status === 'accepted') {
        await this.connectionModel.deleteOne({ _id: connection._id }).exec();
      }
    }

    const followersCount = await this.connectionModel.countDocuments({
      $or: [
        { requesterId: targetUser._id, status: 'accepted' },
        {
          recipientId: targetUser._id,
          status: { $in: ['accepted', 'pending'] },
        },
      ],
    });

    return { success: true, isFollowing: false, followersCount };
  }

  /**
   * Phase 4: Retrieves full public student profile with safe projection:
   * - Public learning identity, course enrollments, achievements, and activity
   * - Privacy boundary enforcement (returns privacy state if profile is private)
   * - Accurate relationship state with the requesting user
   */
  async getStudentProfile(
    rawUsername: string,
    currentUserId?: string,
  ): Promise<PublicNetworkProfile> {
    const clean = rawUsername.trim().replace(/^@/, '');
    let userDoc: UserDocument | null = null;

    if (Types.ObjectId.isValid(clean)) {
      userDoc = await this.userModel
        .findOne({
          _id: new Types.ObjectId(clean),
          ...this.getEligibleStudentFilter(),
        })
        .exec();
    }

    if (!userDoc) {
      userDoc = await this.userModel
        .findOne({
          username: clean.toLowerCase(),
          ...this.getEligibleStudentFilter(),
        })
        .exec();
    }

    if (!userDoc) {
      throw new NotFoundException(
        `Student profile not found or is no longer available.`,
      );
    }

    const targetUserId = String(userDoc._id);
    const isOwner = Boolean(currentUserId && currentUserId === targetUserId);

    // 1. Resolve relationship state
    let relationshipState: RelationshipState = 'none';
    let connectionId: string | undefined = undefined;

    if (currentUserId) {
      if (isOwner) {
        relationshipState = 'self';
      } else {
        const { userLow, userHigh } = getNormalizedPair(
          currentUserId,
          targetUserId,
        );
        const conn = await this.connectionModel
          .findOne({ userLow, userHigh })
          .exec();

        if (conn) {
          connectionId = String(conn._id);
          if (conn.status === 'accepted') {
            relationshipState = 'connected';
          } else if (conn.status === 'pending') {
            relationshipState =
              String(conn.requesterId) === currentUserId
                ? 'outgoing_pending'
                : 'incoming_pending';
          }
        }
      }
    }

    // 2. Resolve signed URLs
    let avatarUrl: string | undefined = undefined;
    if (userDoc.avatar) {
      avatarUrl = await this.signedUrlService.generateSignedImageUrl(
        userDoc.avatar,
      );
    }

    let backgroundImage: string | undefined = undefined;
    if (userDoc.backgroundImage) {
      backgroundImage = await this.signedUrlService.generateSignedImageUrl(
        userDoc.backgroundImage,
      );
    }

    // 3. Privacy check: if student has not published public profile and requester is not owner
    const isPrivate = Boolean(
      userDoc.publicProfilePublished === false && !isOwner,
    );

    if (isPrivate) {
      return {
        user: {
          id: targetUserId,
          name: userDoc.name,
          username: userDoc.username,
          avatarUrl,
          headline: userDoc.headline || '',
          isVerified: Boolean(userDoc.account_Status?.isVerified),
        },
        relationship: {
          state: relationshipState,
          connectionId,
        },
        isPrivate: true,
      };
    }

    // 4. Full safe public projection
    const enrolledCourses = Array.isArray(userDoc.course) ? userDoc.course : [];
    const primaryCourse = enrolledCourses[0]?.courseName || '';
    const institution =
      Array.isArray(userDoc.education) && userDoc.education.length > 0
        ? userDoc.education[0].institution
        : '';

    // Enrolled courses thumbnails
    const courseIds = enrolledCourses
      .map((c) => c.courseId)
      .filter((id): id is string => Boolean(id && Types.ObjectId.isValid(id)));

    const courseDocs =
      courseIds.length > 0
        ? await this.courseModel
            .find({
              _id: { $in: courseIds.map((id) => new Types.ObjectId(id)) },
            })
            .select('_id image coverImage')
            .lean()
            .exec()
        : [];

    const courseThumbMap = new Map<string, string>();
    for (const cDoc of courseDocs) {
      const img = cDoc.image || cDoc.coverImage;
      if (img) {
        const signed = await this.signedUrlService.generateSignedImageUrl(img);
        courseThumbMap.set(String(cDoc._id), signed);
      }
    }

    const publicCourses: PublicCourseItem[] = enrolledCourses
      .slice(0, 6)
      .map((c) => {
        const progressPercent = Math.min(
          100,
          Math.max(0, Math.round(c.learningProgress?.completionPercent || 0)),
        );
        const completed =
          progressPercent >= 100 ||
          Boolean(
            c.learningProgress?.completedClasses &&
            c.learningProgress.completedClasses >=
              (c.learningProgress.totalClasses || 1),
          );

        return {
          courseId: c.courseId,
          name: c.courseName,
          progressPercent,
          completed,
          totalClasses: c.learningProgress?.totalClasses,
          completedClasses: c.learningProgress?.completedClasses,
          thumbnail: courseThumbMap.get(c.courseId) || undefined,
        };
      });

    // Calculate max streak
    let maxStreak = 0;
    for (const c of enrolledCourses) {
      if (c.learningProgress?.streak && c.learningProgress.streak > maxStreak) {
        maxStreak = c.learningProgress.streak;
      }
    }

    // Achievements
    const rawAchievements = Array.isArray(userDoc.gamification?.achievements)
      ? userDoc.gamification.achievements
      : [];

    const publicAchievements: PublicAchievementItem[] = rawAchievements.map(
      (rawKey, idx) => {
        const meta = ACHIEVEMENT_METADATA[rawKey] || {
          title: rawKey,
          description: 'Milestone earned on Zeitnah LMS.',
          category: 'Achievement',
          icon: 'Award',
        };
        return {
          id: `achieve_${idx}_${rawKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          title: meta.title,
          description: meta.description,
          category: meta.category,
          icon: meta.icon,
        };
      },
    );

    // Public Activity from network_activities collection
    let userActivities = await this.activityModel
      .find({
        actorId: new Types.ObjectId(targetUserId),
        visibility: { $ne: 'private' },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (userActivities.length === 0) {
      await this.syncUserActivities(userDoc);
      userActivities = await this.activityModel
        .find({
          actorId: new Types.ObjectId(targetUserId),
          visibility: { $ne: 'private' },
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    const publicActivities: PublicActivityItem[] = userActivities.map((act) => {
      let title = 'Learning activity';
      switch (act.type) {
        case 'COURSE_COMPLETED':
          title = `Completed ${act.courseName || 'a course'}`;
          break;
        case 'LESSON_COMPLETED':
          title = `Completed ${act.lessonName || 'a lesson'} in ${act.courseName || 'course'}`;
          break;
        case 'COURSE_JOINED':
          title = `Enrolled in ${act.courseName || 'a new course'}`;
          break;
        case 'ACHIEVEMENT_EARNED':
          title = `Earned ${act.achievementName || 'an achievement'}`;
          break;
        case 'STREAK_MILESTONE':
          title = `Achieved a ${act.streakDays || 7}-day learning streak`;
          break;
      }
      return {
        id: act._id.toString(),
        type: act.type.toLowerCase(),
        title,
        timestamp: act.createdAt.toISOString(),
      };
    });

    return {
      user: {
        id: targetUserId,
        name: userDoc.name,
        username: userDoc.username,
        avatarUrl,
        backgroundImage,
        headline: userDoc.headline || '',
        bio: userDoc.bio || '',
        location: userDoc.location || '',
        isVerified: Boolean(
          userDoc.account_Status?.isVerified ||
          (userDoc as any).verification?.status === 'VERIFIED',
        ),
        primaryRole: (userDoc as any).primaryRole || 'STUDENT',
        capabilities: (userDoc as any).capabilities || ['STUDENT'],
        availability:
          (userDoc as any).availability || 'NOT_CURRENTLY_AVAILABLE',
        professionalInterests: (userDoc as any).professionalInterests || [],
        verification: (userDoc as any).verification || {
          status: 'UNVERIFIED',
          type: 'IDENTITY',
        },
        joinedAt: (userDoc as { createdAt?: Date }).createdAt
          ? new Date((userDoc as { createdAt?: Date }).createdAt).toISOString()
          : undefined,
      },
      identity: {
        course: primaryCourse,
        level: userDoc.gamification?.level || 1,
        rank: userDoc.gamification?.rank || 'Beginner',
        interests: Array.isArray(userDoc.skills)
          ? userDoc.skills.slice(0, 20)
          : [],
        institution,
      },
      learning: {
        stats: {
          enrolledCoursesCount: enrolledCourses.length,
          completedCoursesCount: userDoc.gamification?.completedCourses || 0,
          streak: maxStreak,
          totalPoints: userDoc.gamification?.totalPoints || 0,
        },
        courses: publicCourses,
      },
      achievements: publicAchievements,
      activity: publicActivities.slice(0, 6),
      relationship: {
        state: relationshipState,
        connectionId,
      },
      isPrivate: false,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: NETWORK ACTIVITY FEED & EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Records a single learning activity idempotently using idempotencyKey.
   */
  async recordActivity(input: {
    actorId: string | Types.ObjectId;
    type: NetworkActivityType;
    idempotencyKey: string;
    courseId?: string;
    courseName?: string;
    lessonId?: string;
    lessonName?: string;
    achievementId?: string;
    achievementName?: string;
    streakDays?: number;
    visibility?: NetworkActivityVisibility;
    createdAt?: Date;
  }): Promise<NetworkActivityDocument | null> {
    try {
      const actorObjectId =
        typeof input.actorId === 'string'
          ? new Types.ObjectId(input.actorId)
          : input.actorId;

      const doc = await this.activityModel.findOneAndUpdate(
        { idempotencyKey: input.idempotencyKey },
        {
          $setOnInsert: {
            actorId: actorObjectId,
            type: input.type,
            idempotencyKey: input.idempotencyKey,
            courseId: input.courseId,
            courseName: input.courseName,
            lessonId: input.lessonId,
            lessonName: input.lessonName,
            achievementId: input.achievementId,
            achievementName: input.achievementName,
            streakDays: input.streakDays,
            visibility: input.visibility || 'public',
            createdAt: input.createdAt || new Date(),
          },
        },
        { upsert: true, new: true },
      );
      return doc;
    } catch (err: unknown) {
      const mongoErr = err as {
        code?: number;
        message?: string;
        stack?: string;
      };
      if (mongoErr.code === 11000) {
        return null;
      }
      this.logger.error(
        `Failed to record activity: ${mongoErr.message || (err instanceof Error ? err.message : 'Unknown error')}`,
        mongoErr.stack,
      );
      return null;
    }
  }

  /**
   * Idempotently synchronizes authentic learning activities from a student's
   * enrolled courses and gamification state into the network_activities collection.
   */
  async syncUserActivities(user: UserDocument): Promise<void> {
    if (!user || !user._id) return;
    const actorId = user._id;
    const userWithTimestamps = user as UserDocument & {
      createdAt?: Date;
      updatedAt?: Date;
    };

    const activities: Array<{
      actorId: Types.ObjectId;
      type: NetworkActivityType;
      idempotencyKey: string;
      courseId?: string;
      courseName?: string;
      lessonId?: string;
      lessonName?: string;
      achievementId?: string;
      achievementName?: string;
      streakDays?: number;
      visibility: NetworkActivityVisibility;
      createdAt: Date;
    }> = [];

    // 1. Enrolled courses & course completions & lesson completions
    const courses = Array.isArray(user.course) ? user.course : [];
    for (const c of courses) {
      const courseId = c.courseId ? String(c.courseId) : '';
      const courseName = c.courseName || 'Course';

      // Course joined
      if (c.Start_Date || userWithTimestamps.createdAt) {
        const joinedDate = c.Start_Date
          ? new Date(c.Start_Date)
          : userWithTimestamps.createdAt
            ? new Date(userWithTimestamps.createdAt)
            : new Date();
        activities.push({
          actorId,
          type: 'COURSE_JOINED',
          idempotencyKey: `${String(actorId)}_COURSE_JOINED_${courseId || courseName.replace(/[^a-z0-9]/gi, '_')}`,
          courseId,
          courseName,
          visibility: 'public',
          createdAt: joinedDate,
        });
      }

      // Course completed
      const totalClasses = c.learningProgress?.totalClasses ?? 0;
      const completedClasses = c.learningProgress?.completedClasses ?? 0;
      const completionPercent = c.learningProgress?.completionPercent ?? 0;
      const isCompleted =
        (totalClasses > 0 && completedClasses >= totalClasses) ||
        completionPercent === 100;
      if (isCompleted) {
        activities.push({
          actorId,
          type: 'COURSE_COMPLETED',
          idempotencyKey: `${String(actorId)}_COURSE_COMPLETED_${courseId || courseName.replace(/[^a-z0-9]/gi, '_')}`,
          courseId,
          courseName,
          visibility: 'public',
          createdAt: c.End_Date ? new Date(c.End_Date) : new Date(),
        });
      }

      // Lesson completions
      if (Array.isArray(c.classProgress)) {
        for (const cp of c.classProgress) {
          if (cp.completed && cp.completedAt) {
            const classId = cp.classId ? String(cp.classId) : '';
            activities.push({
              actorId,
              type: 'LESSON_COMPLETED',
              idempotencyKey: `${String(actorId)}_LESSON_COMPLETED_${courseId}_${classId || cp.chapterCode || String(Math.random())}`,
              courseId,
              courseName,
              lessonId: classId,
              lessonName: cp.chapterCode
                ? `Lesson ${cp.chapterCode}`
                : undefined,
              visibility: 'public',
              createdAt: new Date(cp.completedAt),
            });
          }
        }
      }
    }

    // 2. Achievements
    const achievements = Array.isArray(user.gamification?.achievements)
      ? user.gamification.achievements
      : [];
    for (const ach of achievements) {
      const achSlug = String(ach)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      activities.push({
        actorId,
        type: 'ACHIEVEMENT_EARNED',
        idempotencyKey: `${String(actorId)}_ACHIEVEMENT_EARNED_${achSlug}`,
        achievementId: achSlug,
        achievementName: String(ach),
        visibility: 'public',
        createdAt: userWithTimestamps.updatedAt
          ? new Date(userWithTimestamps.updatedAt)
          : new Date(),
      });
    }

    // 3. Streak Milestones
    let maxStreak = 0;
    for (const c of courses) {
      const streak = c.learningProgress?.streak ?? 0;
      if (streak > maxStreak) {
        maxStreak = streak;
      }
    }
    if (
      user.gamification?.activityDates &&
      Array.isArray(user.gamification.activityDates)
    ) {
      maxStreak = Math.max(maxStreak, user.gamification.activityDates.length);
    }

    if (maxStreak >= 7) {
      activities.push({
        actorId,
        type: 'STREAK_MILESTONE',
        idempotencyKey: `${String(actorId)}_STREAK_MILESTONE_7`,
        streakDays: 7,
        visibility: 'public',
        createdAt: new Date(),
      });
    }
    if (maxStreak >= 30) {
      activities.push({
        actorId,
        type: 'STREAK_MILESTONE',
        idempotencyKey: `${String(actorId)}_STREAK_MILESTONE_30`,
        streakDays: 30,
        visibility: 'public',
        createdAt: new Date(),
      });
    }

    if (activities.length === 0) return;

    const ops = activities.map((act) => ({
      updateOne: {
        filter: { idempotencyKey: act.idempotencyKey },
        update: { $setOnInsert: act },
        upsert: true,
      },
    }));

    try {
      await this.activityModel.bulkWrite(ops, { ordered: false });
    } catch (err: unknown) {
      const mongoErr = err as { code?: number; message?: string };
      if (mongoErr.code !== 11000) {
        this.logger.warn(
          `bulkWrite partial failure during syncUserActivities: ${mongoErr.message || (err instanceof Error ? err.message : 'Unknown error')}`,
        );
      }
    }
  }

  /**
   * If the activity collection is empty or sparse, bootstrap from existing active students.
   */
  private async bootstrapInitialActivities(): Promise<void> {
    try {
      const count = await this.activityModel.estimatedDocumentCount();
      if (count < 20) {
        const sampleStudents = await this.userModel
          .find({
            role: 'student',
            'account_Status.isBlocked': { $ne: true },
            'account_Status.isDeleted': { $ne: true },
          })
          .sort({ 'account_Status.lastSeen': -1, updatedAt: -1 })
          .limit(30)
          .exec();

        for (const student of sampleStudents) {
          await this.syncUserActivities(student);
        }
      }
    } catch (err: unknown) {
      this.logger.warn(
        `bootstrapInitialActivities failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Phase 5: Retrieves paginated network activity feed with scope & type filtering,
   * batch entity resolution (actors, thumbnails, relationships).
   */
  async getActivityFeed(
    query: GetNetworkActivityQueryDto,
    currentUserId?: string,
  ): Promise<PaginatedNetworkActivityResponse> {
    await this.bootstrapInitialActivities();

    const filter: Record<string, unknown> = {
      visibility: { $ne: 'private' },
    };

    // Scope filtering
    if (query.scope === 'connections') {
      if (!currentUserId || !Types.ObjectId.isValid(currentUserId)) {
        return {
          data: [],
          page: 1,
          limit: query.limit || 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
        };
      }

      const userConnections = await this.connectionModel
        .find({
          $or: [
            { requesterId: new Types.ObjectId(currentUserId) },
            { recipientId: new Types.ObjectId(currentUserId) },
          ],
          status: 'accepted',
        })
        .select('requesterId recipientId')
        .lean();

      const friendIds = userConnections.map((c) =>
        c.requesterId.toString() === currentUserId
          ? c.recipientId
          : c.requesterId,
      );

      if (friendIds.length === 0) {
        return {
          data: [],
          page: 1,
          limit: query.limit || 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
        };
      }

      filter.actorId = { $in: friendIds };
    }

    // Type filtering
    if (query.type && query.type !== 'all') {
      switch (query.type) {
        case 'courses':
          filter.type = { $in: ['COURSE_COMPLETED', 'COURSE_JOINED'] };
          break;
        case 'achievements':
          filter.type = 'ACHIEVEMENT_EARNED';
          break;
        case 'streaks':
          filter.type = 'STREAK_MILESTONE';
          break;
        case 'lessons':
          filter.type = 'LESSON_COMPLETED';
          break;
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [total, rawActivities] = await Promise.all([
      this.activityModel.countDocuments(filter),
      this.activityModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    if (rawActivities.length === 0) {
      return {
        data: [],
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
      };
    }

    // Collect actor IDs & course IDs
    const actorIdStrings = [
      ...new Set(rawActivities.map((a) => a.actorId.toString())),
    ];
    const actorObjectIds = actorIdStrings
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const courseIdStrings = [
      ...new Set(
        rawActivities
          .map((a) => a.courseId)
          .filter((id): id is string =>
            Boolean(id && Types.ObjectId.isValid(id)),
          ),
      ),
    ];
    const courseObjectIds = courseIdStrings.map((id) => new Types.ObjectId(id));

    // Batch query users (filtering out blocked or deleted users)
    type CourseMeta = {
      _id: Types.ObjectId;
      name?: string;
      coverImage?: string;
      image?: string;
    };

    const [actors, courses] = await Promise.all([
      this.userModel
        .find({
          _id: { $in: actorObjectIds },
          'account_Status.isBlocked': { $ne: true },
          'account_Status.isDeleted': { $ne: true },
        })
        .exec(),
      courseObjectIds.length > 0
        ? (this.courseModel
            .find({ _id: { $in: courseObjectIds } })
            .select('_id name coverImage image')
            .lean()
            .exec() as Promise<CourseMeta[]>)
        : Promise.resolve<CourseMeta[]>([]),
    ]);

    const actorMap = new Map<string, UserDocument>();
    for (const actor of actors) {
      actorMap.set(String(actor._id), actor);
    }

    const courseMap = new Map<string, CourseMeta>();
    for (const c of courses) {
      courseMap.set(String(c._id), c);
    }

    // Pre-sign avatars
    const avatarMap = new Map<string, string>();
    await Promise.all(
      actors.map(async (actor) => {
        if (actor.avatar) {
          try {
            const url = await this.signedUrlService.generateSignedImageUrl(
              actor.avatar,
            );
            avatarMap.set(String(actor._id), url);
          } catch {
            avatarMap.set(String(actor._id), '');
          }
        }
      }),
    );

    // Pre-sign course thumbnails
    const thumbnailMap = new Map<string, string>();
    await Promise.all(
      courses.map(async (course) => {
        const rawImg = course.coverImage || course.image;
        if (rawImg) {
          try {
            const url =
              await this.signedUrlService.generateSignedImageUrl(rawImg);
            thumbnailMap.set(String(course._id), url);
          } catch {
            thumbnailMap.set(String(course._id), '');
          }
        }
      }),
    );

    // Batch query relationships if currentUserId
    const relationshipMap = new Map<
      string,
      { state: RelationshipState; connectionId?: string }
    >();

    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const targetIds = actorIdStrings.filter((id) => id !== currentUserId);
      if (targetIds.length > 0) {
        const pairs = targetIds.map((id) =>
          getNormalizedPair(currentUserId, id),
        );
        const connections = await this.connectionModel
          .find({
            $or: pairs.map((p) => ({
              userLow: p.userLow,
              userHigh: p.userHigh,
            })),
          })
          .lean();

        for (const conn of connections) {
          const partnerId =
            conn.requesterId.toString() === currentUserId
              ? conn.recipientId.toString()
              : conn.requesterId.toString();

          let state: RelationshipState = 'none';
          if (conn.status === 'accepted') {
            state = 'connected';
          } else if (conn.status === 'pending') {
            state =
              conn.requesterId.toString() === currentUserId
                ? 'outgoing_pending'
                : 'incoming_pending';
          }
          relationshipMap.set(partnerId, {
            state,
            connectionId: conn._id.toString(),
          });
        }
      }
    }

    // Construct enriched response items
    const data: NetworkActivityResponseItem[] = [];

    for (const item of rawActivities) {
      const actorIdStr = item.actorId.toString();
      const actorDoc = actorMap.get(actorIdStr);

      // Exclude activity if actor is missing, blocked, or deleted
      if (!actorDoc) continue;

      const isSelf = currentUserId === actorIdStr;
      const rel = isSelf
        ? { state: 'self' as const }
        : relationshipMap.get(actorIdStr) || {
            state: 'none' as const,
          };

      const courseDoc = item.courseId ? courseMap.get(item.courseId) : null;
      const thumbnail = item.courseId
        ? thumbnailMap.get(item.courseId)
        : undefined;

      data.push({
        id: item._id.toString(),
        actor: {
          id: actorIdStr,
          name: actorDoc.name || 'Student',
          username: actorDoc.username || '',
          avatarUrl: avatarMap.get(actorIdStr) || '',
          headline: actorDoc.headline || actorDoc.currentRole || '',
          isVerified: Boolean(actorDoc.account_Status?.isVerified),
        },
        type: item.type,
        context: {
          courseId: item.courseId,
          courseName: item.courseName || courseDoc?.name,
          lessonId: item.lessonId,
          lessonName: item.lessonName,
          achievementId: item.achievementId,
          achievementName: item.achievementName,
          streakDays: item.streakDays,
          thumbnail,
        },
        createdAt: item.createdAt.toISOString(),
        relationship: rel,
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
   * Phase 5: Retrieves summary statistics for the network activity section.
   */
  async getActivitySummary(
    currentUserId?: string,
  ): Promise<NetworkActivitySummaryResponse> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      activeConnectionsCount,
      weeklyMilestonesCount,
      weeklyAchievementsCount,
    ] = await Promise.all([
      currentUserId && Types.ObjectId.isValid(currentUserId)
        ? this.connectionModel.countDocuments({
            $or: [
              { requesterId: new Types.ObjectId(currentUserId) },
              { recipientId: new Types.ObjectId(currentUserId) },
            ],
            status: 'accepted',
          })
        : 0,
      this.activityModel.countDocuments({
        type: {
          $in: [
            'COURSE_COMPLETED',
            'LESSON_COMPLETED',
            'STREAK_MILESTONE',
            'COURSE_JOINED',
          ],
        },
        createdAt: { $gte: oneWeekAgo },
        visibility: { $ne: 'private' },
      }),
      this.activityModel.countDocuments({
        type: 'ACHIEVEMENT_EARNED',
        createdAt: { $gte: oneWeekAgo },
        visibility: { $ne: 'private' },
      }),
    ]);

    return {
      activeConnectionsCount,
      weeklyMilestonesCount,
      weeklyAchievementsCount,
    };
  }
}
