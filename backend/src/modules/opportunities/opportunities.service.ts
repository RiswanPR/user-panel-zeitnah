import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
} from '../organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
  OrganizationRole,
  MembershipStatus,
} from '../organizations/schemas/organization-membership.schema';

export interface CreateOpportunityDto {
  organizationId: string;
  type: OpportunityType;
  title: string;
  description?: string;
  skills?: string[];
  location?: string;
  workMode?: WorkMode;
  experienceLevel?: ExperienceLevel;
  visibility?: OpportunityVisibility;
  expiresAt?: string | Date | null;
}

export interface UpdateOpportunityDto extends Partial<CreateOpportunityDto> {}

export interface QueryOpportunitiesDto {
  q?: string;
  type?: OpportunityType;
  workMode?: WorkMode;
  experienceLevel?: ExperienceLevel;
  skill?: string;
  location?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectModel(Opportunity.name)
    private readonly oppModel: Model<OpportunityDocument>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name)
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
  ) {}

  /**
   * List/Search published opportunities with filters and pagination
   */
  async getOpportunities(query: QueryOpportunitiesDto) {
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
    if (query.workMode) {
      filter.workMode = query.workMode;
    }
    if (query.experienceLevel) {
      filter.experienceLevel = query.experienceLevel;
    }
    if (query.skill && query.skill.trim()) {
      filter.skills = new RegExp(query.skill.trim(), 'i');
    }
    if (query.location && query.location.trim()) {
      filter.location = new RegExp(query.location.trim(), 'i');
    }
    if (query.organizationId && Types.ObjectId.isValid(query.organizationId)) {
      filter.organizationId = new Types.ObjectId(query.organizationId);
    }
    if (query.q && query.q.trim()) {
      const clean = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(clean, 'i');
      filter.$or = [{ title: regex }, { description: regex }, { skills: regex }];
    }

    const [total, docs] = await Promise.all([
      this.oppModel.countDocuments(filter),
      this.oppModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('organizationId', 'name slug logo type industry verificationStatus')
        .lean(),
    ]);

    const data = docs.map((opp: any) => ({
      id: opp._id,
      title: opp.title,
      type: opp.type,
      description: opp.description,
      skills: opp.skills || [],
      location: opp.location,
      workMode: opp.workMode,
      experienceLevel: opp.experienceLevel,
      status: opp.status,
      publishedAt: opp.publishedAt,
      expiresAt: opp.expiresAt,
      organization: opp.organizationId
        ? {
            id: opp.organizationId._id,
            name: opp.organizationId.name,
            slug: opp.organizationId.slug,
            logo: opp.organizationId.logo,
            type: opp.organizationId.type,
            industry: opp.organizationId.industry,
            verificationStatus: opp.organizationId.verificationStatus,
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
   * Get single opportunity by ID
   */
  async getOpportunityById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid opportunity ID');
    }

    const opp: any = await this.oppModel
      .findById(id)
      .populate('organizationId', 'name slug logo description website industry location verificationStatus')
      .lean();

    if (!opp) {
      throw new NotFoundException('Opportunity not found');
    }

    return {
      id: opp._id,
      title: opp.title,
      type: opp.type,
      description: opp.description,
      skills: opp.skills || [],
      location: opp.location,
      workMode: opp.workMode,
      experienceLevel: opp.experienceLevel,
      status: opp.status,
      publishedAt: opp.publishedAt,
      expiresAt: opp.expiresAt,
      organization: opp.organizationId,
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

    const opp = await this.oppModel.create({
      organizationId: new Types.ObjectId(dto.organizationId),
      createdBy: new Types.ObjectId(userId),
      type: dto.type,
      title: dto.title.trim(),
      description: dto.description?.trim() || '',
      skills: dto.skills || [],
      location: dto.location?.trim() || '',
      workMode: dto.workMode || WorkMode.REMOTE,
      experienceLevel: dto.experienceLevel || ExperienceLevel.ENTRY,
      visibility: dto.visibility || OpportunityVisibility.PUBLIC,
      status: OpportunityStatus.PUBLISHED,
      publishedAt: new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return opp;
  }

  /**
   * Update opportunity (Authorized: OWNER, ADMIN, or RECRUITER of owning org)
   */
  async updateOpportunity(userId: string, id: string, dto: UpdateOpportunityDto) {
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
    if (dto.skills !== undefined) opp.skills = dto.skills;
    if (dto.type !== undefined) opp.type = dto.type;
    if (dto.location !== undefined) opp.location = dto.location.trim();
    if (dto.workMode !== undefined) opp.workMode = dto.workMode;
    if (dto.experienceLevel !== undefined) opp.experienceLevel = dto.experienceLevel;
    if (dto.visibility !== undefined) opp.visibility = dto.visibility;
    if (dto.expiresAt !== undefined) opp.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    await opp.save();
    return opp;
  }

  /**
   * Update status (PUBLISHED, PAUSED, CLOSED)
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

    opp.status = status;
    await opp.save();
    return opp;
  }

  private async assertOrgRole(userId: string, orgId: string, allowedRoles: OrganizationRole[]) {
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
