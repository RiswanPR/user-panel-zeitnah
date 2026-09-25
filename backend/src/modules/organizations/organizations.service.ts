import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { escapeRegex } from '../../common/utils/regex.util';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
  OrganizationType,
  OrganizationVerificationStatus,
  OrganizationVisibility,
  BusinessStatus,
} from './schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
  OrganizationRole,
  MembershipStatus,
} from './schemas/organization-membership.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Opportunity, OpportunityDocument, OpportunityStatus } from '../opportunities/schemas/opportunity.schema';

export interface CreateOrganizationDto {
  name: string;
  type?: OrganizationType;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  infrastructureSpecializations?: string[];
  businessEmail?: string;
  businessPhone?: string;
  country?: string;
  state?: string;
  city?: string;
  officeLocation?: string;
  location?: string;
  companySize?: string;
  foundedYear?: number;
  linkedin?: string;
  socialLinks?: Record<string, string>;
  status?: BusinessStatus;
}

export interface UpdateOrganizationDto extends Partial<CreateOrganizationDto> {
  visibility?: OrganizationVisibility;
}

export interface QueryOrganizationsDto {
  q?: string;
  type?: OrganizationType;
  industry?: string;
  specialization?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export interface AdminBusinessQueryDto {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name)
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional()
    @InjectModel(Opportunity.name)
    private readonly oppModel?: Model<OpportunityDocument>,
    @Optional()
    private readonly auditLogsService?: AuditLogsService,
  ) {}

  /**
   * Create an organization / business.
   * STRICT AUTHORIZATION: Only 'RECRUITER' and 'FOUNDER' profile roles (or admin) can create businesses.
   */
  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const userObjId = new Types.ObjectId(userId);

    // Verify profile role permissions
    if (this.userModel?.findById) {
      const user = await this.userModel.findById(userId);
      if (user) {
        const primaryRole = (user.primaryRole || '').toUpperCase();
        const isRecruiterOrFounder =
          primaryRole === 'RECRUITER' || primaryRole === 'FOUNDER';
        const isAdmin = user.role === 'admin';

        if (!isRecruiterOrFounder && !isAdmin) {
          throw new ForbiddenException(
            'Only Recruiters and Founders are permitted to create a business profile',
          );
        }
      }
    }

    const cleanName = dto.name.trim();
    if (!cleanName) {
      throw new BadRequestException('Business name is required');
    }

    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await this.orgModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(
        `Business slug '${slug}' is already registered`,
      );
    }

    const requestedStatus =
      dto.status === BusinessStatus.DRAFT
        ? BusinessStatus.DRAFT
        : BusinessStatus.PENDING;

    const initialVerification =
      requestedStatus === BusinessStatus.DRAFT
        ? OrganizationVerificationStatus.UNVERIFIED
        : OrganizationVerificationStatus.PENDING;

    const org = await this.orgModel.create({
      name: cleanName,
      slug,
      type: dto.type || OrganizationType.COMPANY,
      description: dto.description?.trim() || '',
      logo: dto.logo || '',
      website: dto.website?.trim() || '',
      industry: dto.industry?.trim() || 'Construction & Infrastructure',
      infrastructureSpecializations: dto.infrastructureSpecializations || [],
      businessEmail: dto.businessEmail?.trim() || '',
      businessPhone: dto.businessPhone?.trim() || '',
      country: dto.country?.trim() || '',
      state: dto.state?.trim() || '',
      city: dto.city?.trim() || '',
      officeLocation: dto.officeLocation?.trim() || '',
      location:
        dto.location?.trim() ||
        [dto.city, dto.state, dto.country].filter(Boolean).join(', ') ||
        '',
      companySize: dto.companySize?.trim() || '',
      foundedYear: dto.foundedYear ? Number(dto.foundedYear) : null,
      linkedin: dto.linkedin?.trim() || '',
      socialLinks: dto.socialLinks || {},
      status: requestedStatus,
      verificationStatus: initialVerification,
      visibility: OrganizationVisibility.PUBLIC,
      createdBy: userObjId,
    });

    // Creator is OWNER
    await this.membershipModel.create({
      organizationId: org._id,
      userId: userObjId,
      role: OrganizationRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });

    // Audit Log
    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: userObjId,
        action: 'BUSINESS_CREATED',
        entityType: 'Organization',
        entityId: String(org._id),
        message: `Business '${org.name}' created with status '${requestedStatus}'`,
        metadata: {
          name: org.name,
          slug: org.slug,
          status: requestedStatus,
        },
      });
    }

    return org;
  }

  /**
   * List/Search verified/approved organizations for public discovery
   */
  async getOrganizations(query: QueryOrganizationsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      visibility: OrganizationVisibility.PUBLIC,
      // Public only sees APPROVED businesses (or legacy unmigrated ones not revoked)
      status: { $in: [BusinessStatus.APPROVED, null, undefined] },
      verificationStatus: { $ne: OrganizationVerificationStatus.REVOKED },
    };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.industry && query.industry.trim()) {
      filter.industry = new RegExp(escapeRegex(query.industry.trim()), 'i');
    }
    if (query.specialization && query.specialization.trim()) {
      filter.infrastructureSpecializations = new RegExp(
        escapeRegex(query.specialization.trim()),
        'i',
      );
    }
    if (query.location && query.location.trim()) {
      filter.location = new RegExp(escapeRegex(query.location.trim()), 'i');
    }
    if (query.q && query.q.trim()) {
      const clean = escapeRegex(query.q.trim());
      const regex = new RegExp(clean, 'i');
      filter.$or = [
        { name: regex },
        { description: regex },
        { industry: regex },
        { infrastructureSpecializations: regex },
        { location: regex },
      ];
    }

    const [total, docs] = await Promise.all([
      this.orgModel.countDocuments(filter),
      this.orgModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Enhance with member counts and active job counts
    const orgIds = docs.map((d) => d._id);

    let memberCounts: any[] = [];
    if (this.membershipModel?.aggregate) {
      memberCounts = await this.membershipModel.aggregate([
        {
          $match: {
            organizationId: { $in: orgIds },
            status: MembershipStatus.ACTIVE,
          },
        },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ]);
    }

    const countMap = new Map<string, number>();
    for (const mc of memberCounts) {
      countMap.set(String(mc._id), mc.count);
    }

    const jobCountMap = new Map<string, number>();
    if (this.oppModel?.aggregate) {
      const jobCounts = await this.oppModel.aggregate([
        {
          $match: {
            organizationId: { $in: orgIds },
            status: OpportunityStatus.PUBLISHED,
          },
        },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ]);
      for (const jc of jobCounts) {
        jobCountMap.set(String(jc._id), jc.count);
      }
    }

    const data = docs.map((org) => ({
      ...org,
      isVerified:
        org.status === BusinessStatus.APPROVED ||
        org.verificationStatus === OrganizationVerificationStatus.VERIFIED,
      memberCount: countMap.get(String(org._id)) || 1,
      activeJobCount: jobCountMap.get(String(org._id)) || 0,
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
   * Get single organization details by slug
   */
  async getOrganizationBySlug(slug: string, viewerUserId?: string) {
    const cleanSlug = slug.toLowerCase().trim();
    const org = await this.orgModel.findOne({ slug: cleanSlug }).lean();

    if (!org) {
      throw new NotFoundException(`Organization '${slug}' not found`);
    }

    // Check visibility if not approved
    const isApproved =
      org.status === BusinessStatus.APPROVED ||
      org.verificationStatus === OrganizationVerificationStatus.VERIFIED ||
      org.status === undefined;

    let isAuthorizedViewer = false;
    if (viewerUserId) {
      if (String(org.createdBy) === viewerUserId) {
        isAuthorizedViewer = true;
      } else {
        const mem = await this.membershipModel.findOne({
          organizationId: org._id,
          userId: new Types.ObjectId(viewerUserId),
          status: MembershipStatus.ACTIVE,
        });
        if (mem) isAuthorizedViewer = true;
      }
    }

    const memberCount = await this.membershipModel.countDocuments({
      organizationId: org._id,
      status: MembershipStatus.ACTIVE,
    });

    let activeJobCount = 0;
    if (this.oppModel?.countDocuments) {
      activeJobCount = await this.oppModel.countDocuments({
        organizationId: org._id,
        status: OpportunityStatus.PUBLISHED,
      });
    }

    return {
      ...org,
      isVerified:
        org.status === BusinessStatus.APPROVED ||
        org.verificationStatus === OrganizationVerificationStatus.VERIFIED,
      isAuthorizedViewer,
      memberCount,
      activeJobCount,
    };
  }

  /**
   * Get single organization details by ID
   */
  async getOrganizationById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID');
    }
    const org = await this.orgModel.findById(id).lean();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const memberCount = await this.membershipModel.countDocuments({
      organizationId: org._id,
      status: MembershipStatus.ACTIVE,
    });

    let activeJobCount = 0;
    if (this.oppModel?.countDocuments) {
      activeJobCount = await this.oppModel.countDocuments({
        organizationId: org._id,
        status: OpportunityStatus.PUBLISHED,
      });
    }

    return {
      ...org,
      isVerified:
        org.status === BusinessStatus.APPROVED ||
        org.verificationStatus === OrganizationVerificationStatus.VERIFIED,
      memberCount,
      activeJobCount,
    };
  }

  /**
   * Get all businesses owned/managed by the current user (Recruiter / Founder)
   */
  async getMyOrganizations(userId: string) {
    const userObjId = new Types.ObjectId(userId);

    const memberships = await this.membershipModel
      .find({
        userId: userObjId,
        status: MembershipStatus.ACTIVE,
        role: {
          $in: [
            OrganizationRole.OWNER,
            OrganizationRole.ADMIN,
            OrganizationRole.RECRUITER,
          ],
        },
      })
      .lean();

    const orgIds = memberships.map((m) => m.organizationId);

    const orgs = await this.orgModel
      .find({
        $or: [{ _id: { $in: orgIds } }, { createdBy: userObjId }],
      })
      .sort({ createdAt: -1 })
      .lean();

    // Attach membership role and job metrics to each
    const roleMap = new Map<string, string>();
    for (const m of memberships) {
      roleMap.set(String(m.organizationId), m.role);
    }

    const result = await Promise.all(
      orgs.map(async (org) => {
        let activeJobs = 0;
        let draftJobs = 0;
        let closedJobs = 0;

        if (this.oppModel?.countDocuments) {
          [activeJobs, draftJobs, closedJobs] = await Promise.all([
            this.oppModel.countDocuments({
              organizationId: org._id,
              status: OpportunityStatus.PUBLISHED,
            }),
            this.oppModel.countDocuments({
              organizationId: org._id,
              status: OpportunityStatus.DRAFT,
            }),
            this.oppModel.countDocuments({
              organizationId: org._id,
              status: OpportunityStatus.CLOSED,
            }),
          ]);
        }

        return {
          ...org,
          userRole:
            roleMap.get(String(org._id)) ||
            (String(org.createdBy) === userId ? OrganizationRole.OWNER : 'MEMBER'),
          isVerified: org.status === BusinessStatus.APPROVED,
          activeJobCount: activeJobs,
          draftJobCount: draftJobs,
          closedJobCount: closedJobs,
          totalJobCount: activeJobs + draftJobs + closedJobs,
        };
      }),
    );

    return result;
  }

  /**
   * Update organization details (Authorized: OWNER or ADMIN)
   */
  async updateOrganization(
    userId: string,
    orgId: string,
    dto: UpdateOrganizationDto,
  ) {
    await this.assertMemberRole(userId, orgId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const org = await this.orgModel.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (dto.name !== undefined) org.name = dto.name.trim();
    if (dto.type !== undefined) org.type = dto.type;
    if (dto.description !== undefined) org.description = dto.description.trim();
    if (dto.logo !== undefined) org.logo = dto.logo;
    if (dto.website !== undefined) org.website = dto.website.trim();
    if (dto.industry !== undefined) org.industry = dto.industry.trim();
    if (dto.infrastructureSpecializations !== undefined)
      org.infrastructureSpecializations = dto.infrastructureSpecializations;
    if (dto.businessEmail !== undefined)
      org.businessEmail = dto.businessEmail.trim();
    if (dto.businessPhone !== undefined)
      org.businessPhone = dto.businessPhone.trim();
    if (dto.country !== undefined) org.country = dto.country.trim();
    if (dto.state !== undefined) org.state = dto.state.trim();
    if (dto.city !== undefined) org.city = dto.city.trim();
    if (dto.officeLocation !== undefined)
      org.officeLocation = dto.officeLocation.trim();
    if (dto.location !== undefined) org.location = dto.location.trim();
    if (dto.companySize !== undefined) org.companySize = dto.companySize.trim();
    if (dto.foundedYear !== undefined)
      org.foundedYear = dto.foundedYear ? Number(dto.foundedYear) : null;
    if (dto.linkedin !== undefined) org.linkedin = dto.linkedin.trim();
    if (dto.socialLinks !== undefined) org.socialLinks = dto.socialLinks;
    if (dto.visibility !== undefined) org.visibility = dto.visibility;

    await org.save();

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'BUSINESS_UPDATED',
        entityType: 'Organization',
        entityId: String(org._id),
        message: `Business '${org.name}' updated by user ${userId}`,
        metadata: { orgId: String(org._id), name: org.name },
      });
    }

    return org;
  }

  /**
   * Resubmit a rejected or draft organization for Admin review
   */
  async resubmitOrganization(userId: string, orgId: string) {
    await this.assertMemberRole(userId, orgId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const org = await this.orgModel.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (
      org.status !== BusinessStatus.REJECTED &&
      org.status !== BusinessStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Business in '${org.status}' status cannot be resubmitted`,
      );
    }

    org.status = BusinessStatus.PENDING;
    org.verificationStatus = OrganizationVerificationStatus.PENDING;
    org.rejectionReason = '';
    org.reviewedBy = null;
    org.reviewedAt = null;

    await org.save();

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'BUSINESS_RESUBMITTED',
        entityType: 'Organization',
        entityId: String(org._id),
        message: `Business '${org.name}' resubmitted for admin review`,
        metadata: { orgId: String(org._id), name: org.name },
      });
    }

    return org;
  }

  /**
   * ADMIN: List all businesses with status filter (Pending, Approved, Rejected, Suspended, All)
   */
  async getOrganizationsForAdmin(query: AdminBusinessQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status && query.status.toUpperCase() !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }

    if (query.q && query.q.trim()) {
      const clean = escapeRegex(query.q.trim());
      const regex = new RegExp(clean, 'i');
      filter.$or = [
        { name: regex },
        { slug: regex },
        { businessEmail: regex },
        { industry: regex },
      ];
    }

    const [total, docs] = await Promise.all([
      this.orgModel.countDocuments(filter),
      this.orgModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email username avatar primaryRole')
        .populate('reviewedBy', 'name email')
        .lean(),
    ]);

    return {
      data: docs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
    };
  }

  /**
   * ADMIN: Approve a business
   */
  async approveOrganization(adminUserId: string, orgId: string) {
    const org = await this.orgModel.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    org.status = BusinessStatus.APPROVED;
    org.verificationStatus = OrganizationVerificationStatus.VERIFIED;
    org.reviewedBy = new Types.ObjectId(adminUserId);
    org.reviewedAt = new Date();
    org.rejectionReason = '';
    org.suspensionReason = '';

    await org.save();

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(adminUserId),
        action: 'BUSINESS_APPROVED',
        entityType: 'Organization',
        entityId: String(org._id),
        message: `Business '${org.name}' was APPROVED by admin`,
        metadata: { orgId: String(org._id), name: org.name },
      });
    }

    return org;
  }

  /**
   * ADMIN: Reject a business with mandatory reason
   */
  async rejectOrganization(
    adminUserId: string,
    orgId: string,
    reason: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason must be provided for rejection');
    }

    const org = await this.orgModel.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    org.status = BusinessStatus.REJECTED;
    org.verificationStatus = OrganizationVerificationStatus.REVOKED;
    org.rejectionReason = reason.trim();
    org.reviewedBy = new Types.ObjectId(adminUserId);
    org.reviewedAt = new Date();

    await org.save();

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(adminUserId),
        action: 'BUSINESS_REJECTED',
        entityType: 'Organization',
        entityId: String(org._id),
        message: `Business '${org.name}' was REJECTED: ${reason.trim()}`,
        metadata: {
          orgId: String(org._id),
          name: org.name,
          reason: reason.trim(),
        },
      });
    }

    return org;
  }

  /**
   * ADMIN: Suspend a business with mandatory reason
   */
  async suspendOrganization(
    adminUserId: string,
    orgId: string,
    reason: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason must be provided for suspension');
    }

    const org = await this.orgModel.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    org.status = BusinessStatus.SUSPENDED;
    org.verificationStatus = OrganizationVerificationStatus.REVOKED;
    org.suspensionReason = reason.trim();
    org.reviewedBy = new Types.ObjectId(adminUserId);
    org.reviewedAt = new Date();

    await org.save();

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(adminUserId),
        action: 'BUSINESS_SUSPENDED',
        entityType: 'Organization',
        entityId: String(org._id),
        message: `Business '${org.name}' was SUSPENDED: ${reason.trim()}`,
        metadata: {
          orgId: String(org._id),
          name: org.name,
          reason: reason.trim(),
        },
      });
    }

    return org;
  }

  /**
   * List members of an organization with safe user projections
   */
  async getMembers(orgId: string) {
    const orgObjId = new Types.ObjectId(orgId);
    const memberships = await this.membershipModel
      .find({ organizationId: orgObjId, status: MembershipStatus.ACTIVE })
      .populate(
        'userId',
        'name username avatar headline currentRole primaryRole',
      )
      .lean();

    return memberships.map((m: any) => ({
      id: m._id,
      userId: m.userId?._id,
      name: m.userId?.name || 'Member',
      username: m.userId?.username || '',
      avatar: m.userId?.avatar || '',
      headline: m.userId?.headline || '',
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Add a member to the organization (Authorized: OWNER or ADMIN)
   */
  async addMember(
    currentUserId: string,
    orgId: string,
    targetUserId: string,
    role: OrganizationRole = OrganizationRole.MEMBER,
  ) {
    await this.assertMemberRole(currentUserId, orgId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const orgObjId = new Types.ObjectId(orgId);
    const userObjId = new Types.ObjectId(targetUserId);

    const existing = await this.membershipModel.findOne({
      organizationId: orgObjId,
      userId: userObjId,
    });

    if (existing) {
      existing.role = role;
      existing.status = MembershipStatus.ACTIVE;
      await existing.save();
      return existing;
    }

    return this.membershipModel.create({
      organizationId: orgObjId,
      userId: userObjId,
      role,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });
  }

  /**
   * Helper to verify user has one of the required roles
   */
  async assertMemberRole(
    userId: string,
    orgId: string,
    allowedRoles: OrganizationRole[],
  ) {
    const orgObjId = new Types.ObjectId(orgId);
    const userObjId = new Types.ObjectId(userId);

    const membership = await this.membershipModel.findOne({
      organizationId: orgObjId,
      userId: userObjId,
      status: MembershipStatus.ACTIVE,
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'You do not have the required permissions for this organization',
      );
    }

    return membership;
  }
}

