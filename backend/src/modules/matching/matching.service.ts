import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  JobTalentMatch,
  JobTalentMatchDocument,
  MatchCategory,
  MatchStatus,
} from './schemas/job-talent-match.schema';
import {
  JobOpportunityInvite,
  JobOpportunityInviteDocument,
  InviteStatus,
} from './schemas/job-opportunity-invite.schema';
import {
  UserJobRecommendation,
  UserJobRecommendationDocument,
  RecommendationFeedback,
  RecommendationType,
} from './schemas/user-job-recommendation.schema';
import {
  Opportunity,
  OpportunityDocument,
  OpportunityStatus,
} from '../opportunities/schemas/opportunity.schema';
import {
  Organization,
  OrganizationDocument,
  BusinessStatus,
} from '../organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
  OrganizationRole,
  MembershipStatus,
} from '../organizations/schemas/organization-membership.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  Project,
  ProjectDocument,
  ProjectVisibility,
} from '../projects/schemas/project.schema';
import {
  JobApplication,
  JobApplicationDocument,
  JobApplicationStatus,
} from '../opportunities/schemas/job-application.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  calculateMatch,
  JobProfile,
  CandidateProfile,
  MatchResult,
  MATCH_THRESHOLDS,
  determineRecommendationTypes,
} from './matching.engine';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectModel(JobTalentMatch.name)
    private readonly matchModel: Model<JobTalentMatchDocument>,
    @InjectModel(JobOpportunityInvite.name)
    private readonly inviteModel: Model<JobOpportunityInviteDocument>,
    @InjectModel(Opportunity.name)
    private readonly oppModel: Model<OpportunityDocument>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name)
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional()
    @InjectModel(Project.name)
    private readonly projectModel?: Model<ProjectDocument>,
    @Optional()
    @InjectModel(JobApplication.name)
    private readonly jobAppModel?: Model<JobApplicationDocument>,
    @Optional()
    private readonly auditLogsService?: AuditLogsService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    @InjectModel(UserJobRecommendation.name)
    private readonly userJobRecModel?: Model<UserJobRecommendationDocument>,
  ) {}

  // =========================================================================
  // TALENT MATCHING — CORE PIPELINE
  // =========================================================================

  /**
   * Trigger matching for a published job.
   * Called asynchronously after job publication.
   */
  async triggerJobMatching(
    jobId: string,
    requesterId?: string,
  ): Promise<{
    status: string;
    candidatesRetrieved: number;
    candidatesScored: number;
    processingDurationMs: number;
    modelVersion: string;
  }> {
    const startTime = Date.now();
    this.logger.log(`[matchingStarted] jobId=${jobId}`);

    // Validate job exists and is published
    const job = (await this.oppModel.findById(jobId).lean()) as any;
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    if (job.status !== OpportunityStatus.PUBLISHED) {
      throw new BadRequestException('Only published jobs can trigger matching');
    }

    // Validate business is approved
    const business = (await this.orgModel
      .findById(job.organizationId)
      .lean()) as any;
    if (!business || business.status !== BusinessStatus.APPROVED) {
      throw new ForbiddenException(
        'Only approved businesses can run talent matching',
      );
    }

    // Build the job profile for matching
    const jobProfile = this.buildJobProfile(job);

    // Stage 1: Deterministic eligibility filter — bounded retrieval
    const eligibleCandidates = await this.retrieveEligibleCandidates(
      jobProfile,
      job,
    );
    this.logger.log(
      `[candidateCountRetrieved] jobId=${jobId} count=${eligibleCandidates.length}`,
    );

    // Stage 2: Score each candidate
    const matchResults: MatchResult[] = [];
    for (const candidate of eligibleCandidates) {
      try {
        const result = calculateMatch(jobProfile, candidate);
        // Only store candidates above minimum threshold
        if (result.score >= MATCH_THRESHOLDS.POTENTIALLY_COMPATIBLE) {
          matchResults.push(result);
        }
      } catch (err) {
        this.logger.warn(
          `[matchingError] candidateId=${candidate.userId} error=${err}`,
        );
      }
    }

    this.logger.log(
      `[candidateCountScored] jobId=${jobId} count=${matchResults.length}`,
    );

    // Sort by score descending
    matchResults.sort((a, b) => b.score - a.score);

    // Stage 3: Upsert match results (replace stale, add new)
    await this.matchModel.deleteMany({ jobId: new Types.ObjectId(jobId) });

    if (matchResults.length > 0) {
      const docs = matchResults.map((r) => ({
        jobId: new Types.ObjectId(jobId),
        businessId: job.organizationId,
        candidateUserId: new Types.ObjectId(r.candidateUserId),
        score: r.score,
        category: r.category,
        dimensionScores: r.dimensionScores,
        matchReasons: r.matchReasons,
        gapReasons: r.gapReasons,
        hardRequirementFailures: r.hardRequirementFailures,
        passesHardRequirements: r.passesHardRequirements,
        matchedSkills: r.matchedSkills,
        matchedSoftware: r.matchedSoftware,
        matchedSectors: r.matchedSectors,
        matchedProjects: r.matchedProjects,
        status: MatchStatus.ACTIVE,
        matchingEngineVersion: r.matchingEngineVersion,
        calculatedAt: new Date(),
      }));

      await this.matchModel.insertMany(docs, { ordered: false });
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `[matchingCompleted] jobId=${jobId} scored=${matchResults.length} duration=${durationMs}ms`,
    );

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: requesterId ? new Types.ObjectId(requesterId) : null,
        action: 'TALENT_MATCHING_COMPLETED',
        entityType: 'Opportunity',
        entityId: jobId,
        message: `AI talent matching completed for job. ${matchResults.length} candidates scored in ${durationMs}ms.`,
        metadata: {
          jobId,
          candidatesRetrieved: eligibleCandidates.length,
          candidatesScored: matchResults.length,
          durationMs,
          modelVersion: 'v1',
        },
      });
    }

    return {
      status: 'completed',
      candidatesRetrieved: eligibleCandidates.length,
      candidatesScored: matchResults.length,
      processingDurationMs: durationMs,
      modelVersion: 'v1',
    };
  }

  // =========================================================================
  // RECOMMENDED TALENT — RECRUITER VIEWS
  // =========================================================================

  /**
   * Get recommended talent for a job (cached results).
   * Requires org membership verification.
   */
  async getRecommendedTalent(
    userId: string,
    jobId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      saved?: string | boolean;
    } = {},
  ) {
    const job = await this.oppModel.findById(jobId);
    if (!job) throw new NotFoundException('Job not found');

    await this.assertOrgRole(userId, String(job.organizationId), [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      jobId: new Types.ObjectId(jobId),
      status: MatchStatus.ACTIVE,
      isDismissed: { $ne: true },
    };

    if (options.category) {
      filter.category = options.category;
    }
    if (options.saved === 'true' || options.saved === true) {
      filter.isSaved = true;
    }

    const [total, matches] = await Promise.all([
      this.matchModel.countDocuments(filter),
      this.matchModel
        .find(filter)
        .sort({ score: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Fetch candidate profiles
    const candidateIds = matches.map((m: any) => m.candidateUserId);
    const candidates = await this.userModel
      .find({ _id: { $in: candidateIds } })
      .select(
        'name username avatar headline currentRole primaryRole primaryDiscipline specializations infrastructureSectors yearsOfExperience location structuredSkills availability careerPreferences',
      )
      .lean();

    const candidateMap = new Map(
      candidates.map((c: any) => [String(c._id), c]),
    );

    // Check which candidates have received invites already
    const existingInvites = await this.inviteModel
      .find({
        jobId: new Types.ObjectId(jobId),
        candidateUserId: { $in: candidateIds },
      })
      .select('candidateUserId status')
      .lean();
    const inviteMap = new Map(
      existingInvites.map((inv: any) => [
        String(inv.candidateUserId),
        inv.status,
      ]),
    );

    const data = matches.map((match: any) => {
      const candidate = candidateMap.get(String(match.candidateUserId));
      return {
        matchId: match._id,
        score: match.score,
        category: match.category,
        matchReasons: match.matchReasons,
        gapReasons: match.gapReasons,
        hardRequirementFailures: match.hardRequirementFailures,
        passesHardRequirements: match.passesHardRequirements,
        matchedSkills: match.matchedSkills,
        matchedSoftware: match.matchedSoftware,
        matchedSectors: match.matchedSectors,
        matchedProjects: match.matchedProjects,
        dimensionScores: match.dimensionScores,
        matchingEngineVersion: match.matchingEngineVersion,
        calculatedAt: match.calculatedAt,
        isSaved: Boolean(match.isSaved),
        inviteStatus: inviteMap.get(String(match.candidateUserId)) || null,
        candidate: candidate
          ? {
              id: candidate._id,
              name: candidate.name,
              username: candidate.username,
              avatar: candidate.avatar || '',
              headline: candidate.headline || '',
              currentRole: candidate.currentRole || '',
              primaryRole: candidate.primaryRole || 'PROFESSIONAL',
              primaryDiscipline: candidate.primaryDiscipline || '',
              specializations: candidate.specializations || [],
              infrastructureSectors: candidate.infrastructureSectors || [],
              yearsOfExperience: candidate.yearsOfExperience || 0,
              location: candidate.location || '',
              softwareSkills: candidate.structuredSkills?.softwareSkills || [],
              availability: candidate.availability || 'NOT_CURRENTLY_AVAILABLE',
            }
          : null,
      };
    });

    // Count by category
    const categoryCounts = await this.matchModel.aggregate([
      {
        $match: {
          jobId: new Types.ObjectId(jobId),
          status: MatchStatus.ACTIVE,
        },
      },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const counts: Record<string, number> = {};
    for (const c of categoryCounts) {
      counts[c._id] = c.count;
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      categoryCounts: {
        highlyCompatible: counts[MatchCategory.HIGHLY_COMPATIBLE] || 0,
        stronglyCompatible: counts[MatchCategory.STRONGLY_COMPATIBLE] || 0,
        potentiallyCompatible:
          counts[MatchCategory.POTENTIALLY_COMPATIBLE] || 0,
      },
      matchingEngineVersion: 'v1',
      isStale: false,
    };
  }

  /**
   * Get match summary for the recruiter dashboard
   */
  async getJobMatchSummary(userId: string, jobId: string) {
    const job = await this.oppModel.findById(jobId);
    if (!job) throw new NotFoundException('Job not found');

    await this.assertOrgRole(userId, String(job.organizationId), [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    const [totalMatches, invitesSent, savedCount, applicantCount] =
      await Promise.all([
        this.matchModel.countDocuments({
          jobId: new Types.ObjectId(jobId),
          status: MatchStatus.ACTIVE,
          isDismissed: { $ne: true },
        }),
        this.inviteModel.countDocuments({
          jobId: new Types.ObjectId(jobId),
        }),
        this.matchModel.countDocuments({
          jobId: new Types.ObjectId(jobId),
          status: MatchStatus.ACTIVE,
          isSaved: true,
        }),
        this.jobAppModel
          ? this.jobAppModel.countDocuments({
              jobId: new Types.ObjectId(jobId),
              status: { $ne: JobApplicationStatus.WITHDRAWN },
            })
          : Promise.resolve(0),
      ]);

    return {
      jobId,
      applicants: applicantCount,
      totalRecommendedTalent: totalMatches,
      savedCandidates: savedCount,
      offersSent: invitesSent,
    };
  }

  /**
   * Toggle save status for a matched candidate
   */
  async toggleSaveCandidate(
    userId: string,
    jobId: string,
    candidateUserId: string,
  ): Promise<{ isSaved: boolean }> {
    const job = await this.oppModel.findById(jobId);
    if (!job) throw new NotFoundException('Job not found');

    await this.assertOrgRole(userId, String(job.organizationId), [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    const match = await this.matchModel.findOne({
      jobId: new Types.ObjectId(jobId),
      candidateUserId: new Types.ObjectId(candidateUserId),
    });

    if (!match) {
      throw new NotFoundException(
        'Candidate match record not found for this job',
      );
    }

    match.isSaved = !match.isSaved;
    await match.save();

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: match.isSaved ? 'CANDIDATE_SAVED' : 'CANDIDATE_UNSAVED',
        entityType: 'JobTalentMatch',
        entityId: String(match._id),
        message: `Candidate ${candidateUserId} was ${match.isSaved ? 'saved' : 'unsaved'} for job "${job.title}"`,
        metadata: { jobId, candidateUserId, isSaved: match.isSaved },
      });
    }

    return { isSaved: match.isSaved };
  }

  /**
   * Dismiss / remove a candidate from recommended talent list
   */
  async dismissCandidate(
    userId: string,
    jobId: string,
    candidateUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    const job = await this.oppModel.findById(jobId);
    if (!job) throw new NotFoundException('Job not found');

    await this.assertOrgRole(userId, String(job.organizationId), [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    const match = await this.matchModel.findOne({
      jobId: new Types.ObjectId(jobId),
      candidateUserId: new Types.ObjectId(candidateUserId),
    });

    if (!match) {
      throw new NotFoundException(
        'Candidate match record not found for this job',
      );
    }

    match.isDismissed = true;
    await match.save();

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'CANDIDATE_DISMISSED',
        entityType: 'JobTalentMatch',
        entityId: String(match._id),
        message: `Candidate ${candidateUserId} dismissed from recommendations for job "${job.title}"`,
        metadata: { jobId, candidateUserId },
      });
    }

    return { success: true, message: 'Candidate removed from recommendations' };
  }

  // =========================================================================
  // SEND OPPORTUNITY (INVITE)
  // =========================================================================

  /**
   * Recruiter sends a structured opportunity to a candidate
   */
  async sendOpportunityInvite(
    senderUserId: string,
    jobId: string,
    candidateUserId: string,
    message: string,
  ) {
    const job = await this.oppModel.findById(jobId);
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== OpportunityStatus.PUBLISHED) {
      throw new BadRequestException('Can only send invites for published jobs');
    }

    await this.assertOrgRole(senderUserId, String(job.organizationId), [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    // Verify candidate exists
    const candidate = await this.userModel
      .findById(candidateUserId)
      .select('name');
    if (!candidate) throw new NotFoundException('Candidate not found');

    // Check for existing invite
    const existing = await this.inviteModel.findOne({
      jobId: job._id,
      candidateUserId: new Types.ObjectId(candidateUserId),
    });
    if (existing) {
      throw new ConflictException(
        'An opportunity invite has already been sent to this candidate for this job',
      );
    }

    const invite = await this.inviteModel.create({
      jobId: job._id,
      businessId: job.organizationId,
      candidateUserId: new Types.ObjectId(candidateUserId),
      senderUserId: new Types.ObjectId(senderUserId),
      message: (message || '').trim(),
      status: InviteStatus.SENT,
    });

    // Send notification to candidate
    if (this.notificationsService) {
      try {
        await (this.notificationsService as any).createNotification?.({
          userId: candidateUserId,
          type: 'opportunity_invite',
          title: 'New Opportunity from Employer',
          message: `You received an opportunity for "${job.title}"`,
          metadata: {
            jobId: String(job._id),
            inviteId: String(invite._id),
            jobTitle: job.title,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to send invite notification: ${err}`);
      }
    }

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(senderUserId),
        action: 'OPPORTUNITY_INVITE_SENT',
        entityType: 'JobOpportunityInvite',
        entityId: String(invite._id),
        message: `Opportunity invite sent for job "${job.title}" to candidate "${candidate.name}"`,
        metadata: {
          jobId: String(job._id),
          candidateUserId,
          inviteId: String(invite._id),
        },
      });
    }

    return invite;
  }

  /**
   * Candidate responds to an opportunity invite
   */
  async respondToInvite(
    candidateUserId: string,
    inviteId: string,
    response: 'interested' | 'declined',
  ) {
    const invite = await this.inviteModel.findOne({
      _id: new Types.ObjectId(inviteId),
      candidateUserId: new Types.ObjectId(candidateUserId),
    });

    if (!invite) throw new NotFoundException('Opportunity invite not found');

    if (
      invite.status !== InviteStatus.SENT &&
      invite.status !== InviteStatus.VIEWED
    ) {
      throw new BadRequestException(
        'This invite has already been responded to',
      );
    }

    invite.status =
      response === 'interested'
        ? InviteStatus.INTERESTED
        : InviteStatus.DECLINED;
    invite.respondedAt = new Date();
    await invite.save();

    // Notify recruiter
    if (this.notificationsService) {
      try {
        const candidate = await this.userModel
          .findById(candidateUserId)
          .select('name');
        const job = await this.oppModel.findById(invite.jobId).select('title');
        await (this.notificationsService as any).createNotification?.({
          userId: String(invite.senderUserId),
          type: 'invite_response',
          title:
            response === 'interested'
              ? 'Candidate Interested!'
              : 'Candidate Declined',
          message: `${candidate?.name || 'A candidate'} ${response === 'interested' ? 'is interested in' : 'declined'} the opportunity for "${job?.title || 'a job'}"`,
          metadata: {
            inviteId: String(invite._id),
            jobId: String(invite.jobId),
            candidateUserId,
            response,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to send response notification: ${err}`);
      }
    }

    return invite;
  }

  /**
   * Mark invite as viewed by candidate
   */
  async markInviteViewed(candidateUserId: string, inviteId: string) {
    const invite = await this.inviteModel.findOne({
      _id: new Types.ObjectId(inviteId),
      candidateUserId: new Types.ObjectId(candidateUserId),
    });
    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.status === InviteStatus.SENT) {
      invite.status = InviteStatus.VIEWED;
      invite.viewedAt = new Date();
      await invite.save();
    }

    return invite;
  }

  /**
   * Get candidate's received opportunity invites
   */
  async getMyInvites(candidateUserId: string) {
    const invites = await this.inviteModel
      .find({ candidateUserId: new Types.ObjectId(candidateUserId) })
      .sort({ createdAt: -1 })
      .populate(
        'jobId',
        'title discipline location workMode jobType infrastructureSector',
      )
      .populate('businessId', 'name slug logo industry location status')
      .populate('senderUserId', 'name avatar')
      .lean();

    return invites.map((inv: any) => ({
      id: inv._id,
      status: inv.status,
      message: inv.message,
      createdAt: inv.createdAt,
      viewedAt: inv.viewedAt,
      respondedAt: inv.respondedAt,
      job: inv.jobId
        ? {
            id: inv.jobId._id,
            title: inv.jobId.title,
            discipline: inv.jobId.discipline,
            location: inv.jobId.location,
            workMode: inv.jobId.workMode,
            jobType: inv.jobId.jobType,
          }
        : null,
      business: inv.businessId
        ? {
            id: inv.businessId._id,
            name: inv.businessId.name,
            slug: inv.businessId.slug,
            logo: inv.businessId.logo,
          }
        : null,
      sender: inv.senderUserId
        ? {
            name: inv.senderUserId.name,
            avatar: inv.senderUserId.avatar,
          }
        : null,
    }));
  }

  // =========================================================================
  // CACHE INVALIDATION
  // =========================================================================

  /**
   * Invalidate matches when a job's requirements change
   */
  async invalidateJobMatches(jobId: string) {
    const result = await this.matchModel.updateMany(
      { jobId: new Types.ObjectId(jobId), status: MatchStatus.ACTIVE },
      { $set: { status: MatchStatus.STALE } },
    );
    if (
      this.userJobRecModel &&
      typeof this.userJobRecModel.updateMany === 'function'
    ) {
      await this.userJobRecModel.updateMany(
        { jobId: new Types.ObjectId(jobId), status: MatchStatus.ACTIVE },
        { $set: { status: MatchStatus.STALE } },
      );
    }
    this.logger.log(
      `[matchesInvalidated] jobId=${jobId} count=${result.modifiedCount}`,
    );
    return result.modifiedCount;
  }

  /**
   * Invalidate matches when a candidate's profile changes
   */
  async invalidateCandidateMatches(candidateUserId: string) {
    const result = await this.matchModel.updateMany(
      {
        candidateUserId: new Types.ObjectId(candidateUserId),
        status: MatchStatus.ACTIVE,
      },
      { $set: { status: MatchStatus.STALE } },
    );
    if (
      this.userJobRecModel &&
      typeof this.userJobRecModel.updateMany === 'function'
    ) {
      await this.userJobRecModel.updateMany(
        {
          userId: new Types.ObjectId(candidateUserId),
          status: MatchStatus.ACTIVE,
        },
        { $set: { status: MatchStatus.STALE } },
      );
    }
    this.logger.log(
      `[matchesInvalidated] candidateUserId=${candidateUserId} count=${result.modifiedCount}`,
    );
    return result.modifiedCount;
  }

  /**
   * Invalidate candidate's recommendations
   */
  async invalidateUserJobRecommendations(userId: string) {
    if (!this.userJobRecModel) return 0;
    const result = await this.userJobRecModel.updateMany(
      { userId: new Types.ObjectId(userId), status: MatchStatus.ACTIVE },
      { $set: { status: MatchStatus.STALE } },
    );
    this.logger.log(
      `[userRecommendationsInvalidated] userId=${userId} count=${result.modifiedCount}`,
    );
    return result.modifiedCount;
  }

  /**
   * Invalidate recommendations containing a specific job
   */
  async invalidateJobRecommendationsByJob(jobId: string) {
    if (!this.userJobRecModel) return 0;
    const result = await this.userJobRecModel.updateMany(
      { jobId: new Types.ObjectId(jobId), status: MatchStatus.ACTIVE },
      { $set: { status: MatchStatus.STALE } },
    );
    this.logger.log(
      `[jobRecommendationsInvalidated] jobId=${jobId} count=${result.modifiedCount}`,
    );
    return result.modifiedCount;
  }

  // =========================================================================
  // BASIC TALENT SEARCH (for recruiters)
  // =========================================================================

  /**
   * Recruiter talent search using matching engine
   */
  async searchTalent(
    userId: string,
    orgId: string,
    searchCriteria: {
      discipline?: string;
      sector?: string;
      software?: string;
      skill?: string;
      location?: string;
      minExperience?: number;
      maxExperience?: number;
      page?: number;
      limit?: number;
    },
  ) {
    await this.assertOrgRole(userId, orgId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    const page = Math.max(1, Number(searchCriteria.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(searchCriteria.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      discoverableToRecruiters: true,
      profileVisibility: { $ne: 'PRIVATE' },
      'account_Status.isBlocked': { $ne: true },
      'account_Status.isDeleted': { $ne: true },
      primaryRole: { $in: ['STUDENT', 'PROFESSIONAL', 'MENTOR'] },
    };

    if (searchCriteria.discipline) {
      filter.primaryDiscipline = new RegExp(searchCriteria.discipline, 'i');
    }
    if (searchCriteria.sector) {
      filter.infrastructureSectors = new RegExp(searchCriteria.sector, 'i');
    }
    if (searchCriteria.software) {
      filter['structuredSkills.softwareSkills'] = new RegExp(
        searchCriteria.software,
        'i',
      );
    }
    if (searchCriteria.skill) {
      filter.$or = [
        {
          'structuredSkills.technicalSkills': new RegExp(
            searchCriteria.skill,
            'i',
          ),
        },
        {
          'structuredSkills.industrySkills': new RegExp(
            searchCriteria.skill,
            'i',
          ),
        },
        { skills: new RegExp(searchCriteria.skill, 'i') },
      ];
    }
    if (searchCriteria.location) {
      filter.$or = [
        ...(filter.$or || []),
        { location: new RegExp(searchCriteria.location, 'i') },
        { preferredLocations: new RegExp(searchCriteria.location, 'i') },
      ];
    }
    if (searchCriteria.minExperience !== undefined) {
      filter.yearsOfExperience = {
        ...(filter.yearsOfExperience || {}),
        $gte: Number(searchCriteria.minExperience),
      };
    }
    if (searchCriteria.maxExperience !== undefined) {
      filter.yearsOfExperience = {
        ...(filter.yearsOfExperience || {}),
        $lte: Number(searchCriteria.maxExperience),
      };
    }

    const [total, candidates] = await Promise.all([
      this.userModel.countDocuments(filter),
      this.userModel
        .find(filter)
        .select(
          'name username avatar headline currentRole primaryRole primaryDiscipline specializations infrastructureSectors yearsOfExperience location structuredSkills availability',
        )
        .sort({ yearsOfExperience: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      data: candidates.map((c: any) => ({
        id: c._id,
        name: c.name,
        username: c.username,
        avatar: c.avatar || '',
        headline: c.headline || '',
        currentRole: c.currentRole || '',
        primaryRole: c.primaryRole || 'PROFESSIONAL',
        primaryDiscipline: c.primaryDiscipline || '',
        specializations: c.specializations || [],
        infrastructureSectors: c.infrastructureSectors || [],
        yearsOfExperience: c.yearsOfExperience || 0,
        location: c.location || '',
        softwareSkills: c.structuredSkills?.softwareSkills || [],
        availability: c.availability || 'NOT_CURRENTLY_AVAILABLE',
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // =========================================================================
  // CANDIDATE RETRIEVAL — STAGE 1
  // =========================================================================

  /**
   * Deterministic eligibility filter.
   * Retrieves bounded candidate set using indexed MongoDB queries.
   */
  private async retrieveEligibleCandidates(
    jobProfile: JobProfile,
    job: any,
  ): Promise<CandidateProfile[]> {
    // Base filter: discoverable, non-blocked, relevant roles
    const filter: Record<string, any> = {
      discoverableToRecruiters: true,
      profileVisibility: { $ne: 'PRIVATE' },
      'account_Status.isBlocked': { $ne: true },
      'account_Status.isDeleted': { $ne: true },
      primaryRole: { $in: ['STUDENT', 'PROFESSIONAL', 'MENTOR'] },
    };

    // Soft filter by discipline (broaden to retrieve more, scoring will narrow)
    // Only apply if job has a specific discipline
    if (jobProfile.discipline) {
      // Don't hard-filter by discipline — let scoring handle it
      // But if we have discipline, use it as a preference in sort
    }

    // Cap retrieval at 200 candidates for performance
    const MAX_CANDIDATES = 200;

    const users = await this.userModel
      .find(filter)
      .select(
        'name username avatar headline currentRole primaryRole primaryDiscipline specializations infrastructureSectors yearsOfExperience location preferredLocations skills structuredSkills experience education certifications careerPreferences availability discoverableToRecruiters profileVisibility',
      )
      .limit(MAX_CANDIDATES)
      .lean();

    // Fetch projects for these candidates
    const projectMap = new Map<string, any[]>();
    if (this.projectModel) {
      const userIds = users.map((u: any) => u._id);
      const projects = await this.projectModel
        .find({
          ownerId: { $in: userIds },
          visibility: { $ne: ProjectVisibility.PRIVATE },
        })
        .select(
          'ownerId title description skills softwareUsed infrastructureSector role',
        )
        .lean();

      for (const proj of projects) {
        const ownerId = String(proj.ownerId);
        if (!projectMap.has(ownerId)) {
          projectMap.set(ownerId, []);
        }
        projectMap.get(ownerId).push(proj);
      }
    }

    return users.map((u: any) =>
      this.buildCandidateProfile(u, projectMap.get(String(u._id)) || []),
    );
  }

  // =========================================================================
  // PHASE 4: TALENT → JOB RECOMMENDATIONS ("JOBS FOR YOU")
  // =========================================================================

  /**
   * Get personalized "Jobs For You" for the candidate
   */
  async getRecommendedJobs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      type?: string;
      refresh?: boolean;
    } = {},
  ) {
    if (!this.userJobRecModel) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        categoryCounts: {
          highlyCompatible: 0,
          stronglyCompatible: 0,
          potentiallyCompatible: 0,
        },
        matchingEngineVersion: 'v1',
      };
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    // Check if user has active cached recommendations
    const activeCount = await this.userJobRecModel.countDocuments({
      userId: new Types.ObjectId(userId),
      status: MatchStatus.ACTIVE,
      isHidden: { $ne: true },
      isDismissed: { $ne: true },
    });

    if (activeCount === 0 || options.refresh) {
      await this.triggerUserJobRecommendations(userId);
    }

    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
      status: MatchStatus.ACTIVE,
      isHidden: { $ne: true },
      isDismissed: { $ne: true },
      passesHardRequirements: true,
    };

    if (options.category) {
      filter.category = options.category;
    }
    if (options.type) {
      filter.recommendationTypes = options.type;
    }

    const [total, recs, categoryCountsAgg] = await Promise.all([
      this.userJobRecModel.countDocuments(filter),
      this.userJobRecModel
        .find(filter)
        .sort({ compatibilityScore: -1, calculatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'jobId',
          select:
            'title discipline specialization infrastructureSector location workMode jobType minYearsExperience maxYearsExperience requiredSkills preferredSkills requiredSoftware preferredSoftware salaryRange deadline createdAt status',
        })
        .populate({
          path: 'businessId',
          select: 'name slug logo industry location status verified',
        })
        .lean(),
      this.userJobRecModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            status: MatchStatus.ACTIVE,
            isHidden: { $ne: true },
            isDismissed: { $ne: true },
            passesHardRequirements: true,
          },
        },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const categoryCounts: Record<string, number> = {
      highlyCompatible: 0,
      stronglyCompatible: 0,
      potentiallyCompatible: 0,
    };
    for (const c of categoryCountsAgg) {
      if (c._id === MatchCategory.HIGHLY_COMPATIBLE)
        categoryCounts.highlyCompatible = c.count;
      else if (c._id === MatchCategory.STRONGLY_COMPATIBLE)
        categoryCounts.stronglyCompatible = c.count;
      else if (c._id === MatchCategory.POTENTIALLY_COMPATIBLE)
        categoryCounts.potentiallyCompatible = c.count;
    }

    // Check applied jobs for this candidate
    let appliedJobIds = new Set<string>();
    if (this.jobAppModel) {
      const apps = await this.jobAppModel
        .find({
          candidateId: new Types.ObjectId(userId),
          status: { $ne: JobApplicationStatus.WITHDRAWN },
        })
        .select('jobId')
        .lean();
      appliedJobIds = new Set(apps.map((a: any) => String(a.jobId)));
    }

    const data = recs
      .filter(
        (r: any) => r.jobId && r.jobId.status === OpportunityStatus.PUBLISHED,
      )
      .map((r: any) => ({
        id: r._id,
        jobId: r.jobId._id,
        title: r.jobId.title,
        discipline: r.jobId.discipline,
        specialization: r.jobId.specialization,
        infrastructureSector: r.jobId.infrastructureSector,
        location: r.jobId.location,
        workMode: r.jobId.workMode,
        jobType: r.jobId.jobType,
        experienceLevel: `${r.jobId.minYearsExperience || 0}–${r.jobId.maxYearsExperience || 10}+ yrs`,
        requiredSkills: r.jobId.requiredSkills || [],
        requiredSoftware: r.jobId.requiredSoftware || [],
        salaryRange: r.jobId.salaryRange,
        createdAt: r.jobId.createdAt,
        business: r.businessId
          ? {
              id: r.businessId._id,
              name: r.businessId.name,
              slug: r.businessId.slug,
              logo: r.businessId.logo,
              industry: r.businessId.industry,
              verified: r.businessId.verified,
            }
          : null,
        compatibilityScore: r.compatibilityScore,
        category: r.category,
        recommendationTypes: r.recommendationTypes || [],
        matchReasons: r.matchReasons || [],
        gapReasons: r.gapReasons || [],
        matchedSkills: r.matchedSkills || [],
        matchedSoftware: r.matchedSoftware || [],
        matchedSectors: r.matchedSectors || [],
        matchedProjects: r.matchedProjects || [],
        dimensionScores: r.dimensionScores || [],
        isSaved: Boolean(r.isSaved),
        feedback: r.feedback || 'NONE',
        isApplied: appliedJobIds.has(String(r.jobId._id)),
        calculatedAt: r.calculatedAt,
        matchingEngineVersion: r.modelVersion || 'v1',
      }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      categoryCounts,
      matchingEngineVersion: 'v1',
    };
  }

  /**
   * Calculate and cache "Jobs For You" recommendations for a user
   */
  async triggerUserJobRecommendations(userId: string) {
    if (!this.userJobRecModel) {
      return { status: 'skipped', recommendationsCount: 0 };
    }

    const startTime = Date.now();
    this.logger.log(`[userMatchingStarted] userId=${userId}`);

    const user = (await this.userModel.findById(userId).lean()) as any;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Candidate projects
    let projects: any[] = [];
    if (this.projectModel) {
      projects = await this.projectModel
        .find({
          ownerId: new Types.ObjectId(userId),
          visibility: { $ne: ProjectVisibility.PRIVATE },
        })
        .select(
          'ownerId title description skills softwareUsed infrastructureSector role',
        )
        .lean();
    }

    const candidateProfile = this.buildCandidateProfile(user, projects);

    // Retrieve active published jobs from approved businesses
    const approvedOrgs = await this.orgModel
      .find({ status: BusinessStatus.APPROVED })
      .select('_id')
      .lean();
    const approvedOrgIds = approvedOrgs.map((o: any) => o._id);

    // Bounded search for active jobs
    const jobQuery: Record<string, any> = {
      status: OpportunityStatus.PUBLISHED,
      organizationId: { $in: approvedOrgIds },
      $or: [
        { deadline: { $exists: false } },
        { deadline: null },
        { deadline: { $gte: new Date() } },
      ],
    };

    // Filter out jobs already applied by candidate
    if (this.jobAppModel) {
      const apps = await this.jobAppModel
        .find({
          candidateId: new Types.ObjectId(userId),
          status: { $ne: JobApplicationStatus.WITHDRAWN },
        })
        .select('jobId')
        .lean();
      if (apps.length > 0) {
        jobQuery._id = { $nin: apps.map((a: any) => a.jobId) };
      }
    }

    // Preserve previously hidden or dismissed jobs
    const existingInteractions = await this.userJobRecModel
      .find({
        userId: new Types.ObjectId(userId),
        $or: [{ isHidden: true }, { isDismissed: true }],
      })
      .select('jobId isHidden isDismissed feedback')
      .lean();

    const hiddenJobIds = new Set(
      existingInteractions
        .filter((e: any) => e.isHidden)
        .map((e: any) => String(e.jobId)),
    );
    const dismissedJobIds = new Set(
      existingInteractions
        .filter((e: any) => e.isDismissed)
        .map((e: any) => String(e.jobId)),
    );

    // Cap at 100 eligible jobs for performance
    const eligibleJobs = await this.oppModel
      .find(jobQuery)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const recDocs: any[] = [];
    const now = new Date();

    for (const job of eligibleJobs) {
      const jIdStr = String(job._id);
      if (hiddenJobIds.has(jIdStr) || dismissedJobIds.has(jIdStr)) {
        continue;
      }

      try {
        const jobProfile = this.buildJobProfile(job);
        const matchResult = calculateMatch(jobProfile, candidateProfile);

        // Hard requirements must be satisfied and score above minimum threshold
        if (
          matchResult.passesHardRequirements &&
          matchResult.score >= MATCH_THRESHOLDS.POTENTIALLY_COMPATIBLE
        ) {
          const jobCreatedAt = (job as any).createdAt;
          const isRecentlyPublished =
            jobCreatedAt &&
            now.getTime() - new Date(jobCreatedAt).getTime() <
              7 * 24 * 3600 * 1000;
          const recTypes = determineRecommendationTypes(
            matchResult,
            jobProfile,
            candidateProfile,
            Boolean(isRecentlyPublished),
          );

          recDocs.push({
            userId: new Types.ObjectId(userId),
            jobId: job._id,
            businessId: job.organizationId,
            compatibilityScore: matchResult.score,
            category: matchResult.category,
            dimensionScores: matchResult.dimensionScores,
            matchReasons: matchResult.matchReasons,
            gapReasons: matchResult.gapReasons,
            hardRequirementFailures: matchResult.hardRequirementFailures,
            passesHardRequirements: matchResult.passesHardRequirements,
            matchedSkills: matchResult.matchedSkills,
            matchedSoftware: matchResult.matchedSoftware,
            matchedSectors: matchResult.matchedSectors,
            matchedProjects: matchResult.matchedProjects,
            recommendationTypes: recTypes,
            status: MatchStatus.ACTIVE,
            modelVersion: 'v1',
            calculatedAt: now,
          });
        }
      } catch (err) {
        this.logger.warn(
          `Error matching job ${jIdStr} for user ${userId}: ${err}`,
        );
      }
    }

    // Sort by compatibility score descending
    recDocs.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Atomic refresh: remove non-hidden/non-dismissed active recs and insert fresh
    await this.userJobRecModel.deleteMany({
      userId: new Types.ObjectId(userId),
      isHidden: { $ne: true },
      isDismissed: { $ne: true },
    });

    if (recDocs.length > 0) {
      await this.userJobRecModel.insertMany(recDocs, { ordered: false });
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `[userMatchingCompleted] userId=${userId} scored=${recDocs.length} duration=${durationMs}ms`,
    );

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'USER_JOB_RECOMMENDATIONS_COMPLETED',
        entityType: 'User',
        entityId: userId,
        message: `Personalized job recommendations generated: ${recDocs.length} matching jobs identified in ${durationMs}ms.`,
        metadata: {
          userId,
          recommendationsCount: recDocs.length,
          durationMs,
          modelVersion: 'v1',
        },
      });
    }

    return {
      status: 'completed',
      recommendationsCount: recDocs.length,
      durationMs,
      modelVersion: 'v1',
    };
  }

  /**
   * Get "Why this job matches" structured explanation
   */
  async getJobRecommendationExplanation(userId: string, jobId: string) {
    const job = (await this.oppModel.findById(jobId).lean()) as any;
    if (!job) throw new NotFoundException('Job not found');

    const user = (await this.userModel.findById(userId).lean()) as any;
    if (!user) throw new NotFoundException('User not found');

    // Look for cached recommendation
    let rec: any = null;
    if (this.userJobRecModel) {
      rec = await this.userJobRecModel
        .findOne({
          userId: new Types.ObjectId(userId),
          jobId: new Types.ObjectId(jobId),
        })
        .lean();
    }

    if (!rec) {
      // Calculate on-the-fly
      let projects: any[] = [];
      if (this.projectModel) {
        projects = await this.projectModel
          .find({
            ownerId: new Types.ObjectId(userId),
            visibility: { $ne: ProjectVisibility.PRIVATE },
          })
          .select(
            'ownerId title description skills softwareUsed infrastructureSector role',
          )
          .lean();
      }
      const candidateProfile = this.buildCandidateProfile(user, projects);
      const jobProfile = this.buildJobProfile(job);
      const matchResult = calculateMatch(jobProfile, candidateProfile);
      rec = {
        compatibilityScore: matchResult.score,
        category: matchResult.category,
        dimensionScores: matchResult.dimensionScores,
        matchReasons: matchResult.matchReasons,
        gapReasons: matchResult.gapReasons,
        hardRequirementFailures: matchResult.hardRequirementFailures,
        passesHardRequirements: matchResult.passesHardRequirements,
        matchedSkills: matchResult.matchedSkills,
        matchedSoftware: matchResult.matchedSoftware,
        matchedSectors: matchResult.matchedSectors,
        matchedProjects: matchResult.matchedProjects,
      };
    }

    // Segment match reasons into strong and additional matches
    const strongMatches: string[] = [];
    const additionalMatches: string[] = [];

    for (const reason of rec.matchReasons || []) {
      if (
        reason.includes('discipline') ||
        reason.includes('experience') ||
        reason.includes('Highway') ||
        reason.includes('Primavera') ||
        reason.includes('AutoCAD') ||
        reason.includes('Civil') ||
        reason.includes('location')
      ) {
        strongMatches.push(reason);
      } else {
        additionalMatches.push(reason);
      }
    }

    if (strongMatches.length === 0 && (rec.matchReasons || []).length > 0) {
      strongMatches.push(...(rec.matchReasons || []));
    }

    return {
      jobId,
      jobTitle: job.title,
      companyName: job.organizationId?.name || '',
      compatibilityScore: rec.compatibilityScore,
      category: rec.category,
      strongMatches,
      additionalMatches,
      potentialGaps: rec.gapReasons || [],
      dimensionScores: rec.dimensionScores || [],
      passesHardRequirements: rec.passesHardRequirements,
      hardRequirementFailures: rec.hardRequirementFailures || [],
      matchedSkills: rec.matchedSkills || [],
      matchedSoftware: rec.matchedSoftware || [],
      matchedSectors: rec.matchedSectors || [],
      matchedProjects: rec.matchedProjects || [],
      modelVersion: 'v1',
    };
  }

  /**
   * Aggregate career profile insights & profile improvement suggestions
   */
  async getProfileJobInsights(userId: string) {
    if (!this.userJobRecModel) {
      return {
        totalRecommended: 0,
        highlyCompatibleCount: 0,
        stronglyCompatibleCount: 0,
        topMatchingSectors: ['Highways', 'Civil Infrastructure'],
        topMatchingSkills: [],
        commonGaps: [],
        profileImprovements: [],
      };
    }

    const recs = await this.userJobRecModel
      .find({
        userId: new Types.ObjectId(userId),
        status: MatchStatus.ACTIVE,
        isHidden: { $ne: true },
        isDismissed: { $ne: true },
        passesHardRequirements: true,
      })
      .select(
        'compatibilityScore category matchedSkills matchedSoftware matchedSectors gapReasons',
      )
      .lean();

    const totalRecommended = recs.length;
    const highlyCompatibleCount = recs.filter(
      (r) => r.compatibilityScore >= 80,
    ).length;
    const stronglyCompatibleCount = recs.filter(
      (r) => r.compatibilityScore >= 60,
    ).length;

    // Aggregate sectors
    const sectorFreq: Record<string, number> = {};
    for (const r of recs) {
      for (const s of r.matchedSectors || []) {
        sectorFreq[s] = (sectorFreq[s] || 0) + 1;
      }
    }
    const topMatchingSectors = Object.entries(sectorFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sector]) => sector);

    // Aggregate skills
    const skillFreq: Record<string, number> = {};
    for (const r of recs) {
      for (const sk of r.matchedSkills || []) {
        skillFreq[sk] = (skillFreq[sk] || 0) + 1;
      }
    }
    const topMatchingSkills = Object.entries(skillFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill]) => skill);

    // Aggregate common gaps
    const gapFreq: Record<string, number> = {};
    for (const r of recs) {
      for (const gap of r.gapReasons || []) {
        gapFreq[gap] = (gapFreq[gap] || 0) + 1;
      }
    }
    const commonGaps = Object.entries(gapFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([gap, count]) => ({ gap, affectedJobs: count }));

    // Formulate actionable profile improvements
    const profileImprovements = [];
    for (const item of commonGaps) {
      if (
        item.gap.toLowerCase().includes('software') ||
        item.gap.toLowerCase().includes('primavera') ||
        item.gap.toLowerCase().includes('autocad')
      ) {
        profileImprovements.push({
          title: 'Software Tool Experience',
          advice: `Add experience with "${item.gap.replace(/Missing software:\s*/i, '')}" if you have it to increase compatibility across ${item.affectedJobs} active infrastructure jobs.`,
          actionType: 'add_software',
        });
      } else if (item.gap.toLowerCase().includes('certif')) {
        profileImprovements.push({
          title: 'Certification Alignment',
          advice: `Consider adding your ${item.gap.replace(/Certifications not listed:\s*/i, '')} if completed to unlock higher matching tiers.`,
          actionType: 'add_certification',
        });
      } else {
        profileImprovements.push({
          title: 'Skill Enhancement',
          advice: `Highlight your ${item.gap} in your profile if you have practical field experience with it.`,
          actionType: 'add_skill',
        });
      }
    }

    return {
      totalRecommended,
      highlyCompatibleCount,
      stronglyCompatibleCount,
      topMatchingSectors:
        topMatchingSectors.length > 0
          ? topMatchingSectors
          : ['Highways', 'Civil Infrastructure'],
      topMatchingSkills,
      commonGaps,
      profileImprovements,
    };
  }

  /**
   * Hide a recommended job
   */
  async hideRecommendedJob(userId: string, jobId: string) {
    if (this.userJobRecModel) {
      await this.userJobRecModel.findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          jobId: new Types.ObjectId(jobId),
        },
        { $set: { isHidden: true } },
        { upsert: true, returnDocument: 'after' },
      );
    }

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'RECOMMENDED_JOB_HIDDEN',
        entityType: 'Opportunity',
        entityId: jobId,
        message: `User ${userId} hid recommended job ${jobId}`,
        metadata: { userId, jobId },
      });
    }

    return { success: true, message: 'Job hidden from recommendations' };
  }

  /**
   * Dismiss a recommended job
   */
  async dismissRecommendedJob(userId: string, jobId: string) {
    if (this.userJobRecModel) {
      await this.userJobRecModel.findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          jobId: new Types.ObjectId(jobId),
        },
        { $set: { isDismissed: true } },
        { upsert: true, returnDocument: 'after' },
      );
    }

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'RECOMMENDED_JOB_DISMISSED',
        entityType: 'Opportunity',
        entityId: jobId,
        message: `User ${userId} dismissed recommended job ${jobId}`,
        metadata: { userId, jobId },
      });
    }

    return { success: true, message: 'Job dismissed from recommendations' };
  }

  /**
   * Record candidate feedback on a recommended job (Interested / Not Interested)
   * Note: strictly does NOT alter candidate's profile skills or career preferences.
   */
  async recordJobFeedback(
    userId: string,
    jobId: string,
    feedback: 'INTERESTED' | 'NOT_INTERESTED',
  ) {
    const validFeedback =
      feedback === 'INTERESTED'
        ? RecommendationFeedback.INTERESTED
        : RecommendationFeedback.NOT_INTERESTED;

    if (this.userJobRecModel) {
      await this.userJobRecModel.findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          jobId: new Types.ObjectId(jobId),
        },
        { $set: { feedback: validFeedback } },
        { upsert: true, returnDocument: 'after' },
      );
    }

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'RECOMMENDED_JOB_FEEDBACK',
        entityType: 'Opportunity',
        entityId: jobId,
        message: `User ${userId} marked feedback "${feedback}" on job ${jobId}`,
        metadata: { userId, jobId, feedback },
      });
    }

    return { success: true, feedback: validFeedback };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private buildJobProfile(job: any): JobProfile {
    return {
      title: job.title || '',
      description: job.description || '',
      discipline: job.discipline || '',
      specialization: job.specialization || '',
      infrastructureSector: job.infrastructureSector || '',
      minYearsExperience: job.minYearsExperience || 0,
      maxYearsExperience: job.maxYearsExperience || 99,
      requiredSkills: job.requiredSkills || job.skills || [],
      preferredSkills: job.preferredSkills || [],
      requiredSoftware: job.requiredSoftware || [],
      preferredSoftware: job.preferredSoftware || [],
      requiredEducation: job.requiredEducation || '',
      requiredCertifications: job.requiredCertifications || [],
      preferredCertifications: job.preferredCertifications || [],
      location: job.location || '',
      workMode: job.workMode || 'On-site',
      responsibilities: job.responsibilities || '',
      requirements: job.requirements || '',
    };
  }

  buildCandidateProfile(u: any, projects: any[] = []): CandidateProfile {
    return {
      userId: String(u._id),
      name: u.name || '',
      username: u.username || '',
      avatar: u.avatar || '',
      headline: u.headline || '',
      currentRole: u.currentRole || '',
      primaryRole: u.primaryRole || 'STUDENT',
      primaryDiscipline: u.primaryDiscipline || '',
      specializations: u.specializations || [],
      infrastructureSectors: u.infrastructureSectors || [],
      yearsOfExperience:
        u.yearsOfExperience || (u.experience?.length ? u.experience.length : 0),
      location: u.location || '',
      preferredLocations: u.preferredLocations || [],
      skills: u.skills || [],
      structuredSkills: u.structuredSkills || {
        technicalSkills: u.skills || [],
        softwareSkills: [],
        industrySkills: [],
        professionalSkills: [],
      },
      experience: u.experience || [],
      education: u.education || [],
      certifications: u.certifications || [],
      projects: projects || [],
      careerPreferences: u.careerPreferences || {
        openToOpportunities: true,
        preferredRoles: [],
        preferredSectors: [],
        preferredLocations: [],
        preferredWorkMode: 'On-site',
        preferredEmploymentType: 'Full-time',
      },
      availability: u.availability || 'OPEN_TO_OPPORTUNITIES',
      discoverableToRecruiters: u.discoverableToRecruiters !== false,
      profileVisibility: u.profileVisibility || 'PUBLIC',
    };
  }

  private async assertOrgRole(
    userId: string,
    orgId: string,
    allowedRoles: OrganizationRole[],
  ) {
    const membership = await this.membershipModel.findOne({
      organizationId: new Types.ObjectId(orgId),
      userId: new Types.ObjectId(userId),
      status: MembershipStatus.ACTIVE,
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'You must be an Owner, Admin, or Recruiter of this organization',
      );
    }
  }
}
