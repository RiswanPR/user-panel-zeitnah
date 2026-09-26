import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Optional,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import {
  INFRASTRUCTURE_DISCIPLINES,
  INFRASTRUCTURE_SECTORS,
  INFRASTRUCTURE_SOFTWARE,
  PROFILE_ROLES,
  USER_SELECTABLE_ROLES,
  WORK_MODES,
  EMPLOYMENT_TYPES,
  VISIBILITY_LEVELS,
} from './constants/infrastructure-taxonomy';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  Recommendation,
  RecommendationDocument,
} from './schemas/recommendation.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ExperienceDto } from './dto/experience.dto';
import { EducationDto } from './dto/education.dto';
import { CertificationDto } from './dto/certification.dto';
import {
  SubmitRecommendationDto,
  UpdateRecommendationStatusDto,
} from './dto/recommendation.dto';
import { PublishProfileDto } from './dto/publish-profile.dto';
import {
  awardPoints,
  ensureGamification,
  evaluateProfileMilestones,
  calculateAuthoritativeProfileCompletion,
  PROFILE_COMPLETION_REWARDS,
  syncGamificationStats,
} from '../../common/gamification.helpers';
import { UploadService } from '../../common/aws/upload.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { UsernameService } from './services/username.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  USERNAME_CHANGE_COOLDOWN_DAYS,
  USERNAME_CHANGE_COOLDOWN_MS,
} from '../../common/constants/reserved-usernames';
import { MatchingService } from '../matching/matching.service';
import { CareerIntelligenceService } from '../career-intelligence/career-intelligence.service';
import {
  VerificationRequest,
  VerificationRequestDocument,
  VerificationCategory,
  VerificationStatus,
} from './schemas/verification-request.schema';
import {
  Project,
  ProjectDocument,
  ProjectVisibility,
} from '../projects/schemas/project.schema';
import { UpdatePortfolioDto } from './dto/portfolio.dto';
import {
  CreateVerificationRequestDto,
  ReviewVerificationRequestDto,
} from './dto/verification.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Recommendation.name)
    private recommendationModel: Model<RecommendationDocument>,
    private uploadService: UploadService,
    private signedUrlService: SignedUrlService,
    private usernameService: UsernameService,
    private auditLogsService: AuditLogsService,
    @Optional()
    @InjectModel(VerificationRequest.name)
    private verificationRequestModel?: Model<VerificationRequestDocument>,
    @Optional()
    @InjectModel(Project.name)
    private projectModel?: Model<ProjectDocument>,
    @Optional()
    @Inject(forwardRef(() => MatchingService))
    private readonly matchingService?: MatchingService,
    @Optional()
    @Inject(forwardRef(() => CareerIntelligenceService))
    private readonly careerIntelligenceService?: CareerIntelligenceService,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
  ) {}

  private triggerCandidateMatchInvalidation(userId: string) {
    if (this.matchingService) {
      this.matchingService.invalidateCandidateMatches(userId).catch((err) => {
        this.logger.warn(
          `Failed invalidating candidate matches for ${userId}: ${err.message}`,
        );
      });
    }
    if (this.careerIntelligenceService) {
      this.careerIntelligenceService
        .invalidateUserCareerInsight(userId)
        .catch((err) => {
          this.logger.warn(
            `Failed invalidating career insight for ${userId}: ${err.message}`,
          );
        });
    }
  }

  // =========================================================================
  // USERNAME IDENTITY ENDPOINTS
  // =========================================================================

  /**
   * Retrieves the current user's username status, claim state, and cooldown details.
   */
  async getUsernameStatus(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('username usernameClaimed usernameChangedAt name');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let canChange = true;
    let nextAllowedDate: Date | null = null;
    let remainingDays = 0;

    if (user.usernameChangedAt) {
      const elapsed = Date.now() - new Date(user.usernameChangedAt).getTime();
      if (elapsed < USERNAME_CHANGE_COOLDOWN_MS) {
        canChange = false;
        const remainingMs = USERNAME_CHANGE_COOLDOWN_MS - elapsed;
        remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        nextAllowedDate = new Date(
          new Date(user.usernameChangedAt).getTime() +
            USERNAME_CHANGE_COOLDOWN_MS,
        );
      }
    }

    return {
      username: user.username || '',
      usernameClaimed: Boolean(user.usernameClaimed),
      usernameChangedAt: user.usernameChangedAt || null,
      canChange,
      remainingDays,
      nextAllowedDate,
      cooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
    };
  }

  /**
   * Checks if a candidate username is valid and available to claim.
   */
  async checkAvailability(rawUsername: string, currentUserId?: string) {
    const sanitized = this.usernameService.sanitize(rawUsername);
    const validation = this.usernameService.validate(sanitized);

    if (!validation.valid) {
      return {
        username: sanitized,
        available: false,
        reason: validation.reason,
      };
    }

    if (currentUserId) {
      const currentUser = await this.userModel
        .findById(currentUserId)
        .select('username');
      if (currentUser?.username === sanitized) {
        return {
          username: sanitized,
          available: true,
          isCurrent: true,
        };
      }
    }

    const existingUser = await this.userModel
      .findOne({
        username: sanitized,
        ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
      })
      .select('_id');

    if (existingUser) {
      return {
        username: sanitized,
        available: false,
        reason: 'This username is already taken. Please choose another.',
      };
    }

    return {
      username: sanitized,
      available: true,
    };
  }

  /**
   * Performs the initial first-time username claim decision.
   */
  async claimUsername(
    userId: string,
    requestedUsername: string,
    ipAddress = '',
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.usernameClaimed) {
      return this.changeUsername(userId, requestedUsername, ipAddress);
    }

    const sanitized = this.usernameService.sanitize(requestedUsername);
    const validation = this.usernameService.validate(sanitized);
    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    const existing = await this.userModel.findOne({
      username: sanitized,
      _id: { $ne: user._id },
    });

    if (existing) {
      throw new ConflictException(
        'Username is already taken. Please choose another.',
      );
    }

    const previousUsername = user.username || '';

    let updatedUser: any;
    try {
      updatedUser = await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
          usernameClaimed: false,
        },
        {
          $set: {
            username: sanitized,
            usernameClaimed: true,
          },
        },
        { returnDocument: 'after' },
      );
    } catch (err: any) {
      if (err.code === 11000 || err.message?.includes('duplicate key')) {
        throw new ConflictException(
          'Username is no longer available. Please choose another.',
        );
      }
      throw err;
    }

    if (!updatedUser) {
      return this.changeUsername(userId, requestedUsername, ipAddress);
    }

    await this.auditLogsService.record({
      actor: user._id,
      action: 'USERNAME_CLAIMED',
      entityType: 'user',
      entityId: String(user._id),
      severity: 'info',
      ipAddress,
      message: `User claimed initial username @${sanitized}`,
      metadata: {
        username: sanitized,
        previousUsername,
      },
    });

    const userObj = updatedUser.toObject();
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(
        userObj.avatar,
      );
    }
    if (userObj.backgroundImage) {
      userObj.backgroundImage =
        await this.signedUrlService.generateSignedImageUrl(
          userObj.backgroundImage,
        );
    }

    return {
      success: true,
      message: 'Username successfully claimed.',
      user: userObj,
    };
  }

  /**
   * Modifies an existing user's username subject to 14-day cooldown, validation, and uniqueness.
   */
  async changeUsername(
    userId: string,
    requestedUsername: string,
    ipAddress = '',
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const sanitized = this.usernameService.sanitize(requestedUsername);
    const validation = this.usernameService.validate(sanitized);
    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    const previousUsername = user.username || '';

    if (
      previousUsername &&
      previousUsername.toLowerCase() === sanitized.toLowerCase()
    ) {
      const userObj = user.toObject();
      if (userObj.avatar) {
        userObj.avatar = await this.signedUrlService.generateSignedImageUrl(
          userObj.avatar,
        );
      }
      if (userObj.backgroundImage) {
        userObj.backgroundImage =
          await this.signedUrlService.generateSignedImageUrl(
            userObj.backgroundImage,
          );
      }
      return {
        success: true,
        message: 'Username is unchanged.',
        user: userObj,
      };
    }

    if (user.usernameChangedAt) {
      const elapsed = Date.now() - new Date(user.usernameChangedAt).getTime();
      if (elapsed < USERNAME_CHANGE_COOLDOWN_MS) {
        const remainingMs = USERNAME_CHANGE_COOLDOWN_MS - elapsed;
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        const nextAllowedDate = new Date(
          new Date(user.usernameChangedAt).getTime() +
            USERNAME_CHANGE_COOLDOWN_MS,
        );
        throw new BadRequestException(
          `You can change your username again in ${remainingDays} day${remainingDays === 1 ? '' : 's'} (after ${nextAllowedDate.toISOString().split('T')[0]}).`,
        );
      }
    }

    const existing = await this.userModel.findOne({
      username: sanitized,
      _id: { $ne: user._id },
    });

    if (existing) {
      throw new ConflictException(
        'Username is already taken. Please choose another.',
      );
    }

    const now = new Date();
    let updatedUser: any;
    try {
      updatedUser = await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
        },
        {
          $set: {
            username: sanitized,
            usernameClaimed: true,
            usernameChangedAt: now,
          },
          $push: {
            usernameHistory: {
              username: previousUsername,
              changedAt: now,
            },
          },
        },
        { returnDocument: 'after' },
      );
    } catch (err: any) {
      if (err.code === 11000 || err.message?.includes('duplicate key')) {
        throw new ConflictException(
          'Username is no longer available. Please choose another.',
        );
      }
      throw err;
    }

    if (!updatedUser) {
      throw new UnauthorizedException('User not found');
    }

    await this.auditLogsService.record({
      actor: user._id,
      action: 'USERNAME_CHANGED',
      entityType: 'user',
      entityId: String(user._id),
      severity: 'info',
      ipAddress,
      message: `User changed username from @${previousUsername} to @${sanitized}`,
      metadata: {
        newUsername: sanitized,
        previousUsername,
        changedAt: now,
      },
    });

    const userObj = updatedUser.toObject();
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(
        userObj.avatar,
      );
    }
    if (userObj.backgroundImage) {
      userObj.backgroundImage =
        await this.signedUrlService.generateSignedImageUrl(
          userObj.backgroundImage,
        );
    }

    return {
      success: true,
      message: 'Username updated successfully.',
      user: userObj,
    };
  }

  /**
   * Retrieves public student profile by username without exposing sensitive account fields.
   */
  async getPublicProfile(rawUsername: string) {
    const clean = String(rawUsername || '')
      .trim()
      .replace(/^@/, '');
    if (!clean) {
      throw new NotFoundException('Student profile not found.');
    }

    const projection =
      'name username avatar backgroundImage headline currentRole location industry bio skills experience education certifications role isVerified createdAt gamification publicProfilePublished primaryRole capabilities availability professionalInterests discoverableToRecruiters profileVisibility mentorship recruiterContext educatorContext verification account_Status primaryDiscipline specializations infrastructureSectors preferredLocations yearsOfExperience structuredSkills careerPreferences privacySettings';

    let user: any = null;

    // 1. If valid 24-character hexadecimal MongoDB ObjectId, try lookup by _id first
    if (Types.ObjectId.isValid(clean)) {
      user = await this.userModel
        .findOne({
          _id: new Types.ObjectId(clean),
          'account_Status.isDeleted': { $ne: true },
          'account_Status.isBlocked': { $ne: true },
        })
        .select(projection);
    }

    // 2. If not found by ObjectId, lookup by username
    if (!user) {
      const sanitized = this.usernameService.sanitize(clean);
      if (sanitized) {
        user = await this.userModel
          .findOne({
            username: sanitized,
            'account_Status.isDeleted': { $ne: true },
            'account_Status.isBlocked': { $ne: true },
          })
          .select(projection);
      }
    }

    if (!user) {
      throw new NotFoundException(
        `Student profile not found or is no longer available.`,
      );
    }

    const userObj = user.toObject();
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(
        userObj.avatar,
      );
    }
    if (userObj.backgroundImage) {
      userObj.backgroundImage =
        await this.signedUrlService.generateSignedImageUrl(
          userObj.backgroundImage,
        );
    }

    // Fetch approved recommendations
    const recommendations = await this.recommendationModel
      .find({ recipientId: String(user._id), status: 'approved' })
      .sort({ createdAt: -1 })
      .lean();

    const signedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        let authorAvatar = rec.authorAvatar || '';
        if (authorAvatar) {
          authorAvatar =
            await this.signedUrlService.generateSignedImageUrl(authorAvatar);
        }
        return {
          id: rec._id,
          authorId: rec.authorId,
          authorName: rec.authorName,
          authorUsername: rec.authorUsername,
          authorAvatar,
          authorHeadline: rec.authorHeadline,
          authorRole: rec.authorRole,
          relationship: rec.relationship,
          content: rec.content,
          createdAt: rec.createdAt,
        };
      }),
    );

    const privacy = userObj.privacySettings || {
      experience: 'PUBLIC',
      education: 'PUBLIC',
      projects: 'PUBLIC',
      certifications: 'PUBLIC',
      careerPreferences: 'PRIVATE',
      contactInfo: 'NETWORK',
    };

    const isExpVisible = privacy.experience !== 'PRIVATE';
    const isEduVisible = privacy.education !== 'PRIVATE';
    const isCertVisible = privacy.certifications !== 'PRIVATE';
    const isCareerPrefsVisible = privacy.careerPreferences === 'PUBLIC';

    return {
      user: {
        id: userObj._id,
        name: userObj.name,
        username: userObj.username,
        avatar: userObj.avatar,
        backgroundImage: userObj.backgroundImage || '',
        headline: userObj.headline || '',
        currentRole: userObj.currentRole || '',
        location: userObj.location || '',
        industry: userObj.industry || '',
        bio: userObj.bio || '',
        skills: userObj.skills || [],
        experience: isExpVisible ? userObj.experience || [] : [],
        education: isEduVisible ? userObj.education || [] : [],
        certifications: isCertVisible ? userObj.certifications || [] : [],
        primaryDiscipline: userObj.primaryDiscipline || '',
        specializations: userObj.specializations || [],
        infrastructureSectors: userObj.infrastructureSectors || [],
        preferredLocations: userObj.preferredLocations || [],
        yearsOfExperience: userObj.yearsOfExperience || 0,
        structuredSkills: userObj.structuredSkills || {
          technicalSkills: [],
          softwareSkills: [],
          industrySkills: [],
          professionalSkills: [],
        },
        careerPreferences: isCareerPrefsVisible
          ? userObj.careerPreferences
          : null,
        privacySettings: userObj.privacySettings,
        recommendations: signedRecommendations,
        publicProfilePublished: Boolean(userObj.publicProfilePublished),
        role: userObj.role,
        isVerified: Boolean(
          userObj.account_Status?.isVerified ||
          userObj.verification?.status === VerificationStatus.VERIFIED,
        ),
        primaryRole: userObj.primaryRole || 'STUDENT',
        capabilities: userObj.capabilities || ['STUDENT'],
        availability: userObj.availability || 'NOT_CURRENTLY_AVAILABLE',
        professionalInterests: userObj.professionalInterests || [],
        discoverableToRecruiters: Boolean(userObj.discoverableToRecruiters),
        profileVisibility: userObj.profileVisibility || 'PUBLIC',
        mentorship: userObj.mentorship || {
          topics: [],
          expertise: [],
          bio: '',
          available: false,
        },
        verification: userObj.verification || {
          status: VerificationStatus.UNVERIFIED,
          type: 'IDENTITY',
        },
        createdAt: userObj.createdAt,
        gamification: {
          level: userObj.gamification?.level || 1,
          rank: userObj.gamification?.rank || 'Beginner',
          totalPoints: userObj.gamification?.totalPoints || 0,
          completedClasses: userObj.gamification?.completedClasses || 0,
          completedCourses: userObj.gamification?.completedCourses || 0,
          achievements: userObj.gamification?.achievements || [],
        },
      },
    };
  }

  // =========================================================================
  // CORE PROFILE OPERATIONS
  // =========================================================================

  // GET MY PROFILE
  async getMe(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-otp -otpExpiry');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.username || !this.usernameService.validate(user.username).valid) {
      user.username = await this.usernameService.generateUniqueUsername({
        source: user.username,
        name: user.name,
        email: user.email,
        isTaken: async (cand) => {
          const exists = await this.userModel.exists({
            username: cand,
            _id: { $ne: user._id },
          });
          return Boolean(exists);
        },
      });
      user.usernameClaimed = false;
      await user.save();
    }

    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('gamification');
    await user.save();

    const userObj = user.toObject() as any;
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(
        userObj.avatar,
      );
    }
    if (userObj.backgroundImage) {
      userObj.backgroundImage =
        await this.signedUrlService.generateSignedImageUrl(
          userObj.backgroundImage,
        );
    }

    const recommendationsCount = await this.recommendationModel.countDocuments({
      recipientId: userId,
      status: 'approved',
    });

    return {
      user: userObj,
      completion,
      recommendationsCount,
      newlyAwarded,
    };
  }

  // UPDATE PROFILE
  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
    requesterRole?: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.headline !== undefined) user.headline = data.headline;
    if (data.currentRole !== undefined) user.currentRole = data.currentRole;
    if (data.location !== undefined) user.location = data.location;
    if (data.industry !== undefined) user.industry = data.industry;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.skills !== undefined) user.skills = data.skills;

    const incomingRole =
      data.primaryRole !== undefined ? data.primaryRole : data.role;
    if (incomingRole !== undefined) {
      const normalizedRole = String(incomingRole).trim().toUpperCase();
      const validRoles = [
        'STUDENT',
        'EDUCATOR',
        'PROFESSIONAL',
        'MENTOR',
        'RECRUITER',
        'FOUNDER',
      ];
      if (!validRoles.includes(normalizedRole)) {
        throw new BadRequestException(
          `Invalid profile role: '${incomingRole}'. Must be one of: student, educator, professional, mentor, recruiter, founder.`,
        );
      }

      const isAdmin =
        requesterRole === 'admin' || requesterRole === 'superuser';
      const currentRoleNormalized = String(user.primaryRole || 'STUDENT')
        .trim()
        .toUpperCase();

      // Enforce: User cannot self-assign educator role
      if (normalizedRole === 'EDUCATOR' && !isAdmin) {
        throw new ForbiddenException(
          'The educator role can only be assigned by a Zeitnah administrator.',
        );
      }

      // Enforce: Educator cannot remove or change administrator-assigned role
      if (
        currentRoleNormalized === 'EDUCATOR' &&
        normalizedRole !== 'EDUCATOR' &&
        !isAdmin
      ) {
        throw new ForbiddenException(
          'Educator role was assigned by an administrator and cannot be modified by the user.',
        );
      }

      user.primaryRole = normalizedRole;
    }

    if (data.primaryDiscipline !== undefined) {
      user.primaryDiscipline = data.primaryDiscipline.trim();
    }
    if (data.specializations !== undefined) {
      user.specializations = data.specializations;
    }
    if (data.infrastructureSectors !== undefined) {
      user.infrastructureSectors = data.infrastructureSectors;
    }
    if (data.preferredLocations !== undefined) {
      user.preferredLocations = data.preferredLocations;
    }
    if (data.yearsOfExperience !== undefined) {
      user.yearsOfExperience = Math.max(0, Number(data.yearsOfExperience) || 0);
    }
    if (data.structuredSkills !== undefined) {
      user.structuredSkills = {
        technicalSkills: Array.isArray(data.structuredSkills.technicalSkills)
          ? data.structuredSkills.technicalSkills
          : user.structuredSkills?.technicalSkills || [],
        softwareSkills: Array.isArray(data.structuredSkills.softwareSkills)
          ? data.structuredSkills.softwareSkills
          : user.structuredSkills?.softwareSkills || [],
        industrySkills: Array.isArray(data.structuredSkills.industrySkills)
          ? data.structuredSkills.industrySkills
          : user.structuredSkills?.industrySkills || [],
        professionalSkills: Array.isArray(
          data.structuredSkills.professionalSkills,
        )
          ? data.structuredSkills.professionalSkills
          : user.structuredSkills?.professionalSkills || [],
      };
    }
    if (data.careerPreferences !== undefined) {
      const existingPrefs = user.careerPreferences || {
        openToOpportunities: false,
        preferredRoles: [],
        preferredSectors: [],
        preferredLocations: [],
        preferredWorkMode: 'On-site',
        preferredEmploymentType: 'Full-time',
        expectedSalaryRange: {
          min: 0,
          max: 0,
          currency: 'INR',
          period: 'yearly',
        },
        availability: '',
      };
      user.careerPreferences = {
        openToOpportunities:
          data.careerPreferences.openToOpportunities !== undefined
            ? Boolean(data.careerPreferences.openToOpportunities)
            : existingPrefs.openToOpportunities,
        preferredRoles:
          data.careerPreferences.preferredRoles ||
          existingPrefs.preferredRoles ||
          [],
        preferredSectors:
          data.careerPreferences.preferredSectors ||
          existingPrefs.preferredSectors ||
          [],
        preferredLocations:
          data.careerPreferences.preferredLocations ||
          existingPrefs.preferredLocations ||
          [],
        preferredWorkMode:
          data.careerPreferences.preferredWorkMode ||
          existingPrefs.preferredWorkMode ||
          'On-site',
        preferredEmploymentType:
          data.careerPreferences.preferredEmploymentType ||
          existingPrefs.preferredEmploymentType ||
          'Full-time',
        expectedSalaryRange: {
          min: Number(
            data.careerPreferences.expectedSalaryRange?.min ??
              existingPrefs.expectedSalaryRange?.min ??
              0,
          ),
          max: Number(
            data.careerPreferences.expectedSalaryRange?.max ??
              existingPrefs.expectedSalaryRange?.max ??
              0,
          ),
          currency:
            data.careerPreferences.expectedSalaryRange?.currency ||
            existingPrefs.expectedSalaryRange?.currency ||
            'INR',
          period:
            data.careerPreferences.expectedSalaryRange?.period ||
            existingPrefs.expectedSalaryRange?.period ||
            'yearly',
        },
        availability:
          data.careerPreferences.availability ||
          existingPrefs.availability ||
          '',
        recruiterDiscovery:
          data.careerPreferences.recruiterDiscovery ||
          (existingPrefs as any).recruiterDiscovery ||
          'VISIBLE_ALL_RECRUITERS',
      };
    }
    if (data.privacySettings !== undefined) {
      user.privacySettings = {
        ...user.privacySettings,
        ...data.privacySettings,
      };
    }

    if (data.capabilities !== undefined) user.capabilities = data.capabilities;
    if (data.availability !== undefined) user.availability = data.availability;
    if (data.professionalInterests !== undefined)
      user.professionalInterests = data.professionalInterests;
    if (data.discoverableToRecruiters !== undefined)
      user.discoverableToRecruiters = data.discoverableToRecruiters;
    if (data.profileVisibility !== undefined)
      user.profileVisibility = data.profileVisibility;
    if (data.mentorship !== undefined)
      user.mentorship = { ...user.mentorship, ...data.mentorship };
    if (data.recruiterContext !== undefined)
      user.recruiterContext = {
        ...user.recruiterContext,
        ...data.recruiterContext,
      };
    if (data.educatorContext !== undefined)
      user.educatorContext = {
        ...user.educatorContext,
        ...data.educatorContext,
      };

    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('gamification');
    user.markModified('careerPreferences');
    user.markModified('privacySettings');
    user.markModified('structuredSkills');
    await user.save();

    this.triggerCandidateMatchInvalidation(userId);

    const userObj = user.toObject() as any;
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(
        userObj.avatar,
      );
    }
    if (userObj.backgroundImage) {
      userObj.backgroundImage =
        await this.signedUrlService.generateSignedImageUrl(
          userObj.backgroundImage,
        );
    }

    return {
      message: 'Profile updated successfully',
      user: userObj,
      newlyAwarded,
      completion,
    };
  }

  // UPLOAD AVATAR
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const extension =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const key = `profiles/${userId}-${uuidv4()}.${extension}`;
    const oldAvatarKey = user.avatar;

    await this.uploadService.uploadFile(key, file.buffer, file.mimetype);

    user.avatar = key;
    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('gamification');
    await user.save();

    if (
      oldAvatarKey &&
      oldAvatarKey !== key &&
      oldAvatarKey.startsWith('profiles/')
    ) {
      await Promise.resolve(this.uploadService.deleteFile(oldAvatarKey)).catch(
        () => {},
      );
    }

    const signedUrl = await this.signedUrlService.generateSignedImageUrl(key);

    return {
      message: 'Avatar uploaded successfully',
      avatar: signedUrl,
      newlyAwarded,
      completion,
    };
  }

  // UPLOAD BACKGROUND COVER
  async uploadBackground(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const extension =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const key = `profiles/banners/${userId}-${uuidv4()}.${extension}`;
    const oldBannerKey = user.backgroundImage;

    await this.uploadService.uploadFile(key, file.buffer, file.mimetype);

    user.backgroundImage = key;
    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('gamification');
    await user.save();

    if (
      oldBannerKey &&
      oldBannerKey !== key &&
      oldBannerKey.startsWith('profiles/banners/')
    ) {
      await Promise.resolve(this.uploadService.deleteFile(oldBannerKey)).catch(
        () => {},
      );
    }

    const signedUrl = await this.signedUrlService.generateSignedImageUrl(key);

    return {
      message: 'Background image uploaded successfully',
      backgroundImage: signedUrl,
      newlyAwarded,
      completion,
    };
  }

  // REMOVE BACKGROUND
  async removeBackground(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const oldBannerKey = user.backgroundImage;
    user.backgroundImage = '';
    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('gamification');
    await user.save();

    if (oldBannerKey && oldBannerKey.startsWith('profiles/banners/')) {
      await Promise.resolve(this.uploadService.deleteFile(oldBannerKey)).catch(
        () => {},
      );
    }

    return {
      message: 'Background image removed successfully',
      success: true,
      completion,
    };
  }

  // =========================================================================
  // EXPERIENCE SUBDOCUMENT CRUD
  // =========================================================================

  async addExperience(userId: string, dto: ExperienceDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const start = new Date(dto.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : null;
    if (end && end < start) {
      throw new BadRequestException('End date cannot be before start date.');
    }

    const entry = {
      id: uuidv4(),
      organization: dto.organization.trim(),
      role: dto.role.trim(),
      employmentType: dto.employmentType || 'Full-time',
      location: dto.location || '',
      startDate: start,
      endDate: dto.currentlyActive ? null : end,
      currentlyActive: Boolean(dto.currentlyActive),
      description: dto.description || '',
      skillsUsed: dto.skillsUsed || [],
      softwareUsed: dto.softwareUsed || [],
      infrastructureSector: dto.infrastructureSector?.trim() || '',
    };

    if (!Array.isArray(user.experience)) {
      user.experience = [];
    }
    user.experience.unshift(entry);

    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('experience');
    user.markModified('gamification');
    await user.save();

    this.triggerCandidateMatchInvalidation(userId);

    return {
      message: 'Experience added successfully',
      experience: user.experience,
      newlyAwarded,
      completion,
    };
  }

  async updateExperience(
    userId: string,
    experienceId: string,
    dto: ExperienceDto,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const idx = (user.experience || []).findIndex((e) => e.id === experienceId);
    if (idx === -1) throw new NotFoundException('Experience record not found');

    const start = new Date(dto.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : null;
    if (end && end < start) {
      throw new BadRequestException('End date cannot be before start date.');
    }

    user.experience[idx] = {
      ...user.experience[idx],
      organization: dto.organization.trim(),
      role: dto.role.trim(),
      employmentType: dto.employmentType || 'Full-time',
      location: dto.location || '',
      startDate: start,
      endDate: dto.currentlyActive ? null : end,
      currentlyActive: Boolean(dto.currentlyActive),
      description: dto.description || '',
      skillsUsed:
        dto.skillsUsed !== undefined
          ? dto.skillsUsed
          : user.experience[idx].skillsUsed || [],
      softwareUsed:
        dto.softwareUsed !== undefined
          ? dto.softwareUsed
          : user.experience[idx].softwareUsed || [],
      infrastructureSector:
        dto.infrastructureSector !== undefined
          ? dto.infrastructureSector.trim()
          : user.experience[idx].infrastructureSector || '',
    };

    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('experience');
    user.markModified('gamification');
    await user.save();

    this.triggerCandidateMatchInvalidation(userId);

    return {
      message: 'Experience updated successfully',
      experience: user.experience,
      newlyAwarded,
      completion,
    };
  }

  async deleteExperience(userId: string, experienceId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    user.experience = (user.experience || []).filter(
      (e) => e.id !== experienceId,
    );
    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('experience');
    user.markModified('gamification');
    await user.save();

    return {
      message: 'Experience deleted successfully',
      experience: user.experience,
      completion,
    };
  }

  // =========================================================================
  // EDUCATION SUBDOCUMENT CRUD
  // =========================================================================

  async addEducation(userId: string, dto: EducationDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const start = new Date(dto.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : null;
    if (end && end < start) {
      throw new BadRequestException('End date cannot be before start date.');
    }

    const entry = {
      id: uuidv4(),
      institution: dto.institution.trim(),
      qualification: dto.qualification.trim(),
      fieldOfStudy: dto.fieldOfStudy || '',
      startDate: start,
      endDate: dto.currentlyStudying ? null : end,
      currentlyStudying: Boolean(dto.currentlyStudying),
      description: dto.description || '',
    };

    if (!Array.isArray(user.education)) {
      user.education = [];
    }
    user.education.unshift(entry);

    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('education');
    user.markModified('gamification');
    await user.save();

    return {
      message: 'Education added successfully',
      education: user.education,
      newlyAwarded,
      completion,
    };
  }

  async updateEducation(
    userId: string,
    educationId: string,
    dto: EducationDto,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const idx = (user.education || []).findIndex((e) => e.id === educationId);
    if (idx === -1) throw new NotFoundException('Education record not found');

    const start = new Date(dto.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : null;
    if (end && end < start) {
      throw new BadRequestException('End date cannot be before start date.');
    }

    user.education[idx] = {
      ...user.education[idx],
      institution: dto.institution.trim(),
      qualification: dto.qualification.trim(),
      fieldOfStudy: dto.fieldOfStudy || '',
      startDate: start,
      endDate: dto.currentlyStudying ? null : end,
      currentlyStudying: Boolean(dto.currentlyStudying),
      description: dto.description || '',
    };

    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('education');
    user.markModified('gamification');
    await user.save();

    return {
      message: 'Education updated successfully',
      education: user.education,
      newlyAwarded,
      completion,
    };
  }

  async deleteEducation(userId: string, educationId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    user.education = (user.education || []).filter((e) => e.id !== educationId);
    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('education');
    user.markModified('gamification');
    await user.save();

    return {
      message: 'Education deleted successfully',
      education: user.education,
      completion,
    };
  }

  // =========================================================================
  // CERTIFICATIONS SUBDOCUMENT CRUD
  // =========================================================================

  async addCertification(userId: string, dto: CertificationDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const issue = new Date(dto.issueDate);
    const exp = dto.expirationDate ? new Date(dto.expirationDate) : null;
    if (exp && exp < issue) {
      throw new BadRequestException(
        'Expiration date cannot be before issue date.',
      );
    }

    const entry = {
      id: uuidv4(),
      name: dto.name.trim(),
      issuer: dto.issuer.trim(),
      issueDate: issue,
      expirationDate: exp,
      credentialId: dto.credentialId || '',
      credentialUrl: dto.credentialUrl || '',
    };

    if (!Array.isArray(user.certifications)) {
      user.certifications = [];
    }
    user.certifications.unshift(entry);

    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('certifications');
    user.markModified('gamification');
    await user.save();

    return {
      message: 'Certification added successfully',
      certifications: user.certifications,
      newlyAwarded,
      completion,
    };
  }

  async updateCertification(
    userId: string,
    certId: string,
    dto: CertificationDto,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const idx = (user.certifications || []).findIndex((c) => c.id === certId);
    if (idx === -1)
      throw new NotFoundException('Certification record not found');

    const issue = new Date(dto.issueDate);
    const exp = dto.expirationDate ? new Date(dto.expirationDate) : null;
    if (exp && exp < issue) {
      throw new BadRequestException(
        'Expiration date cannot be before issue date.',
      );
    }

    user.certifications[idx] = {
      ...user.certifications[idx],
      name: dto.name.trim(),
      issuer: dto.issuer.trim(),
      issueDate: issue,
      expirationDate: exp,
      credentialId: dto.credentialId || '',
      credentialUrl: dto.credentialUrl || '',
    };

    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('certifications');
    user.markModified('gamification');
    await user.save();

    return {
      message: 'Certification updated successfully',
      certifications: user.certifications,
      newlyAwarded,
      completion,
    };
  }

  async deleteCertification(userId: string, certId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    user.certifications = (user.certifications || []).filter(
      (c) => c.id !== certId,
    );
    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('certifications');
    user.markModified('gamification');
    await user.save();

    return {
      message: 'Certification deleted successfully',
      certifications: user.certifications,
      completion,
    };
  }

  // =========================================================================
  // PUBLIC PROFILE PUBLISH STATE
  // =========================================================================

  async setPublicProfilePublishState(userId: string, published: boolean) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    if (published) {
      const completion = calculateAuthoritativeProfileCompletion(user);
      if (!completion.publicProfileReady) {
        throw new BadRequestException(
          'Please complete required items (photo, headline, about, 3+ skills, and username) before publishing.',
        );
      }
    }

    user.publicProfilePublished = Boolean(published);
    const { newlyAwarded, completion } = evaluateProfileMilestones(user);
    syncGamificationStats(user);
    user.markModified('gamification');
    await user.save();

    return {
      message: published
        ? 'Public profile published successfully.'
        : 'Public profile is now private.',
      published: user.publicProfilePublished,
      newlyAwarded,
      completion,
    };
  }

  // =========================================================================
  // RECOMMENDATIONS
  // =========================================================================

  async getRecommendations(userId: string) {
    const recommendations = await this.recommendationModel
      .find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const signed = await Promise.all(
      recommendations.map(async (rec) => {
        let authorAvatar = rec.authorAvatar || '';
        if (authorAvatar) {
          authorAvatar =
            await this.signedUrlService.generateSignedImageUrl(authorAvatar);
        }
        return {
          id: rec._id,
          recipientId: rec.recipientId,
          authorId: rec.authorId,
          authorName: rec.authorName,
          authorUsername: rec.authorUsername,
          authorAvatar,
          authorHeadline: rec.authorHeadline,
          authorRole: rec.authorRole,
          relationship: rec.relationship,
          content: rec.content,
          status: rec.status,
          createdAt: rec.createdAt,
        };
      }),
    );

    return { recommendations: signed };
  }

  async submitRecommendation(authorId: string, dto: SubmitRecommendationDto) {
    if (authorId === dto.recipientId) {
      throw new BadRequestException(
        'You cannot write a recommendation for yourself.',
      );
    }

    const recipient = await this.userModel.findById(dto.recipientId);
    if (!recipient) {
      throw new NotFoundException('Recipient student not found.');
    }

    const author = await this.userModel.findById(authorId);
    if (!author) {
      throw new UnauthorizedException('Author not found.');
    }

    const sanitizedContent = (dto.content || '')
      .trim()
      .replace(/<[^>]*>?/gm, '');
    if (sanitizedContent.length < 20 || sanitizedContent.length > 1000) {
      throw new BadRequestException(
        'Recommendation must be between 20 and 1000 characters.',
      );
    }

    const existing = await this.recommendationModel.findOne({
      authorId,
      recipientId: dto.recipientId,
    });

    if (existing) {
      existing.content = sanitizedContent;
      existing.relationship = dto.relationship;
      existing.authorName = author.name || 'Anonymous Student';
      existing.authorUsername = author.username || '';
      existing.authorAvatar = author.avatar || '';
      existing.authorHeadline = author.headline || '';
      existing.authorRole = author.role || 'student';
      existing.status = 'approved';
      await existing.save();
      return {
        message: 'Recommendation updated successfully.',
        recommendation: existing,
      };
    }

    const recommendation = await this.recommendationModel.create({
      recipientId: dto.recipientId,
      authorId,
      authorName: author.name || 'Anonymous Student',
      authorUsername: author.username || '',
      authorAvatar: author.avatar || '',
      authorHeadline: author.headline || '',
      authorRole: author.role || 'student',
      relationship: dto.relationship,
      content: sanitizedContent,
      status: 'approved',
    });

    return {
      message: 'Recommendation submitted successfully.',
      recommendation,
    };
  }

  async updateRecommendationStatus(
    userId: string,
    recommendationId: string,
    status: string,
  ) {
    const rec = await this.recommendationModel.findById(recommendationId);
    if (!rec) throw new NotFoundException('Recommendation not found');

    if (rec.recipientId !== userId) {
      throw new UnauthorizedException(
        'You can only manage recommendations sent to you.',
      );
    }

    rec.status = status;
    await rec.save();

    return {
      message: `Recommendation is now ${status}.`,
      recommendation: rec,
    };
  }

  async deleteRecommendation(userId: string, recommendationId: string) {
    const rec = await this.recommendationModel.findById(recommendationId);
    if (!rec) throw new NotFoundException('Recommendation not found');

    if (rec.recipientId !== userId && rec.authorId !== userId) {
      throw new UnauthorizedException(
        'Not authorized to delete this recommendation.',
      );
    }

    await this.recommendationModel.findByIdAndDelete(recommendationId);

    return {
      message: 'Recommendation removed successfully.',
      success: true,
    };
  }

  // =========================================================================
  // INFRASTRUCTURE TAXONOMY & ADMIN ROLE ASSIGNMENT
  // =========================================================================

  getInfrastructureTaxonomy() {
    return {
      disciplines: INFRASTRUCTURE_DISCIPLINES,
      sectors: INFRASTRUCTURE_SECTORS,
      software: INFRASTRUCTURE_SOFTWARE,
      roles: PROFILE_ROLES,
      userSelectableRoles: USER_SELECTABLE_ROLES,
      workModes: WORK_MODES,
      employmentTypes: EMPLOYMENT_TYPES,
      visibilityLevels: VISIBILITY_LEVELS,
    };
  }

  async adminAssignRole(
    adminUserId: string,
    targetUserId: string,
    newRole: string,
  ) {
    const admin = await this.userModel.findById(adminUserId);
    if (
      !admin ||
      (admin.role !== 'admin' && (admin as any).role !== 'superuser')
    ) {
      throw new ForbiddenException('Only administrators can assign roles.');
    }

    const targetUser = await this.userModel.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }

    const normalizedRole = String(newRole || '')
      .trim()
      .toUpperCase();
    const validRoles = [
      'STUDENT',
      'EDUCATOR',
      'PROFESSIONAL',
      'MENTOR',
      'RECRUITER',
      'FOUNDER',
    ];
    if (!validRoles.includes(normalizedRole)) {
      throw new BadRequestException(
        `Invalid role: ${newRole}. Must be one of: student, educator, professional, mentor, recruiter, founder.`,
      );
    }

    const previousRole = targetUser.primaryRole;
    targetUser.primaryRole = normalizedRole;
    if (normalizedRole === 'EDUCATOR') {
      targetUser.role = 'teacher';
    }
    await targetUser.save();

    await this.auditLogsService.record({
      actor: admin._id,
      action: 'USER_ROLE_ASSIGNED',
      entityType: 'user',
      entityId: String(targetUser._id),
      severity: 'info',
      message: `Admin changed user @${targetUser.username} role from ${previousRole} to ${normalizedRole}`,
      metadata: {
        targetUserId: String(targetUser._id),
        previousRole,
        newRole: normalizedRole,
      },
    });

    return {
      success: true,
      message: `Role successfully updated to ${normalizedRole} for user @${targetUser.username}`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        primaryRole: targetUser.primaryRole,
      },
    };
  }

  // =========================================================================
  // PHASE 8: PROFESSIONAL INFRASTRUCTURE PORTFOLIO
  // =========================================================================

  /**
   * Calculate portfolio completeness distinct from profile completeness.
   */
  calculatePortfolioCompleteness(
    user: any,
    projects: any[] = [],
  ): { completeness: number; missingItems: string[] } {
    let score = 0;
    const missingItems: string[] = [];

    // 1. Featured Project (20%)
    const hasFeatured =
      (user.portfolio?.featuredProjectIds &&
        user.portfolio.featuredProjectIds.length > 0) ||
      projects.some((p) => p.featured);
    if (hasFeatured) {
      score += 20;
    } else {
      missingItems.push('Featured project');
    }

    // 2. Project Media (15%)
    const hasMedia = projects.some(
      (p) =>
        (p.media && p.media.length > 0) ||
        (p.portfolioMedia && p.portfolioMedia.length > 0),
    );
    if (hasMedia) {
      score += 15;
    } else {
      missingItems.push('Project media attachments');
    }

    // 3. Featured Skills (15%)
    if (
      user.portfolio?.featuredSkills &&
      user.portfolio.featuredSkills.length >= 3
    ) {
      score += 15;
    } else {
      missingItems.push('At least 3 featured skills');
    }

    // 4. Featured Software (15%)
    if (
      user.portfolio?.featuredSoftware &&
      user.portfolio.featuredSoftware.length >= 2
    ) {
      score += 15;
    } else {
      missingItems.push('At least 2 featured software');
    }

    // 5. Professional Resume / CV (15%)
    if (user.portfolio?.resume?.url || user.portfolio?.resume?.fileKey) {
      score += 15;
    } else {
      missingItems.push('Professional resume / CV');
    }

    // 6. Experience Highlights (10%)
    const hasExp =
      (user.experience && user.experience.length > 0) ||
      (user.portfolio?.highlightedExperienceIds &&
        user.portfolio.highlightedExperienceIds.length > 0);
    if (hasExp) {
      score += 10;
    } else {
      missingItems.push('Experience highlights');
    }

    // 7. Portfolio Bio / Headline (10%)
    const bioText = user.portfolio?.customBio || user.bio || '';
    if (bioText.trim().length >= 10) {
      score += 10;
    } else {
      missingItems.push('Portfolio bio or summary');
    }

    return { completeness: Math.min(100, score), missingItems };
  }

  /**
   * Get professional portfolio for a user with privacy rules applied.
   */
  async getPortfolio(
    userId: string,
    isOwner = true,
    requesterUserId?: string,
    requesterRole?: string,
  ) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // Fetch projects
    const allUserProjects = await this.projectModel
      .find({ ownerId: new Types.ObjectId(userId) })
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    const { completeness, missingItems } = this.calculatePortfolioCompleteness(
      user,
      allUserProjects,
    );

    // Apply privacy filtering if not owner
    let visibleProjects: any[] = allUserProjects;
    if (!isOwner) {
      visibleProjects = allUserProjects
        .filter((p) => p.visibility !== ProjectVisibility.PRIVATE)
        .map((p) => ({
          ...p,
          portfolioMedia: (p.portfolioMedia || []).filter(
            (m) => m.visibility !== 'PRIVATE',
          ),
        }));
    }

    // Featured projects selection
    const featuredProjectIds = new Set(
      user.portfolio?.featuredProjectIds?.map((id: any) => String(id)) || [],
    );
    const featuredProjects = visibleProjects.filter(
      (p) => featuredProjectIds.has(String(p._id)) || p.featured,
    );

    // Resume visibility rules
    let allowedResume: any = null;
    const rawResume = user.portfolio?.resume;
    if (rawResume && (rawResume.url || rawResume.fileKey)) {
      if (isOwner) {
        allowedResume = rawResume;
      } else {
        const vis = rawResume.visibility || 'PRIVATE';
        const isRecruiterRole = ['recruiter', 'founder', 'admin'].includes(
          (requesterRole || '').toLowerCase(),
        );

        if (vis === 'PUBLIC') {
          allowedResume = {
            url: rawResume.url,
            filename: rawResume.filename,
            sizeBytes: rawResume.sizeBytes,
            uploadedAt: rawResume.uploadedAt,
            visibility: vis,
          };
        } else if (vis === 'RECRUITERS' && isRecruiterRole) {
          allowedResume = {
            url: rawResume.url,
            filename: rawResume.filename,
            sizeBytes: rawResume.sizeBytes,
            uploadedAt: rawResume.uploadedAt,
            visibility: vis,
          };
        }
      }
    }

    // Highlighted experience
    const highlightedExpIds = new Set(
      user.portfolio?.highlightedExperienceIds || [],
    );
    const highlightedExperience = (user.experience || []).filter(
      (e: any) =>
        highlightedExpIds.has(String(e.id)) || highlightedExpIds.size === 0,
    );

    // Safe public verification badges (NO private evidence leaked!)
    const verificationsSummary = {
      identity:
        user.verifications?.identity?.status === VerificationStatus.VERIFIED,
      professional:
        user.verifications?.professional?.status ===
        VerificationStatus.VERIFIED,
      educator:
        user.verifications?.educator?.status === VerificationStatus.VERIFIED,
      businessAffiliation:
        user.verifications?.businessAffiliation?.status ===
        VerificationStatus.VERIFIED,
      certification:
        user.verifications?.certification?.status ===
        VerificationStatus.VERIFIED,
      details: {
        identity: user.verifications?.identity || {
          status: VerificationStatus.UNVERIFIED,
        },
        professional: user.verifications?.professional || {
          status: VerificationStatus.UNVERIFIED,
        },
        educator: user.verifications?.educator || {
          status: VerificationStatus.UNVERIFIED,
        },
        businessAffiliation: user.verifications?.businessAffiliation || {
          status: VerificationStatus.UNVERIFIED,
        },
        certification: user.verifications?.certification || {
          status: VerificationStatus.UNVERIFIED,
        },
      },
    };

    return {
      hero: {
        userId: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        headline: user.portfolio?.customHeadline || user.headline,
        currentRole: user.currentRole,
        primaryRole: user.primaryRole,
        primaryDiscipline: user.primaryDiscipline,
        infrastructureSectors: user.infrastructureSectors || [],
        specializations: user.specializations || [],
        location: user.location,
        yearsOfExperience: user.yearsOfExperience || 0,
        badges: verificationsSummary,
        availability: user.availability,
      },
      about: user.portfolio?.customBio || user.bio || '',
      featuredProjects,
      allProjects: visibleProjects,
      featuredSkills: user.portfolio?.featuredSkills || [],
      featuredSoftware: user.portfolio?.featuredSoftware || [],
      allSkills: user.skills || [],
      structuredSkills: user.structuredSkills || {},
      highlightedExperience,
      allExperience: user.experience || [],
      education: user.education || [],
      certifications: user.certifications || [],
      resume: allowedResume,
      sectionsVisibility: user.portfolio?.sectionsVisibility || {
        about: true,
        skills: true,
        experience: true,
        projects: true,
        certifications: true,
        education: true,
        courses: true,
        contact: true,
      },
      completeness,
      missingItems: isOwner ? missingItems : [],
      published: Boolean(user.portfolio?.published),
      verifications: verificationsSummary,
      isOwner,
    };
  }

  /**
   * Get public portfolio by username.
   */
  async getPublicPortfolio(
    username: string,
    requesterUserId?: string,
    requesterRole?: string,
  ) {
    const user = await this.userModel.findOne({
      username: username.toLowerCase().trim(),
    });
    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }

    const isOwner = Boolean(
      requesterUserId && String(requesterUserId) === String(user._id),
    );

    return this.getPortfolio(
      String(user._id),
      isOwner,
      requesterUserId,
      requesterRole,
    );
  }

  /**
   * Update portfolio curation settings.
   */
  async updatePortfolio(userId: string, dto: UpdatePortfolioDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.portfolio) {
      user.portfolio = {
        published: false,
        customHeadline: '',
        customBio: '',
        featuredProjectIds: [],
        featuredSkills: [],
        featuredSoftware: [],
        highlightedExperienceIds: [],
        sectionsVisibility: {
          about: true,
          skills: true,
          experience: true,
          projects: true,
          certifications: true,
          education: true,
          courses: true,
          contact: true,
        },
        resume: {
          url: '',
          fileKey: '',
          filename: '',
          sizeBytes: 0,
          uploadedAt: null,
          visibility: 'PRIVATE',
        },
        portfolioCompleteness: 0,
      };
    }

    if (dto.published !== undefined) user.portfolio.published = dto.published;
    if (dto.customHeadline !== undefined)
      user.portfolio.customHeadline = dto.customHeadline.trim();
    if (dto.customBio !== undefined)
      user.portfolio.customBio = dto.customBio.trim();
    if (dto.featuredProjectIds !== undefined) {
      user.portfolio.featuredProjectIds = dto.featuredProjectIds;
      // Synchronize featured state on project documents
      await this.projectModel.updateMany(
        { ownerId: user._id },
        { $set: { featured: false } },
      );
      if (dto.featuredProjectIds.length > 0) {
        const validObjIds = dto.featuredProjectIds
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id));
        if (validObjIds.length > 0) {
          await this.projectModel.updateMany(
            {
              ownerId: user._id,
              _id: { $in: validObjIds },
            },
            { $set: { featured: true } },
          );
        }
      }
    }
    if (dto.featuredSkills !== undefined)
      user.portfolio.featuredSkills = dto.featuredSkills;
    if (dto.featuredSoftware !== undefined)
      user.portfolio.featuredSoftware = dto.featuredSoftware;
    if (dto.highlightedExperienceIds !== undefined)
      user.portfolio.highlightedExperienceIds = dto.highlightedExperienceIds;
    if (dto.sectionsVisibility !== undefined) {
      user.portfolio.sectionsVisibility = {
        ...user.portfolio.sectionsVisibility,
        ...dto.sectionsVisibility,
      };
    }
    if (dto.resumeVisibility !== undefined && user.portfolio.resume) {
      user.portfolio.resume.visibility = dto.resumeVisibility;
    }

    const projects = await this.projectModel.find({ ownerId: user._id }).lean();
    const { completeness } = this.calculatePortfolioCompleteness(
      user,
      projects,
    );
    user.portfolio.portfolioCompleteness = completeness;

    user.markModified('portfolio');
    await user.save();

    this.triggerCandidateMatchInvalidation(userId);

    return {
      success: true,
      message: 'Portfolio updated successfully',
      portfolio: user.portfolio,
    };
  }

  /**
   * Upload resume / CV (PDF format, max 10MB).
   */
  async uploadResume(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!file) throw new BadRequestException('No resume file provided');

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are permitted for resumes');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Resume file size must not exceed 10MB');
    }

    const key = `resumes/${userId}-${uuidv4()}.pdf`;
    const oldKey = user.portfolio?.resume?.fileKey;

    await this.uploadService.uploadFile(key, file.buffer, file.mimetype);

    const signedUrl = await this.signedUrlService.generateSignedImageUrl(key);

    if (!user.portfolio) {
      user.portfolio = {
        published: false,
        customHeadline: '',
        customBio: '',
        featuredProjectIds: [],
        featuredSkills: [],
        featuredSoftware: [],
        highlightedExperienceIds: [],
        sectionsVisibility: {
          about: true,
          skills: true,
          experience: true,
          projects: true,
          certifications: true,
          education: true,
          courses: true,
          contact: true,
        },
        resume: {
          url: '',
          fileKey: '',
          filename: '',
          sizeBytes: 0,
          uploadedAt: null,
          visibility: 'PRIVATE',
        },
        portfolioCompleteness: 0,
      };
    }

    user.portfolio.resume = {
      url: signedUrl,
      fileKey: key,
      filename: file.originalname,
      sizeBytes: file.size,
      uploadedAt: new Date(),
      visibility: user.portfolio.resume?.visibility || 'PRIVATE',
    };

    const projects = await this.projectModel.find({ ownerId: user._id }).lean();
    const { completeness } = this.calculatePortfolioCompleteness(
      user,
      projects,
    );
    user.portfolio.portfolioCompleteness = completeness;

    user.markModified('portfolio');
    await user.save();

    if (oldKey && oldKey !== key && oldKey.startsWith('resumes/')) {
      await Promise.resolve(this.uploadService.deleteFile(oldKey)).catch(
        () => {},
      );
    }

    return {
      success: true,
      message: 'Resume uploaded successfully',
      resume: user.portfolio.resume,
      completeness,
    };
  }

  /**
   * Delete resume / CV.
   */
  async deleteResume(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const key = user.portfolio?.resume?.fileKey;
    if (key && key.startsWith('resumes/')) {
      await Promise.resolve(this.uploadService.deleteFile(key)).catch(() => {});
    }

    if (user.portfolio?.resume) {
      user.portfolio.resume = {
        url: '',
        fileKey: '',
        filename: '',
        sizeBytes: 0,
        uploadedAt: null,
        visibility: 'PRIVATE',
      };
    }

    const projects = await this.projectModel.find({ ownerId: user._id }).lean();
    const { completeness } = this.calculatePortfolioCompleteness(
      user,
      projects,
    );
    if (user.portfolio) {
      user.portfolio.portfolioCompleteness = completeness;
    }

    user.markModified('portfolio');
    await user.save();

    return {
      success: true,
      message: 'Resume removed successfully',
      completeness,
    };
  }

  /**
   * Secure authorized download URL for candidate resume.
   */
  async getResumeDownloadUrl(
    targetUserId: string,
    requesterUserId?: string,
    requesterRole?: string,
  ) {
    const user = await this.userModel.findById(targetUserId);
    if (!user) throw new NotFoundException('User not found');

    const resume = user.portfolio?.resume;
    if (!resume || !resume.fileKey) {
      throw new NotFoundException('Candidate has not uploaded a resume');
    }

    const isOwner = Boolean(
      requesterUserId && String(requesterUserId) === String(user._id),
    );
    const isRecruiterRole = ['recruiter', 'founder', 'admin'].includes(
      (requesterRole || '').toLowerCase(),
    );

    if (isOwner) {
      // Owner always allowed
    } else if (resume.visibility === 'PUBLIC') {
      // Public allowed
    } else if (resume.visibility === 'RECRUITERS' && isRecruiterRole) {
      // Recruiter allowed
    } else {
      throw new ForbiddenException(
        'This resume is private and not accessible to your account.',
      );
    }

    const signedUrl = await this.signedUrlService.generateSignedImageUrl(
      resume.fileKey,
    );
    return {
      success: true,
      downloadUrl: signedUrl,
      filename: resume.filename,
    };
  }

  /**
   * Upload media for project / portfolio (Site photographs, Drawings, BOQ samples, Presentations).
   */
  async uploadPortfolioMedia(
    userId: string,
    file: Express.Multer.File,
    metadata: {
      projectId?: string;
      name?: string;
      caption?: string;
      visibility?: string;
    },
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!file) throw new BadRequestException('No file provided');

    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPG, PNG, WebP, or PDF files are permitted for project media.',
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      throw new BadRequestException('Media file size must not exceed 15MB');
    }

    const ext = file.originalname.split('.').pop() || 'dat';
    const key = `projects/media/${userId}-${uuidv4()}.${ext}`;

    await this.uploadService.uploadFile(key, file.buffer, file.mimetype);
    const signedUrl = await this.signedUrlService.generateSignedImageUrl(key);

    const mediaItem = {
      id: uuidv4(),
      name: metadata.name || file.originalname,
      mediaType: file.mimetype === 'application/pdf' ? 'pdf' : 'image',
      url: signedUrl,
      fileKey: key,
      caption: metadata.caption || '',
      visibility: metadata.visibility || 'PUBLIC',
    };

    if (metadata.projectId) {
      const project = await this.projectModel.findOne({
        _id: new Types.ObjectId(metadata.projectId),
        ownerId: user._id,
      });
      if (project) {
        if (!project.portfolioMedia) project.portfolioMedia = [];
        project.portfolioMedia.push(mediaItem);
        await project.save();
      }
    }

    // Refresh user's portfolio completeness
    const projects = await this.projectModel.find({ ownerId: user._id }).lean();
    const { completeness } = this.calculatePortfolioCompleteness(
      user,
      projects,
    );
    if (user.portfolio) {
      user.portfolio.portfolioCompleteness = completeness;
      user.markModified('portfolio');
      await user.save();
    }

    return {
      success: true,
      mediaItem,
      completeness,
    };
  }

  /**
   * Delete media from a project.
   */
  async deletePortfolioMedia(
    userId: string,
    mediaId: string,
    projectId?: string,
  ) {
    if (projectId) {
      const project = await this.projectModel.findOne({
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(userId),
      });
      if (!project) throw new NotFoundException('Project not found');

      const item = (project.portfolioMedia || []).find((m) => m.id === mediaId);
      if (item && item.fileKey && item.fileKey.startsWith('projects/media/')) {
        await Promise.resolve(
          this.uploadService.deleteFile(item.fileKey),
        ).catch(() => {});
      }

      project.portfolioMedia = (project.portfolioMedia || []).filter(
        (m) => m.id !== mediaId,
      );
      await project.save();
    }

    return { success: true, message: 'Media removed successfully' };
  }

  // =========================================================================
  // PHASE 8: VERIFICATION SYSTEM
  // =========================================================================

  /**
   * Get verification center overview for current user.
   */
  async getVerificationCenter(userId: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new NotFoundException('User not found');

    const requests = await this.verificationRequestModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    // Check expiring credentials
    const now = new Date();
    const categories: Record<string, any> = {
      identity: {
        status:
          user.verifications?.identity?.status || VerificationStatus.UNVERIFIED,
        verifiedAt: user.verifications?.identity?.verifiedAt || null,
        validUntil: user.verifications?.identity?.validUntil || null,
        badgeName: 'Identity Verified',
        isExpired:
          Boolean(user.verifications?.identity?.validUntil) &&
          new Date(user.verifications.identity.validUntil) < now,
      },
      professional: {
        status:
          user.verifications?.professional?.status ||
          VerificationStatus.UNVERIFIED,
        verifiedAt: user.verifications?.professional?.verifiedAt || null,
        validUntil: user.verifications?.professional?.validUntil || null,
        badgeName: 'Professional Verified',
        title: user.verifications?.professional?.title || '',
        affiliation: user.verifications?.professional?.affiliation || '',
        isExpired:
          Boolean(user.verifications?.professional?.validUntil) &&
          new Date(user.verifications.professional.validUntil) < now,
      },
      educator: {
        status:
          user.verifications?.educator?.status || VerificationStatus.UNVERIFIED,
        verifiedAt: user.verifications?.educator?.verifiedAt || null,
        badgeName: 'Educator Verified',
        note: 'Administrator controlled',
      },
      businessAffiliation: {
        status:
          user.verifications?.businessAffiliation?.status ||
          VerificationStatus.UNVERIFIED,
        verifiedAt: user.verifications?.businessAffiliation?.verifiedAt || null,
        badgeName: 'Business Affiliation Verified',
        organizationName:
          user.verifications?.businessAffiliation?.organizationName || '',
      },
      certification: {
        status:
          user.verifications?.certification?.status ||
          VerificationStatus.UNVERIFIED,
        verifiedAt: user.verifications?.certification?.verifiedAt || null,
        badgeName: 'Certification Verified',
      },
    };

    return {
      categories,
      requests,
      activeRequests: requests.filter(
        (r) => r.status === VerificationStatus.PENDING,
      ),
      history: requests.filter((r) => r.status !== VerificationStatus.PENDING),
    };
  }

  /**
   * Submit verification request with private evidence files.
   */
  async submitVerificationRequest(
    userId: string,
    dto: CreateVerificationRequestDto,
    files?: Express.Multer.File[],
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Rule 18: Educator verification is strictly administrator controlled
    if (dto.category === VerificationCategory.EDUCATOR) {
      throw new BadRequestException(
        'Educator role is administrator controlled and cannot be requested by users.',
      );
    }

    // Check for duplicate pending requests
    const existingPending = await this.verificationRequestModel.findOne({
      userId: user._id,
      category: dto.category,
      status: VerificationStatus.PENDING,
    });
    if (existingPending) {
      throw new BadRequestException(
        `A verification request for ${dto.category} is already pending review.`,
      );
    }

    // Process secure private evidence files
    const evidenceFiles: Array<{
      id: string;
      name: string;
      mimeType: string;
      sizeBytes: number;
      fileKey: string;
      url: string;
      uploadedAt: Date;
    }> = [];

    if (files && files.length > 0) {
      for (const f of files) {
        const ext = f.originalname.split('.').pop() || 'dat';
        const fileKey = `evidence/private/${userId}-${uuidv4()}.${ext}`;
        await this.uploadService.uploadFile(fileKey, f.buffer, f.mimetype);

        evidenceFiles.push({
          id: uuidv4(),
          name: f.originalname,
          mimeType: f.mimetype,
          sizeBytes: f.size,
          fileKey,
          url: '', // Evidence URLs are strictly private and served via authenticated signed tokens
          uploadedAt: new Date(),
        });
      }
    }

    const request = await this.verificationRequestModel.create({
      userId: user._id,
      category: dto.category,
      status: VerificationStatus.PENDING,
      documentType: dto.documentType?.trim() || '',
      documentNumber: dto.documentNumber?.trim() || '',
      organizationName: dto.organizationName?.trim() || '',
      notes: dto.notes?.trim() || '',
      evidenceFiles,
      auditLog: [
        {
          status: VerificationStatus.PENDING,
          changedAt: new Date(),
          changedBy: user._id,
          note: 'Verification request submitted by candidate',
        },
      ],
    });

    // Update user verifications state to PENDING
    const catKey =
      dto.category === VerificationCategory.BUSINESS_AFFILIATION
        ? 'businessAffiliation'
        : (dto.category.toLowerCase() as keyof typeof user.verifications);

    if (user.verifications && (user.verifications as any)[catKey]) {
      (user.verifications as any)[catKey].status = 'PENDING';
      user.markModified('verifications');
      await user.save();
    }

    return {
      success: true,
      message: 'Verification request submitted successfully',
      request,
    };
  }

  /**
   * Secure authorized access to private verification evidence files.
   */
  async getVerificationEvidenceUrl(
    requesterUserId: string,
    requesterRole: string,
    requestId: string,
    fileId: string,
  ) {
    const request = await this.verificationRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Verification request not found');

    const isCandidateOwner = String(request.userId) === String(requesterUserId);
    const isAdmin = requesterRole === 'admin' || requesterRole === 'superuser';

    if (!isCandidateOwner && !isAdmin) {
      throw new ForbiddenException(
        'Private verification evidence can only be accessed by the candidate or platform administrators.',
      );
    }

    const file = (request.evidenceFiles || []).find((f) => f.id === fileId);
    if (!file || !file.fileKey) {
      throw new NotFoundException('Evidence file not found');
    }

    const signedUrl = await this.signedUrlService.generateSignedImageUrl(
      file.fileKey,
    );
    return {
      success: true,
      downloadUrl: signedUrl,
      filename: file.name,
    };
  }

  /**
   * Admin review of verification request.
   */
  async adminReviewVerificationRequest(
    adminUserId: string,
    requestId: string,
    dto: ReviewVerificationRequestDto,
  ) {
    const request = await this.verificationRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Verification request not found');

    const user = await this.userModel.findById(request.userId);
    if (!user) throw new NotFoundException('Candidate user not found');

    request.status = dto.status;
    request.reviewedBy = new Types.ObjectId(adminUserId);
    request.reviewedAt = new Date();
    if (dto.rejectionReason)
      request.rejectionReason = dto.rejectionReason.trim();
    if (dto.adminNotes) request.adminNotes = dto.adminNotes.trim();
    if (dto.validUntil) request.validUntil = new Date(dto.validUntil);

    request.auditLog.push({
      status: dto.status,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(adminUserId),
      note: dto.adminNotes || `Review completed with status ${dto.status}`,
    });
    await request.save();

    // Update user verifications record
    const catKey =
      request.category === VerificationCategory.BUSINESS_AFFILIATION
        ? 'businessAffiliation'
        : (request.category.toLowerCase() as keyof typeof user.verifications);

    if (user.verifications && (user.verifications as any)[catKey]) {
      const targetCat = (user.verifications as any)[catKey];
      targetCat.status = dto.status;
      if (dto.status === VerificationStatus.VERIFIED) {
        targetCat.verifiedAt = new Date();
        targetCat.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
        if (dto.title) targetCat.title = dto.title.trim();
        if (dto.affiliation) targetCat.affiliation = dto.affiliation.trim();

        // Also sync legacy verification status for Identity/Professional
        if (
          request.category === VerificationCategory.IDENTITY ||
          request.category === VerificationCategory.PROFESSIONAL
        ) {
          user.verification = {
            status: 'VERIFIED',
            verificationType: request.category,
            verifiedAt: new Date(),
          };
        }
      }
      user.markModified('verifications');
      await user.save();
    }

    // Send notification to user
    if (this.notificationsService) {
      await this.notificationsService.createNotification({
        recipientId: user._id,
        actorId: adminUserId,
        type: 'verification_update',
        category: 'general',
        priority: 'HIGH',
        title: 'Verification Request Update',
        message: `Your ${request.category.toLowerCase().replace('_', ' ')} verification request has been ${dto.status.toLowerCase()}.`,
        actionUrl: '/profile/verification',
        targetUrl: '/profile/verification',
      });
    }

    return {
      success: true,
      message: `Verification request successfully ${dto.status.toLowerCase()}`,
      request,
    };
  }
}
