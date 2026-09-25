import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Optional,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { escapeRegex } from '../../common/utils/regex.util';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Opportunity,
  OpportunityDocument,
  OpportunityType,
  WorkMode,
  ExperienceLevel,
  OpportunityStatus,
  OpportunityVisibility,
} from './schemas/opportunity.schema';
import {
  Organization,
  OrganizationDocument,
  BusinessStatus,
  OrganizationVerificationStatus,
} from '../organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
  OrganizationRole,
  MembershipStatus,
} from '../organizations/schemas/organization-membership.schema';
import { SavedJob, SavedJobDocument } from './schemas/saved-job.schema';
import {
  JobApplication,
  JobApplicationDocument,
  JobApplicationStatus,
} from './schemas/job-application.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MatchingService } from '../matching/matching.service';

export interface CreateOpportunityDto {
  organizationId: string;
  title: string;
  description?: string;
  type?: OpportunityType;
  jobType?: string;
  employmentType?: string;
  discipline?: string;
  specialization?: string;
  infrastructureSector?: string;
  minYearsExperience?: number;
  maxYearsExperience?: number;
  requiredSkills?: string[];
  preferredSkills?: string[];
  requiredSoftware?: string[];
  preferredSoftware?: string[];
  requiredEducation?: string;
  preferredEducation?: string;
  requiredCertifications?: string[];
  preferredCertifications?: string[];
  skills?: string[];
  location?: string;
  workMode?: string;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  applicationDeadline?: string | Date | null;
  visibility?: OpportunityVisibility;
  status?: OpportunityStatus;
  expiresAt?: string | Date | null;
}

export interface UpdateOpportunityDto extends Partial<CreateOpportunityDto> {}

export interface QueryOpportunitiesDto {
  q?: string;
  type?: OpportunityType;
  jobType?: string;
  workMode?: string;
  discipline?: string;
  sector?: string;
  software?: string;
  skill?: string;
  location?: string;
  minExp?: number;
  maxExp?: number;
  experienceLevel?: ExperienceLevel;
  organizationId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    @InjectModel(Opportunity.name)
    private readonly oppModel: Model<OpportunityDocument>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name)
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
    @Optional()
    @InjectModel(SavedJob.name)
    private readonly savedJobModel?: Model<SavedJobDocument>,
    @Optional()
    @InjectModel(JobApplication.name)
    private readonly jobAppModel?: Model<JobApplicationDocument>,
    @Optional()
    private readonly auditLogsService?: AuditLogsService,
    @Optional()
    @Inject(forwardRef(() => MatchingService))
    private readonly matchingService?: MatchingService,
  ) {}

  /**
   * Deterministic validation before publishing an infrastructure job
   */
  private validateJobForPublishing(dto: Partial<CreateOpportunityDto>) {
    const errors: string[] = [];

    if (!dto.title || !dto.title.trim()) {
      errors.push('Job title is required');
    }
    if (
      !dto.description?.trim() &&
      !dto.responsibilities?.trim() &&
      !dto.requirements?.trim()
    ) {
      errors.push(
        'Job description, responsibilities, or requirements are required',
      );
    }
    if (!dto.discipline || !dto.discipline.trim()) {
      errors.push('Infrastructure discipline is required');
    }
    if (!dto.infrastructureSector || !dto.infrastructureSector.trim()) {
      errors.push('Infrastructure sector is required');
    }
    if (!dto.location || !dto.location.trim()) {
      errors.push('Job location is required');
    }
    if (!dto.workMode) {
      errors.push('Work mode is required');
    }
    if (!dto.jobType && !dto.employmentType) {
      errors.push('Job type or employment type is required');
    }

    const skills = dto.requiredSkills || dto.skills || [];
    if (skills.length === 0) {
      errors.push('At least one required skill must be specified');
    }

    if (
      dto.minYearsExperience !== undefined &&
      dto.maxYearsExperience !== undefined &&
      Number(dto.minYearsExperience) > Number(dto.maxYearsExperience)
    ) {
      errors.push('Minimum experience cannot exceed maximum experience');
    }

    if (
      dto.salaryMin !== undefined &&
      dto.salaryMax !== undefined &&
      dto.salaryMin !== null &&
      dto.salaryMax !== null &&
      Number(dto.salaryMin) > Number(dto.salaryMax)
    ) {
      errors.push('Minimum salary cannot exceed maximum salary');
    }

    if (dto.applicationDeadline) {
      const deadline = new Date(dto.applicationDeadline);
      // Allow current day with 24h grace
      if (deadline.getTime() < Date.now() - 86400000) {
        errors.push('Application deadline cannot be in the past');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }

  /**
   * List/Search published opportunities with infrastructure filters and pagination
   */
  async getOpportunities(query: QueryOpportunitiesDto, currentUserId?: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      status: OpportunityStatus.PUBLISHED,
      visibility: OpportunityVisibility.PUBLIC,
    };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.jobType && query.jobType.trim()) {
      filter.$or = [
        { jobType: new RegExp(escapeRegex(query.jobType.trim()), 'i') },
        { employmentType: new RegExp(escapeRegex(query.jobType.trim()), 'i') },
      ];
    }
    if (query.workMode && query.workMode.trim()) {
      filter.workMode = new RegExp(escapeRegex(query.workMode.trim()), 'i');
    }
    if (query.discipline && query.discipline.trim()) {
      filter.discipline = new RegExp(escapeRegex(query.discipline.trim()), 'i');
    }
    if (query.sector && query.sector.trim()) {
      filter.infrastructureSector = new RegExp(
        escapeRegex(query.sector.trim()),
        'i',
      );
    }
    if (query.software && query.software.trim()) {
      const regex = new RegExp(escapeRegex(query.software.trim()), 'i');
      filter.$or = [{ requiredSoftware: regex }, { preferredSoftware: regex }];
    }
    if (query.experienceLevel) {
      filter.experienceLevel = query.experienceLevel;
    }
    if (query.minExp !== undefined && !isNaN(Number(query.minExp))) {
      filter.minYearsExperience = { $gte: Number(query.minExp) };
    }
    if (query.maxExp !== undefined && !isNaN(Number(query.maxExp))) {
      filter.maxYearsExperience = { $lte: Number(query.maxExp) };
    }
    if (query.skill && query.skill.trim()) {
      const regex = new RegExp(escapeRegex(query.skill.trim()), 'i');
      filter.$or = [
        { requiredSkills: regex },
        { preferredSkills: regex },
        { skills: regex },
      ];
    }
    if (query.location && query.location.trim()) {
      filter.location = new RegExp(escapeRegex(query.location.trim()), 'i');
    }
    if (query.organizationId && Types.ObjectId.isValid(query.organizationId)) {
      filter.organizationId = new Types.ObjectId(query.organizationId);
    }
    if (query.q && query.q.trim()) {
      const clean = escapeRegex(query.q.trim());
      const regex = new RegExp(clean, 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { responsibilities: regex },
        { requirements: regex },
        { requiredSkills: regex },
        { requiredSoftware: regex },
        { discipline: regex },
        { infrastructureSector: regex },
      ];
    }

    const [total, docs] = await Promise.all([
      this.oppModel.countDocuments(filter),
      this.oppModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          'organizationId',
          'name slug logo type industry infrastructureSpecializations location status verificationStatus',
        )
        .lean(),
    ]);

    // Check saved status for current user if logged in
    let savedJobIds = new Set<string>();
    if (currentUserId && this.savedJobModel?.find) {
      const savedDocs = await this.savedJobModel
        .find({
          userId: new Types.ObjectId(currentUserId),
          opportunityId: { $in: docs.map((d) => d._id) },
        })
        .lean();
      savedJobIds = new Set(savedDocs.map((s) => String(s.opportunityId)));
    }

    const data = docs.map((opp: any) => ({
      id: opp._id,
      title: opp.title,
      type: opp.type || OpportunityType.JOB,
      jobType: opp.jobType || opp.employmentType || 'Full-time',
      employmentType: opp.employmentType || opp.jobType || 'Full-time',
      discipline: opp.discipline || '',
      specialization: opp.specialization || '',
      infrastructureSector: opp.infrastructureSector || '',
      minYearsExperience: opp.minYearsExperience ?? 0,
      maxYearsExperience: opp.maxYearsExperience ?? 0,
      requiredSkills: opp.requiredSkills?.length
        ? opp.requiredSkills
        : opp.skills || [],
      preferredSkills: opp.preferredSkills || [],
      requiredSoftware: opp.requiredSoftware || [],
      preferredSoftware: opp.preferredSoftware || [],
      requiredEducation: opp.requiredEducation || '',
      preferredEducation: opp.preferredEducation || '',
      requiredCertifications: opp.requiredCertifications || [],
      preferredCertifications: opp.preferredCertifications || [],
      description: opp.description || '',
      responsibilities: opp.responsibilities || '',
      requirements: opp.requirements || '',
      benefits: opp.benefits || '',
      salaryMin: opp.salaryMin,
      salaryMax: opp.salaryMax,
      currency: opp.currency || 'INR',
      applicationDeadline: opp.applicationDeadline,
      skills: opp.skills || opp.requiredSkills || [],
      location: opp.location,
      workMode: opp.workMode,
      experienceLevel: opp.experienceLevel,
      status: opp.status,
      publishedAt: opp.publishedAt,
      expiresAt: opp.expiresAt,
      isSaved: savedJobIds.has(String(opp._id)),
      organization: opp.organizationId
        ? {
            id: opp.organizationId._id,
            name: opp.organizationId.name,
            slug: opp.organizationId.slug,
            logo: opp.organizationId.logo,
            type: opp.organizationId.type,
            industry: opp.organizationId.industry,
            infrastructureSpecializations:
              opp.organizationId.infrastructureSpecializations || [],
            location: opp.organizationId.location,
            status: opp.organizationId.status,
            isVerified:
              opp.organizationId.status === BusinessStatus.APPROVED ||
              opp.organizationId.verificationStatus ===
                OrganizationVerificationStatus.VERIFIED,
          }
        : null,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
    };
  }

  /**
   * Get single opportunity by ID with company and application status
   */
  async getOpportunityById(id: string, currentUserId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid opportunity ID');
    }

    const opp: any = await this.oppModel
      .findById(id)
      .populate(
        'organizationId',
        'name slug logo description website industry infrastructureSpecializations location status verificationStatus foundedYear companySize',
      )
      .lean();

    if (!opp) {
      throw new NotFoundException('Opportunity not found');
    }

    let isSaved = false;
    let hasApplied = false;
    let userApplication: any = null;

    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      const userObjId = new Types.ObjectId(currentUserId);
      if (this.savedJobModel?.findOne) {
        const saved = await this.savedJobModel.findOne({
          userId: userObjId,
          opportunityId: opp._id,
        });
        isSaved = !!saved;
      }
      if (this.jobAppModel?.findOne) {
        userApplication = await this.jobAppModel
          .findOne({
            candidateUserId: userObjId,
            jobId: opp._id,
          })
          .lean();
        if (
          userApplication &&
          userApplication.status !== JobApplicationStatus.WITHDRAWN
        ) {
          hasApplied = true;
        }
      }
    }

    // Find other jobs from this same business
    let otherJobs: any[] = [];
    if (opp.organizationId?._id) {
      otherJobs = await this.oppModel
        .find({
          organizationId: opp.organizationId._id,
          _id: { $ne: opp._id },
          status: OpportunityStatus.PUBLISHED,
        })
        .limit(4)
        .select(
          'title jobType location workMode minYearsExperience maxYearsExperience publishedAt',
        )
        .lean();
    }

    return {
      id: opp._id,
      title: opp.title,
      type: opp.type || OpportunityType.JOB,
      jobType: opp.jobType || opp.employmentType || 'Full-time',
      employmentType: opp.employmentType || opp.jobType || 'Full-time',
      discipline: opp.discipline || '',
      specialization: opp.specialization || '',
      infrastructureSector: opp.infrastructureSector || '',
      minYearsExperience: opp.minYearsExperience ?? 0,
      maxYearsExperience: opp.maxYearsExperience ?? 0,
      requiredSkills: opp.requiredSkills?.length
        ? opp.requiredSkills
        : opp.skills || [],
      preferredSkills: opp.preferredSkills || [],
      requiredSoftware: opp.requiredSoftware || [],
      preferredSoftware: opp.preferredSoftware || [],
      requiredEducation: opp.requiredEducation || '',
      preferredEducation: opp.preferredEducation || '',
      requiredCertifications: opp.requiredCertifications || [],
      preferredCertifications: opp.preferredCertifications || [],
      description: opp.description || '',
      responsibilities: opp.responsibilities || '',
      requirements: opp.requirements || '',
      benefits: opp.benefits || '',
      salaryMin: opp.salaryMin,
      salaryMax: opp.salaryMax,
      currency: opp.currency || 'INR',
      applicationDeadline: opp.applicationDeadline,
      skills: opp.skills || opp.requiredSkills || [],
      location: opp.location,
      workMode: opp.workMode,
      experienceLevel: opp.experienceLevel,
      status: opp.status,
      publishedAt: opp.publishedAt,
      expiresAt: opp.expiresAt,
      isSaved,
      hasApplied,
      application: userApplication,
      organization: opp.organizationId
        ? {
            ...opp.organizationId,
            isVerified:
              opp.organizationId.status === BusinessStatus.APPROVED ||
              opp.organizationId.verificationStatus ===
                OrganizationVerificationStatus.VERIFIED,
          }
        : null,
      otherJobs,
    };
  }

  /**
   * Create an opportunity (Authorized: OWNER, ADMIN, or RECRUITER of target org)
   */
  async createOpportunity(userId: string, dto: CreateOpportunityDto) {
    if (!Types.ObjectId.isValid(dto.organizationId)) {
      throw new BadRequestException('Invalid organization ID');
    }

    await this.assertOrgRole(userId, dto.organizationId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    const org = this.orgModel?.findById
      ? await this.orgModel.findById(dto.organizationId)
      : ({ status: BusinessStatus.APPROVED, name: 'Business' } as any);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const requestedStatus = dto.status || OpportunityStatus.PUBLISHED;

    // Check business verification: only APPROVED businesses can publish!
    if (requestedStatus === OpportunityStatus.PUBLISHED) {
      if (
        org.status !== BusinessStatus.APPROVED &&
        org.verificationStatus !== OrganizationVerificationStatus.VERIFIED
      ) {
        throw new ForbiddenException(
          'Only approved businesses can publish jobs. Your business is currently pending review or not approved.',
        );
      }

      // Deterministic validation
      this.validateJobForPublishing(dto);
    } else {
      // DRAFT requires at least title
      if (!dto.title || !dto.title.trim()) {
        throw new BadRequestException('Job title is required to save a draft');
      }
    }

    const requiredSkills =
      dto.requiredSkills || dto.skills || (dto.skills ? [...dto.skills] : []);

    const opp = await this.oppModel.create({
      organizationId: new Types.ObjectId(dto.organizationId),
      createdBy: new Types.ObjectId(userId),
      title: dto.title.trim(),
      description: dto.description?.trim() || '',
      type: dto.type || OpportunityType.JOB,
      jobType: dto.jobType || dto.employmentType || 'Full-time',
      employmentType: dto.employmentType || dto.jobType || 'Full-time',
      discipline: dto.discipline?.trim() || '',
      specialization: dto.specialization?.trim() || '',
      infrastructureSector: dto.infrastructureSector?.trim() || '',
      minYearsExperience: dto.minYearsExperience
        ? Number(dto.minYearsExperience)
        : 0,
      maxYearsExperience: dto.maxYearsExperience
        ? Number(dto.maxYearsExperience)
        : 0,
      requiredSkills,
      preferredSkills: dto.preferredSkills || [],
      requiredSoftware: dto.requiredSoftware || [],
      preferredSoftware: dto.preferredSoftware || [],
      requiredEducation: dto.requiredEducation?.trim() || '',
      preferredEducation: dto.preferredEducation?.trim() || '',
      requiredCertifications: dto.requiredCertifications || [],
      preferredCertifications: dto.preferredCertifications || [],
      skills: requiredSkills,
      location: dto.location?.trim() || '',
      workMode: dto.workMode || 'On-site',
      experienceLevel: dto.experienceLevel || ExperienceLevel.ENTRY,
      salaryMin:
        dto.salaryMin !== undefined && dto.salaryMin !== null
          ? Number(dto.salaryMin)
          : null,
      salaryMax:
        dto.salaryMax !== undefined && dto.salaryMax !== null
          ? Number(dto.salaryMax)
          : null,
      currency: dto.currency?.trim() || 'INR',
      responsibilities: dto.responsibilities?.trim() || '',
      requirements: dto.requirements?.trim() || '',
      benefits: dto.benefits?.trim() || '',
      applicationDeadline: dto.applicationDeadline
        ? new Date(dto.applicationDeadline)
        : null,
      visibility: dto.visibility || OpportunityVisibility.PUBLIC,
      status: requestedStatus,
      publishedAt: new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'JOB_CREATED',
        entityType: 'Opportunity',
        entityId: String(opp._id),
        message: `Job '${opp.title}' created with status '${opp.status}' for business '${org.name}'`,
        metadata: {
          jobId: String(opp._id),
          businessId: String(org._id),
          status: opp.status,
        },
      });
    }

    if (
      this.matchingService &&
      requestedStatus === OpportunityStatus.PUBLISHED
    ) {
      this.matchingService
        .triggerJobMatching(String(opp._id), userId)
        .catch((err) => {
          this.logger.warn(
            `Async talent matching failed for job ${opp._id}: ${err.message}`,
          );
        });
    }

    return opp;
  }

  /**
   * Update opportunity (Authorized: OWNER, ADMIN, or RECRUITER of owning org)
   */
  async updateOpportunity(
    userId: string,
    id: string,
    dto: UpdateOpportunityDto,
  ) {
    const opp = await this.oppModel.findById(id);
    if (!opp) {
      throw new NotFoundException('Opportunity not found');
    }

    await this.assertOrgRole(userId, String(opp.organizationId), [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    if (dto.title !== undefined) opp.title = dto.title.trim();
    if (dto.description !== undefined) opp.description = dto.description.trim();
    if (dto.type !== undefined) opp.type = dto.type;
    if (dto.jobType !== undefined) opp.jobType = dto.jobType;
    if (dto.employmentType !== undefined)
      opp.employmentType = dto.employmentType;
    if (dto.discipline !== undefined) opp.discipline = dto.discipline.trim();
    if (dto.specialization !== undefined)
      opp.specialization = dto.specialization.trim();
    if (dto.infrastructureSector !== undefined)
      opp.infrastructureSector = dto.infrastructureSector.trim();
    if (dto.minYearsExperience !== undefined)
      opp.minYearsExperience = Number(dto.minYearsExperience);
    if (dto.maxYearsExperience !== undefined)
      opp.maxYearsExperience = Number(dto.maxYearsExperience);
    if (dto.requiredSkills !== undefined) {
      opp.requiredSkills = dto.requiredSkills;
      opp.skills = dto.requiredSkills;
    }
    if (dto.skills !== undefined && dto.requiredSkills === undefined) {
      opp.skills = dto.skills;
      opp.requiredSkills = dto.skills;
    }
    if (dto.preferredSkills !== undefined)
      opp.preferredSkills = dto.preferredSkills;
    if (dto.requiredSoftware !== undefined)
      opp.requiredSoftware = dto.requiredSoftware;
    if (dto.preferredSoftware !== undefined)
      opp.preferredSoftware = dto.preferredSoftware;
    if (dto.requiredEducation !== undefined)
      opp.requiredEducation = dto.requiredEducation.trim();
    if (dto.preferredEducation !== undefined)
      opp.preferredEducation = dto.preferredEducation.trim();
    if (dto.requiredCertifications !== undefined)
      opp.requiredCertifications = dto.requiredCertifications;
    if (dto.preferredCertifications !== undefined)
      opp.preferredCertifications = dto.preferredCertifications;
    if (dto.location !== undefined) opp.location = dto.location.trim();
    if (dto.workMode !== undefined) opp.workMode = dto.workMode;
    if (dto.experienceLevel !== undefined)
      opp.experienceLevel = dto.experienceLevel;
    if (dto.salaryMin !== undefined)
      opp.salaryMin = dto.salaryMin !== null ? Number(dto.salaryMin) : null;
    if (dto.salaryMax !== undefined)
      opp.salaryMax = dto.salaryMax !== null ? Number(dto.salaryMax) : null;
    if (dto.currency !== undefined) opp.currency = dto.currency.trim();
    if (dto.responsibilities !== undefined)
      opp.responsibilities = dto.responsibilities.trim();
    if (dto.requirements !== undefined)
      opp.requirements = dto.requirements.trim();
    if (dto.benefits !== undefined) opp.benefits = dto.benefits.trim();
    if (dto.applicationDeadline !== undefined)
      opp.applicationDeadline = dto.applicationDeadline
        ? new Date(dto.applicationDeadline)
        : null;
    if (dto.visibility !== undefined) opp.visibility = dto.visibility;
    if (dto.expiresAt !== undefined)
      opp.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    // If publishing, validate requirements and business approval
    if (dto.status === OpportunityStatus.PUBLISHED) {
      const org = this.orgModel?.findById
        ? await this.orgModel.findById(opp.organizationId)
        : ({ status: BusinessStatus.APPROVED } as any);
      if (
        !org ||
        (org.status !== BusinessStatus.APPROVED &&
          org.verificationStatus !== OrganizationVerificationStatus.VERIFIED)
      ) {
        throw new ForbiddenException(
          'Only approved businesses can publish jobs.',
        );
      }
      this.validateJobForPublishing({
        title: opp.title,
        description: opp.description,
        responsibilities: opp.responsibilities,
        requirements: opp.requirements,
        discipline: opp.discipline,
        infrastructureSector: opp.infrastructureSector,
        location: opp.location,
        workMode: opp.workMode,
        jobType: opp.jobType,
        requiredSkills: opp.requiredSkills,
        minYearsExperience: opp.minYearsExperience,
        maxYearsExperience: opp.maxYearsExperience,
        salaryMin: opp.salaryMin,
        salaryMax: opp.salaryMax,
        applicationDeadline: opp.applicationDeadline,
      });
      opp.status = OpportunityStatus.PUBLISHED;
      opp.publishedAt = new Date();
    } else if (dto.status !== undefined) {
      opp.status = dto.status;
    }

    await opp.save();

    if (this.matchingService) {
      if (dto.status === OpportunityStatus.PUBLISHED) {
        this.matchingService
          .triggerJobMatching(String(opp._id), userId)
          .catch((err) => {
            this.logger.warn(
              `Async talent matching failed for job ${opp._id}: ${err.message}`,
            );
          });
      } else {
        this.matchingService
          .invalidateJobMatches(String(opp._id))
          .catch((err) => {
            this.logger.warn(
              `Failed invalidating matches for job ${opp._id}: ${err.message}`,
            );
          });
      }
    }

    return opp;
  }

  /**
   * Update status (PUBLISHED, DRAFT, CLOSED) with verification and validation
   */
  async updateStatus(userId: string, id: string, status: OpportunityStatus) {
    const opp = await this.oppModel.findById(id);
    if (!opp) {
      throw new NotFoundException('Opportunity not found');
    }

    await this.assertOrgRole(userId, String(opp.organizationId), [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    if (status === OpportunityStatus.PUBLISHED) {
      const org = this.orgModel?.findById
        ? await this.orgModel.findById(opp.organizationId)
        : ({ status: BusinessStatus.APPROVED } as any);
      if (
        !org ||
        (org.status !== BusinessStatus.APPROVED &&
          org.verificationStatus !== OrganizationVerificationStatus.VERIFIED)
      ) {
        throw new ForbiddenException(
          'Only approved businesses can publish jobs.',
        );
      }
      this.validateJobForPublishing({
        title: opp.title,
        description: opp.description,
        responsibilities: opp.responsibilities,
        requirements: opp.requirements,
        discipline: opp.discipline,
        infrastructureSector: opp.infrastructureSector,
        location: opp.location,
        workMode: opp.workMode,
        jobType: opp.jobType,
        requiredSkills: opp.requiredSkills,
        minYearsExperience: opp.minYearsExperience,
        maxYearsExperience: opp.maxYearsExperience,
        salaryMin: opp.salaryMin,
        salaryMax: opp.salaryMax,
        applicationDeadline: opp.applicationDeadline,
      });
      opp.publishedAt = new Date();
    }

    opp.status = status;
    await opp.save();

    if (this.matchingService) {
      if (status === OpportunityStatus.PUBLISHED) {
        this.matchingService
          .triggerJobMatching(String(opp._id), userId)
          .catch((err) => {
            this.logger.warn(
              `Async talent matching failed for job ${opp._id}: ${err.message}`,
            );
          });
      } else if (status === OpportunityStatus.CLOSED) {
        this.matchingService
          .invalidateJobMatches(String(opp._id))
          .catch((err) => {
            this.logger.warn(
              `Failed invalidating matches for closed job ${opp._id}: ${err.message}`,
            );
          });
      }
    }

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action:
          status === OpportunityStatus.PUBLISHED
            ? 'JOB_PUBLISHED'
            : status === OpportunityStatus.CLOSED
              ? 'JOB_CLOSED'
              : 'JOB_STATUS_UPDATED',
        entityType: 'Opportunity',
        entityId: String(opp._id),
        message: `Job '${opp.title}' status updated to '${status}'`,
        metadata: { jobId: String(opp._id), status },
      });
    }

    return opp;
  }

  /**
   * List jobs for a specific business (For Manage Business dashboard)
   */
  async getBusinessJobs(
    userId: string,
    organizationId: string,
    status?: string,
  ) {
    await this.assertOrgRole(userId, organizationId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    const filter: Record<string, any> = {
      organizationId: new Types.ObjectId(organizationId),
    };

    if (status && status.toUpperCase() !== 'ALL') {
      filter.status = status.toUpperCase();
    }

    const jobs = await this.oppModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Attach application counts
    const jobIds = jobs.map((j) => j._id);
    const appCounts = new Map<string, number>();

    if (this.jobAppModel?.aggregate) {
      const counts = await this.jobAppModel.aggregate([
        {
          $match: {
            jobId: { $in: jobIds },
            status: { $ne: JobApplicationStatus.WITHDRAWN },
          },
        },
        { $group: { _id: '$jobId', count: { $sum: 1 } } },
      ]);
      for (const c of counts) {
        appCounts.set(String(c._id), c.count);
      }
    }

    return jobs.map((job) => ({
      ...job,
      id: job._id,
      applicantCount: appCounts.get(String(job._id)) || 0,
    }));
  }

  /**
   * Save a job for current user (Bookmark)
   */
  async saveJob(userId: string, opportunityId: string) {
    if (!this.savedJobModel) {
      return { success: true };
    }

    const opp = await this.oppModel.findById(opportunityId);
    if (!opp) {
      throw new NotFoundException('Job not found');
    }

    const userObjId = new Types.ObjectId(userId);
    const oppObjId = new Types.ObjectId(opportunityId);

    const existing = await this.savedJobModel.findOne({
      userId: userObjId,
      opportunityId: oppObjId,
    });

    if (existing) {
      return { success: true, saved: true, message: 'Job already saved' };
    }

    await this.savedJobModel.create({
      userId: userObjId,
      opportunityId: oppObjId,
      createdAt: new Date(),
    });

    return { success: true, saved: true, message: 'Job saved successfully' };
  }

  /**
   * Unsave a job
   */
  async unsaveJob(userId: string, opportunityId: string) {
    if (!this.savedJobModel) {
      return { success: true };
    }

    await this.savedJobModel.deleteOne({
      userId: new Types.ObjectId(userId),
      opportunityId: new Types.ObjectId(opportunityId),
    });

    return { success: true, saved: false, message: 'Job removed from saved' };
  }

  /**
   * Get all saved jobs for current user
   */
  async getSavedJobs(userId: string) {
    if (!this.savedJobModel) {
      return [];
    }

    const savedDocs = await this.savedJobModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate({
        path: 'opportunityId',
        populate: {
          path: 'organizationId',
          select:
            'name slug logo industry infrastructureSpecializations location status verificationStatus',
        },
      })
      .lean();

    return savedDocs
      .filter((s: any) => s.opportunityId)
      .map((s: any) => {
        const opp = s.opportunityId;
        return {
          id: opp._id,
          savedAt: s.createdAt,
          isSaved: true,
          title: opp.title,
          jobType: opp.jobType || opp.employmentType || 'Full-time',
          discipline: opp.discipline,
          infrastructureSector: opp.infrastructureSector,
          location: opp.location,
          workMode: opp.workMode,
          salaryMin: opp.salaryMin,
          salaryMax: opp.salaryMax,
          currency: opp.currency || 'INR',
          minYearsExperience: opp.minYearsExperience,
          maxYearsExperience: opp.maxYearsExperience,
          status: opp.status,
          publishedAt: opp.publishedAt,
          organization: opp.organizationId
            ? {
                ...opp.organizationId,
                isVerified:
                  opp.organizationId.status === BusinessStatus.APPROVED ||
                  opp.organizationId.verificationStatus ===
                    OrganizationVerificationStatus.VERIFIED,
              }
            : null,
        };
      });
  }

  /**
   * Apply to a published job
   */
  async applyToJob(
    userId: string,
    opportunityId: string,
    dto: { resumeUrl?: string; coverNote?: string },
  ) {
    if (!this.jobAppModel) {
      return { success: true };
    }

    const opp = await this.oppModel.findById(opportunityId);
    if (!opp) {
      throw new NotFoundException('Job not found');
    }

    if (opp.status !== OpportunityStatus.PUBLISHED) {
      throw new BadRequestException(
        'Applications can only be submitted to published active jobs',
      );
    }

    const userObjId = new Types.ObjectId(userId);
    const oppObjId = new Types.ObjectId(opportunityId);

    const existing = await this.jobAppModel.findOne({
      jobId: oppObjId,
      candidateUserId: userObjId,
    });

    if (existing) {
      if (existing.status !== JobApplicationStatus.WITHDRAWN) {
        throw new ConflictException('You have already applied for this job');
      }
      // Re-apply if previously withdrawn
      existing.status = JobApplicationStatus.SUBMITTED;
      existing.coverNote = dto.coverNote?.trim() || '';
      existing.resumeUrl = dto.resumeUrl?.trim() || '';
      existing.appliedAt = new Date();
      existing.withdrawnAt = null;
      await existing.save();
      return existing;
    }

    const application = await this.jobAppModel.create({
      jobId: oppObjId,
      businessId: opp.organizationId,
      candidateUserId: userObjId,
      status: JobApplicationStatus.SUBMITTED,
      resumeUrl: dto.resumeUrl?.trim() || '',
      coverNote: dto.coverNote?.trim() || '',
      appliedAt: new Date(),
    });

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: userObjId,
        action: 'JOB_APPLICATION_SUBMITTED',
        entityType: 'JobApplication',
        entityId: String(application._id),
        message: `Candidate applied to job '${opp.title}'`,
        metadata: {
          jobId: String(opp._id),
          businessId: String(opp.organizationId),
          applicationId: String(application._id),
        },
      });
    }

    return application;
  }

  /**
   * Candidate withdraws an application
   */
  async withdrawApplication(userId: string, applicationId: string) {
    if (!this.jobAppModel) {
      return { success: true };
    }

    const application = await this.jobAppModel.findOne({
      _id: new Types.ObjectId(applicationId),
      candidateUserId: new Types.ObjectId(userId),
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    application.status = JobApplicationStatus.WITHDRAWN;
    application.withdrawnAt = new Date();
    await application.save();

    return application;
  }

  /**
   * Candidate view of their own submitted applications
   */
  async getMyApplications(userId: string) {
    if (!this.jobAppModel) {
      return [];
    }

    const apps = await this.jobAppModel
      .find({ candidateUserId: new Types.ObjectId(userId) })
      .sort({ appliedAt: -1 })
      .populate({
        path: 'jobId',
        select:
          'title location workMode jobType discipline infrastructureSector status',
      })
      .populate({
        path: 'businessId',
        select: 'name slug logo industry location verificationStatus status',
      })
      .lean();

    return apps.map((app: any) => ({
      id: app._id,
      status: app.status,
      appliedAt: app.appliedAt,
      withdrawnAt: app.withdrawnAt,
      coverNote: app.coverNote,
      resumeUrl: app.resumeUrl,
      job: app.jobId
        ? {
            id: app.jobId._id,
            title: app.jobId.title,
            location: app.jobId.location,
            workMode: app.jobId.workMode,
            jobType: app.jobId.jobType,
            discipline: app.jobId.discipline,
            status: app.jobId.status,
          }
        : null,
      business: app.businessId
        ? {
            id: app.businessId._id,
            name: app.businessId.name,
            slug: app.businessId.slug,
            logo: app.businessId.logo,
            isVerified:
              app.businessId.status === BusinessStatus.APPROVED ||
              app.businessId.verificationStatus ===
                OrganizationVerificationStatus.VERIFIED,
          }
        : null,
    }));
  }

  /**
   * Business owner/recruiter view of applicants for a job
   */
  async getJobApplications(userId: string, opportunityId: string) {
    if (!this.jobAppModel) {
      return [];
    }

    const opp = await this.oppModel.findById(opportunityId);
    if (!opp) {
      throw new NotFoundException('Job not found');
    }

    await this.assertOrgRole(userId, String(opp.organizationId), [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.RECRUITER,
    ]);

    const apps = await this.jobAppModel
      .find({ jobId: opp._id })
      .sort({ appliedAt: -1 })
      .populate(
        'candidateUserId',
        'name email username avatar headline primaryRole currentRole',
      )
      .lean();

    return apps.map((a: any) => ({
      id: a._id,
      status: a.status,
      appliedAt: a.appliedAt,
      coverNote: a.coverNote,
      resumeUrl: a.resumeUrl,
      candidate: a.candidateUserId
        ? {
            id: a.candidateUserId._id,
            name: a.candidateUserId.name,
            username: a.candidateUserId.username,
            avatar: a.candidateUserId.avatar,
            headline: a.candidateUserId.headline,
            primaryRole: a.candidateUserId.primaryRole,
            email: a.candidateUserId.email,
          }
        : null,
    }));
  }

  private async assertOrgRole(
    userId: string,
    orgId: string,
    allowedRoles: OrganizationRole[],
  ) {
    const userObjId = new Types.ObjectId(userId);
    const orgObjId = new Types.ObjectId(orgId);

    const membership = await this.membershipModel.findOne({
      organizationId: orgObjId,
      userId: userObjId,
      status: MembershipStatus.ACTIVE,
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'You must be an Owner, Admin, or Recruiter of this organization to manage opportunities',
      );
    }
  }
}
