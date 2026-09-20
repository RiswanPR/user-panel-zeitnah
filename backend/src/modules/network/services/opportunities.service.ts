import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';
import { OrganizationMembership, OrganizationMembershipDocument } from '../schemas/organization-membership.schema';
import { Opportunity, OpportunityDocument } from '../schemas/opportunity.schema';
import { QueryOpportunitiesDto, QueryOrganizationsDto } from '../dto/opportunity.dto';
import { escapeRegex } from '../../../common/utils/regex.util';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectModel(Organization.name)
    private orgModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name)
    private orgMemberModel: Model<OrganizationMembershipDocument>,
    @InjectModel(Opportunity.name)
    private oppModel: Model<OpportunityDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ID format');
  }

  /**
   * Query organizations
   */
  async getOrganizations(query: QueryOrganizationsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const filter: any = { visibility: 'PUBLIC' };

    if (query.type) filter.type = query.type;
    if (query.industry) filter.industry = query.industry;
    if (query.location) filter.location = query.location;

    if (query.q && query.q.trim()) {
      const regex = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [{ name: regex }, { industry: regex }, { location: regex }, { description: regex }];
    }

    const total = await this.orgModel.countDocuments(filter);
    const orgs = await this.orgModel
      .find(filter)
      .sort({ verificationStatus: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach active member counts
    const orgIds = orgs.map((o) => o._id);
    const memberCounts = await this.orgMemberModel.aggregate([
      { $match: { organizationId: { $in: orgIds }, status: 'ACTIVE' } },
      { $group: { _id: '$organizationId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>(
      memberCounts.map((mc) => [String(mc._id), mc.count]),
    );

    const enrichedOrgs = orgs.map((o) => ({
      ...o,
      memberCount: countMap.get(String(o._id)) || 1,
    }));

    return {
      organizations: enrichedOrgs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single organization details by slug
   */
  async getOrganizationBySlug(slug: string) {
    const org = await this.orgModel.findOne({ slug: slug.toLowerCase() }).lean();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const [memberCount, opportunities] = await Promise.all([
      this.orgMemberModel.countDocuments({ organizationId: org._id, status: 'ACTIVE' }),
      this.oppModel.find({ organizationId: org._id, status: 'PUBLISHED' }).sort({ publishedAt: -1 }).lean(),
    ]);

    return {
      ...org,
      memberCount,
      opportunities,
    };
  }

  /**
   * Query opportunities
   */
  async getOpportunities(query: QueryOpportunitiesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const filter: any = { status: 'PUBLISHED', visibility: { $ne: 'PRIVATE' } };

    if (query.type) filter.type = query.type;
    if (query.workMode) filter.workMode = query.workMode;
    if (query.experienceLevel) filter.experienceLevel = query.experienceLevel;
    if (query.skill) filter.skills = query.skill;

    if (query.q && query.q.trim()) {
      const regex = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { skills: regex }, { location: regex }];
    }

    const total = await this.oppModel.countDocuments(filter);
    const opportunities = await this.oppModel
      .find(filter)
      .populate('organizationId', 'name slug logo verificationStatus industry location website')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      opportunities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single opportunity detail
   */
  async getOpportunityById(id: string) {
    const oppObjId = this.toObjectId(id);
    const opp = await this.oppModel
      .findById(oppObjId)
      .populate('organizationId', 'name slug logo description verificationStatus industry location website')
      .lean();

    if (!opp) {
      throw new NotFoundException('Opportunity not found');
    }

    return opp;
  }
}
