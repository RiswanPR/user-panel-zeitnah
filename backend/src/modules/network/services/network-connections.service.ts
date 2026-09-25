import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NetworkConnection,
  NetworkConnectionDocument,
} from '../schemas/connection.schema';
import { User, UserDocument } from '../../auth/schemas/user.schema';
import {
  Notification,
  NotificationDocument,
} from '../../notifications/notification.schema';
import { QueryPeopleDto } from '../dto/network.dto';
import { escapeRegex } from '../../../common/utils/regex.util';
import { SignedUrlService } from '../../../common/aws/signed-url.service';
import { ModerationService } from '../../moderation/moderation.service';

@Injectable()
export class NetworkConnectionsService {
  constructor(
    @InjectModel(NetworkConnection.name)
    private connectionModel: Model<NetworkConnectionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @Optional()
    private signedUrlService?: SignedUrlService,
    @Optional()
    private moderationService?: ModerationService,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ID format');
  }

  private getOrderedUserIds(
    idA: string,
    idB: string,
  ): [Types.ObjectId, Types.ObjectId] {
    const sA = String(idA);
    const sB = String(idB);
    return sA < sB
      ? [this.toObjectId(sA), this.toObjectId(sB)]
      : [this.toObjectId(sB), this.toObjectId(sA)];
  }

  /**
   * Infrastructure People Directory discovery with search, canonical filters,
   * mutual connections, and smart discovery signals.
   */
  async getPeople(userId: string, query: QueryPeopleDto) {
    const userObjId = this.toObjectId(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 50);
    const skip = (page - 1) * limit;

    // Fetch caller's profile to compute smart recommendation signals
    const callerUser = await this.userModel.findById(userObjId).lean();

    // Respect Safety & Blocking
    let excludedUserIds: string[] = [];
    if (this.moderationService) {
      excludedUserIds = await this.moderationService.getExcludedUserIds(userId);
    }
    const excludedObjIds = excludedUserIds.map((id) => this.toObjectId(id));

    const filter: any = {
      _id: { $ne: userObjId, $nin: excludedObjIds },
      'account_Status.isDeleted': { $ne: true },
      'account_Status.isBlocked': { $ne: true },
      profileVisibility: { $ne: 'PRIVATE' },
    };

    // Role filter (Student, Educator, Professional, Mentor, Recruiter, Founder)
    if (query.role && query.role !== 'all') {
      const upperRole = query.role.trim().toUpperCase();
      const lowerRole = query.role.trim().toLowerCase();
      filter.$or = [
        { primaryRole: upperRole },
        { role: lowerRole },
      ];
    }

    // Discipline filter
    if (query.discipline && query.discipline !== 'all') {
      const cleanDiscipline = escapeRegex(query.discipline.trim());
      filter.primaryDiscipline = new RegExp(`^${cleanDiscipline}$`, 'i');
    }

    // Specialization filter
    if (query.specialization && query.specialization !== 'all') {
      const cleanSpec = escapeRegex(query.specialization.trim());
      filter.specializations = new RegExp(`^${cleanSpec}$`, 'i');
    }

    // Infrastructure Sector filter
    if (query.sector && query.sector !== 'all') {
      const cleanSector = escapeRegex(query.sector.trim());
      filter.infrastructureSectors = new RegExp(`^${cleanSector}$`, 'i');
    }

    // Skill filter
    if (query.skill && query.skill.trim()) {
      const cleanSkill = escapeRegex(query.skill.trim());
      const sReg = new RegExp(`^${cleanSkill}$`, 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { skills: sReg },
          { 'structuredSkills.technicalSkills': sReg },
          { 'structuredSkills.industrySkills': sReg },
        ],
      });
    }

    // Software filter
    if (query.software && query.software.trim()) {
      const cleanSoftware = escapeRegex(query.software.trim());
      const swReg = new RegExp(`^${cleanSoftware}$`, 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { 'structuredSkills.softwareSkills': swReg },
          { 'experience.softwareUsed': swReg },
        ],
      });
    }

    // Experience filter (numeric parsing)
    if (query.experience && query.experience !== 'all') {
      const expStr = query.experience.replace(/years?/gi, '').trim();
      if (expStr.includes('10+')) {
        filter.yearsOfExperience = { $gte: 10 };
      } else if (expStr.includes('5–10') || expStr.includes('5-10')) {
        filter.yearsOfExperience = { $gte: 5, $lte: 10 };
      } else if (expStr.includes('3–5') || expStr.includes('3-5')) {
        filter.yearsOfExperience = { $gte: 3, $lte: 5 };
      } else if (expStr.includes('1–3') || expStr.includes('1-3')) {
        filter.yearsOfExperience = { $gte: 1, $lte: 3 };
      } else if (expStr.includes('0–1') || expStr.includes('0-1')) {
        filter.yearsOfExperience = { $gte: 0, $lte: 1 };
      }
    } else if (query.minExperience !== undefined || query.maxExperience !== undefined) {
      filter.yearsOfExperience = {};
      if (query.minExperience !== undefined) filter.yearsOfExperience.$gte = Number(query.minExperience);
      if (query.maxExperience !== undefined) filter.yearsOfExperience.$lte = Number(query.maxExperience);
    }

    // Location filter
    if (query.location && query.location.trim()) {
      const cleanLoc = escapeRegex(query.location.trim());
      const locReg = new RegExp(cleanLoc, 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { location: locReg },
          { preferredLocations: locReg },
          { 'experience.location': locReg },
        ],
      });
    }

    // Institution filter
    if (query.institution && query.institution.trim()) {
      const cleanInst = escapeRegex(query.institution.trim());
      filter['education.institution'] = new RegExp(cleanInst, 'i');
    }

    // Company filter
    if (query.company && query.company.trim()) {
      const cleanComp = escapeRegex(query.company.trim());
      filter['experience.organization'] = new RegExp(cleanComp, 'i');
    }

    // Full search (q) across public profile data
    if (query.q && query.q.trim()) {
      const cleanQ = escapeRegex(query.q.trim());
      const regex = new RegExp(cleanQ, 'i');
      const searchOr = [
        { name: regex },
        { username: regex },
        { headline: regex },
        { currentRole: regex },
        { primaryDiscipline: regex },
        { specializations: regex },
        { infrastructureSectors: regex },
        { skills: regex },
        { 'structuredSkills.softwareSkills': regex },
        { 'structuredSkills.technicalSkills': regex },
        { 'education.institution': regex },
        { 'experience.organization': regex },
        { location: regex },
      ];
      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or });
        delete filter.$or;
      }
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: searchOr });
    }

    const total = await this.userModel.countDocuments(filter);
    const users = await this.userModel
      .find(filter, {
        name: 1,
        username: 1,
        email: 1,
        role: 1,
        primaryRole: 1,
        avatar: 1,
        profileImage: 1,
        headline: 1,
        currentRole: 1,
        primaryDiscipline: 1,
        specializations: 1,
        infrastructureSectors: 1,
        structuredSkills: 1,
        yearsOfExperience: 1,
        location: 1,
        preferredLocations: 1,
        education: 1,
        experience: 1,
        skills: 1,
        course: 1,
        gamification: 1,
        privacySettings: 1,
        'account_Status.isVerified': 1,
        'verification.status': 1,
        createdAt: 1,
      })
      .sort({ 'gamification.totalPoints': -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 1. Fetch caller's connections for mutual calculations
    const callerConnections = await this.connectionModel
      .find({
        $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
        status: 'accepted',
      })
      .lean();

    const callerConnectionIdSet = new Set(
      callerConnections.map((c) =>
        c.requesterId.equals(userObjId)
          ? String(c.recipientId)
          : String(c.requesterId),
      ),
    );

    // 2. Fetch connection states between caller and returned page users
    const otherUserIds = users.map((u) => u._id);
    const pageConnections = await this.connectionModel
      .find({
        $or: [
          { requesterId: userObjId, recipientId: { $in: otherUserIds } },
          { recipientId: userObjId, requesterId: { $in: otherUserIds } },
        ],
      })
      .lean();

    const connMap = new Map<
      string,
      { status: string; connectionId: string; isRequester: boolean }
    >();
    pageConnections.forEach((c) => {
      const otherId = c.requesterId.equals(userObjId)
        ? String(c.recipientId)
        : String(c.requesterId);
      connMap.set(otherId, {
        status: c.status,
        connectionId: String(c._id),
        isRequester: c.requesterId.equals(userObjId),
      });
    });

    // 3. Fetch mutual connections between page users and caller's network
    const mutualConnectionsCountMap = new Map<string, number>();
    if (callerConnectionIdSet.size > 0 && otherUserIds.length > 0) {
      const callerConnObjIds = Array.from(callerConnectionIdSet).map(
        (id) => new Types.ObjectId(id),
      );
      const mutualRows = await this.connectionModel
        .find({
          $or: [
            {
              requesterId: { $in: otherUserIds },
              recipientId: { $in: callerConnObjIds },
            },
            {
              recipientId: { $in: otherUserIds },
              requesterId: { $in: callerConnObjIds },
            },
          ],
          status: 'accepted',
        })
        .lean();

      mutualRows.forEach((row) => {
        const pageUserId = otherUserIds.some((uid) => uid.equals(row.requesterId))
          ? String(row.requesterId)
          : String(row.recipientId);
        mutualConnectionsCountMap.set(
          pageUserId,
          (mutualConnectionsCountMap.get(pageUserId) || 0) + 1,
        );
      });
    }

    const enrichedUsers = await Promise.all(
      users.map(async (u: any) => {
        const conn = connMap.get(String(u._id));
        let connectionStatus = 'none';
        let isFollowing = false;
        if (conn) {
          if (conn.status === 'accepted') {
            connectionStatus = 'connected';
            isFollowing = true;
          } else if (conn.status === 'pending') {
            if (conn.isRequester) {
              connectionStatus = 'pending_sent';
              isFollowing = true;
            } else {
              connectionStatus = 'pending_received';
              isFollowing = false;
            }
          }
        }

        let avatarUrl = u.avatar || u.profileImage || '';
        if (this.signedUrlService && avatarUrl) {
          try {
            avatarUrl =
              await this.signedUrlService.generateSignedImageUrl(avatarUrl);
          } catch {
            // Keep original if signing fails
          }
        }

        const primaryCourse =
          Array.isArray(u.course) && u.course.length > 0
            ? u.course[0]?.courseName || ''
            : '';

        const primaryRole = (u.primaryRole || u.role || 'STUDENT').toUpperCase();
        const primaryDiscipline = u.primaryDiscipline || '';
        const specializations = Array.isArray(u.specializations)
          ? u.specializations
          : [];
        const infrastructureSectors = Array.isArray(u.infrastructureSectors)
          ? u.infrastructureSectors
          : [];
        const softwareSkills = Array.isArray(u.structuredSkills?.softwareSkills)
          ? u.structuredSkills.softwareSkills
          : [];
        const technicalSkills = Array.isArray(u.structuredSkills?.technicalSkills)
          ? u.structuredSkills.technicalSkills
          : [];
        const combinedSkills = Array.from(
          new Set([...(u.skills || []), ...softwareSkills, ...technicalSkills]),
        );
        const yearsOfExperience = Number(u.yearsOfExperience) || 0;
        const location =
          u.location ||
          (u.preferredLocations && u.preferredLocations[0]) ||
          '';
        const currentCompany =
          Array.isArray(u.experience) && u.experience.length > 0
            ? u.experience[0]?.organization || ''
            : '';
        const institution =
          Array.isArray(u.education) && u.education.length > 0
            ? u.education[0]?.institution || ''
            : '';
        const mutualConnectionsCount =
          mutualConnectionsCountMap.get(String(u._id)) || 0;

        // Factual, deterministic smart recommendation signals
        const reasons: string[] = [];
        if (mutualConnectionsCount > 0) {
          reasons.push(
            `${mutualConnectionsCount} mutual connection${
              mutualConnectionsCount > 1 ? 's' : ''
            }`,
          );
        }
        if (
          callerUser?.primaryDiscipline &&
          primaryDiscipline &&
          callerUser.primaryDiscipline.toLowerCase() ===
            primaryDiscipline.toLowerCase()
        ) {
          reasons.push(`Discipline: ${primaryDiscipline}`);
        }
        if (Array.isArray(callerUser?.infrastructureSectors)) {
          const commonSectors = infrastructureSectors.filter((s: string) =>
            callerUser.infrastructureSectors.some(
              (cs: string) => cs.toLowerCase() === s.toLowerCase(),
            ),
          );
          if (commonSectors.length > 0) {
            reasons.push(`Sector: ${commonSectors[0]}`);
          }
        }
        if (Array.isArray(callerUser?.structuredSkills?.softwareSkills)) {
          const commonSW = softwareSkills.filter((sw: string) =>
            callerUser.structuredSkills.softwareSkills.some(
              (csw: string) => csw.toLowerCase() === sw.toLowerCase(),
            ),
          );
          if (commonSW.length > 0) {
            reasons.push(`Software: ${commonSW[0]}`);
          }
        }

        const recommendationReason =
          reasons.length > 0
            ? `Because you both work with: ${reasons.slice(0, 2).join(' • ')}`
            : '';

        // Messaging privacy & capability
        const messagingPrivacy = u.privacySettings?.messaging || 'ANYONE';
        let canMessage = true;
        let messageAction = 'message'; // 'message' | 'request' | 'cannot_message'
        if (messagingPrivacy === 'NOBODY') {
          canMessage = false;
          messageAction = 'cannot_message';
        } else if (messagingPrivacy === 'CONNECTIONS_ONLY') {
          if (connectionStatus === 'connected') {
            canMessage = true;
            messageAction = 'message';
          } else {
            canMessage = false;
            messageAction = 'cannot_message';
          }
        } else {
          canMessage = true;
          messageAction =
            connectionStatus === 'connected' ? 'message' : 'request';
        }

        const headline =
          u.headline ||
          u.currentRole ||
          (primaryDiscipline
            ? `${primaryRole} · ${primaryDiscipline}`
            : primaryCourse
            ? `Student · ${primaryCourse}`
            : 'Infrastructure Professional');

        return {
          _id: u._id,
          id: String(u._id),
          name: u.name || (u.email ? u.email.split('@')[0] : 'Professional'),
          username: u.username || '',
          email: u.email || '',
          role: u.role || 'student',
          primaryRole,
          primaryDiscipline,
          specializations,
          infrastructureSectors,
          structuredSkills: u.structuredSkills || {
            technicalSkills,
            softwareSkills,
            industrySkills: [],
            professionalSkills: [],
          },
          yearsOfExperience,
          location,
          company: currentCompany,
          institution,
          avatar: avatarUrl,
          avatarUrl,
          headline,
          course: primaryCourse,
          skills: combinedSkills,
          interests: combinedSkills,
          mutualConnectionsCount,
          recommendationReason,
          canMessage,
          messageAction,
          level:
            u.gamification?.rank ||
            (u.gamification?.level
              ? `Level ${u.gamification.level}`
              : 'Beginner'),
          isVerified: Boolean(
            u.account_Status?.isVerified ||
            u.verification?.status === 'VERIFIED',
          ),
          connectionStatus,
          isFollowing,
          connectionId: conn?.connectionId || null,
        };
      }),
    );

    return {
      people: enrichedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Helper to sign an avatar URL for populated user docs.
   */
  private async signAvatar(url?: string): Promise<string> {
    if (!url) return '';
    if (!this.signedUrlService) return url;
    try {
      return await this.signedUrlService.generateSignedImageUrl(url);
    } catch {
      return url;
    }
  }

  /**
   * Helper to format populated user document safely.
   */
  private async formatPopulatedUser(raw: any) {
    if (!raw)
      return {
        _id: null,
        id: '',
        name: 'User',
        username: '',
        email: '',
        avatar: '',
      };
    const avatar = await this.signAvatar(raw.avatar || raw.profileImage);
    const primaryCourse =
      Array.isArray(raw.course) && raw.course.length > 0
        ? raw.course[0]?.courseName || ''
        : '';
    const headline =
      raw.headline ||
      raw.currentRole ||
      (primaryCourse ? `Student · ${primaryCourse}` : 'Student');

    return {
      _id: raw._id,
      id: String(raw._id),
      name: raw.name || (raw.email ? raw.email.split('@')[0] : 'User'),
      username: raw.username || '',
      email: raw.email || '',
      avatar,
      avatarUrl: avatar,
      role: raw.role || 'student',
      headline,
      course: primaryCourse,
      skills: Array.isArray(raw.skills) ? raw.skills : [],
      isVerified: Boolean(
        raw.account_Status?.isVerified ||
        raw.verification?.status === 'VERIFIED',
      ),
    };
  }

  /**
   * Get accepted connections
   */
  async getConnections(userId: string, query: any) {
    const userObjId = this.toObjectId(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 50);
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
      status: 'accepted',
    };

    const userFields =
      'name username email avatar profileImage role headline course skills account_Status verification';

    const total = await this.connectionModel.countDocuments(filter);
    const connections = await this.connectionModel
      .find(filter)
      .populate('requesterId', userFields)
      .populate('recipientId', userFields)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedConnections = await Promise.all(
      connections.map(async (c: any) => {
        const isRequester =
          String(c.requesterId?._id || c.requesterId) === String(userId);
        const rawPeer = isRequester ? c.recipientId : c.requesterId;
        const peer = await this.formatPopulatedUser(rawPeer);
        return {
          _id: c._id,
          id: String(c._id),
          connectedSince: c.updatedAt || c.createdAt,
          peer,
          // Flatten peer properties for components expecting top-level fields
          ...peer,
        };
      }),
    );

    return {
      connections: formattedConnections,
      data: formattedConnections,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page < (Math.ceil(total / limit) || 1),
    };
  }

  /**
   * Get pending connection requests (incoming and outgoing)
   */
  async getPendingRequests(userId: string) {
    const userObjId = this.toObjectId(userId);
    const userFields =
      'name username email avatar profileImage role headline course skills account_Status verification';

    const [incomingDocs, outgoingDocs] = await Promise.all([
      this.connectionModel
        .find({ recipientId: userObjId, status: 'pending' })
        .populate('requesterId', userFields)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      this.connectionModel
        .find({ requesterId: userObjId, status: 'pending' })
        .populate('recipientId', userFields)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const incoming = await Promise.all(
      incomingDocs.map(async (req: any) => {
        const requester = await this.formatPopulatedUser(req.requesterId);
        return {
          ...req,
          requesterId: requester,
          requester,
        };
      }),
    );

    const outgoing = await Promise.all(
      outgoingDocs.map(async (req: any) => {
        const recipient = await this.formatPopulatedUser(req.recipientId);
        return {
          ...req,
          recipientId: recipient,
          recipient,
        };
      }),
    );

    return { incoming, outgoing };
  }

  /**
   * Send a connection request
   */
  async sendConnectionRequest(requesterId: string, recipientId: string) {
    if (requesterId === recipientId) {
      throw new BadRequestException(
        'You cannot send a connection request to yourself.',
      );
    }

    const reqObjId = this.toObjectId(requesterId);
    const recObjId = this.toObjectId(recipientId);

    const recipient = await this.userModel.findById(recObjId);
    if (!recipient) {
      throw new NotFoundException('Target user not found.');
    }

    const [userLow, userHigh] = this.getOrderedUserIds(
      requesterId,
      recipientId,
    );

    const existing = await this.connectionModel.findOne({ userLow, userHigh });
    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException(
          'You are already connected with this user.',
        );
      }
      if (existing.status === 'pending') {
        throw new BadRequestException(
          'A connection request is already pending.',
        );
      }
      // If previously declined or cancelled, reset to pending
      existing.status = 'pending';
      existing.requesterId = reqObjId;
      existing.recipientId = recObjId;
      await existing.save();
      return existing;
    }

    const newConnection = await this.connectionModel.create({
      requesterId: reqObjId,
      recipientId: recObjId,
      userLow,
      userHigh,
      status: 'pending',
    });

    const requester = await this.userModel.findById(reqObjId, {
      name: 1,
      email: 1,
    });
    await this.notificationModel
      .create({
        recipientId: recObjId,
        actorId: reqObjId,
        type: 'connection_request',
        category: 'connections',
        priority: 'LOW',
        title: 'New Connection Request',
        message: `${requester?.name || requester?.email || 'Someone'} sent you a connection request.`,
        isRead: false,
        targetUrl: '/network?tab=connections',
      })
      .catch(() => {});

    return newConnection;
  }

  /**
   * Accept connection request
   */
  async acceptConnectionRequest(requestId: string, userId: string) {
    const connObjId = this.toObjectId(requestId);
    const userObjId = this.toObjectId(userId);

    const connection = await this.connectionModel.findById(connObjId);
    if (!connection) {
      throw new NotFoundException('Connection request not found.');
    }

    if (!connection.recipientId.equals(userObjId)) {
      throw new ForbiddenException(
        'Only the recipient can accept this connection request.',
      );
    }

    connection.status = 'accepted';
    await connection.save();

    const user = await this.userModel.findById(userObjId, {
      name: 1,
      email: 1,
    });
    await this.notificationModel
      .create({
        recipientId: connection.requesterId,
        actorId: userObjId,
        type: 'connection_accepted',
        category: 'connections',
        priority: 'LOW',
        title: 'Connection Accepted',
        message: `${user?.name || user?.email || 'A user'} accepted your connection request.`,
        isRead: false,
        targetUrl: '/network?tab=connections',
      })
      .catch(() => {});

    return { success: true, message: 'Connection accepted.' };
  }

  /**
   * Reject / Cancel / Remove connection
   */
  async removeConnection(connectionId: string, userId: string) {
    const connObjId = this.toObjectId(connectionId);
    const userObjId = this.toObjectId(userId);

    const connection = await this.connectionModel.findById(connObjId);
    if (!connection) {
      throw new NotFoundException('Connection not found.');
    }

    if (
      !connection.requesterId.equals(userObjId) &&
      !connection.recipientId.equals(userObjId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this connection.',
      );
    }

    await this.connectionModel.deleteOne({ _id: connObjId });
    return { success: true, message: 'Connection removed.' };
  }
}
