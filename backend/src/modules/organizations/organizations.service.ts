import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
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
} from './schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
  OrganizationRole,
  MembershipStatus,
} from './schemas/organization-membership.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';

export interface CreateOrganizationDto {
  name: string;
  type?: OrganizationType;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  location?: string;
}

export interface UpdateOrganizationDto extends Partial<CreateOrganizationDto> {
  visibility?: OrganizationVisibility;
}

export interface QueryOrganizationsDto {
  q?: string;
  type?: OrganizationType;
  industry?: string;
  location?: string;
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
  ) {}

  /**
   * Create an organization and assign creator as OWNER
   */
  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const userObjId = new Types.ObjectId(userId);
    const cleanName = dto.name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await this.orgModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(`Organization slug '${slug}' is already registered`);
    }

    const org = await this.orgModel.create({
      name: cleanName,
      slug,
      type: dto.type || OrganizationType.COMPANY,
      description: dto.description?.trim() || '',
      logo: dto.logo || '',
      website: dto.website?.trim() || '',
      industry: dto.industry?.trim() || '',
      location: dto.location?.trim() || '',
      verificationStatus: OrganizationVerificationStatus.UNVERIFIED,
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

    return org;
  }

  /**
   * List/Search organizations with filters and pagination
   */
  async getOrganizations(query: QueryOrganizationsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { visibility: OrganizationVisibility.PUBLIC };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.industry && query.industry.trim()) {
      filter.industry = new RegExp(escapeRegex(query.industry.trim()), 'i');
    }
    if (query.location && query.location.trim()) {
      filter.location = new RegExp(escapeRegex(query.location.trim()), 'i');
    }
    if (query.q && query.q.trim()) {
      const clean = escapeRegex(query.q.trim());
      const regex = new RegExp(clean, 'i');
      filter.$or = [{ name: regex }, { description: regex }, { industry: regex }];
    }

    const [total, docs] = await Promise.all([
      this.orgModel.countDocuments(filter),
      this.orgModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    // Enhance with member counts
    const orgIds = docs.map((d) => d._id);
    const memberCounts = await this.membershipModel.aggregate([
      { $match: { organizationId: { $in: orgIds }, status: MembershipStatus.ACTIVE } },
      { $group: { _id: '$organizationId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const mc of memberCounts) {
      countMap.set(String(mc._id), mc.count);
    }

    const data = docs.map((org) => ({
      ...org,
      memberCount: countMap.get(String(org._id)) || 1,
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
  async getOrganizationBySlug(slug: string) {
    const cleanSlug = slug.toLowerCase().trim();
    const org = await this.orgModel.findOne({ slug: cleanSlug }).lean();

    if (!org) {
      throw new NotFoundException(`Organization '${slug}' not found`);
    }

    const memberCount = await this.membershipModel.countDocuments({
      organizationId: org._id,
      status: MembershipStatus.ACTIVE,
    });

    return {
      ...org,
      memberCount,
    };
  }

  /**
   * Update organization details (Authorized: OWNER or ADMIN)
   */
  async updateOrganization(userId: string, orgId: string, dto: UpdateOrganizationDto) {
    await this.assertMemberRole(userId, orgId, [OrganizationRole.OWNER, OrganizationRole.ADMIN]);

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
    if (dto.location !== undefined) org.location = dto.location.trim();
    if (dto.visibility !== undefined) org.visibility = dto.visibility;

    await org.save();
    return org;
  }

  /**
   * List members of an organization with safe user projections
   */
  async getMembers(orgId: string) {
    const orgObjId = new Types.ObjectId(orgId);
    const memberships = await this.membershipModel
      .find({ organizationId: orgObjId, status: MembershipStatus.ACTIVE })
      .populate('userId', 'name username avatar headline currentRole primaryRole')
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
  async assertMemberRole(userId: string, orgId: string, allowedRoles: OrganizationRole[]) {
    const orgObjId = new Types.ObjectId(orgId);
    const userObjId = new Types.ObjectId(userId);

    const membership = await this.membershipModel.findOne({
      organizationId: orgObjId,
      userId: userObjId,
      status: MembershipStatus.ACTIVE,
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have the required permissions for this organization');
    }

    return membership;
  }
}
