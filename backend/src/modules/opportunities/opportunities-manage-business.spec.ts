import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OpportunitiesService } from './opportunities.service';
import {
  Opportunity,
  OpportunityStatus,
  WorkMode,
} from './schemas/opportunity.schema';
import {
  Organization,
  OrganizationVerificationStatus,
} from '../organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationRole,
  MembershipStatus,
} from '../organizations/schemas/organization-membership.schema';
import {
  JobApplication,
  JobApplicationStatus,
} from './schemas/job-application.schema';
import { SavedJob } from './schemas/saved-job.schema';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateOpportunityStatusDto } from './dto/update-opportunity-status.dto';

describe('Manage Business — Opportunities Backend Logic (MB-001 - MB-012)', () => {
  let service: OpportunitiesService;
  let mockOppModel: any;
  let mockOrgModel: any;
  let mockMembershipModel: any;
  let mockJobAppModel: any;
  let mockSavedJobModel: any;

  beforeEach(async () => {
    mockOppModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      find: jest.fn(),
      create: jest.fn(),
    };
    mockOrgModel = {
      findById: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        verificationStatus: OrganizationVerificationStatus.VERIFIED,
      }),
    };
    mockMembershipModel = {
      findOne: jest.fn(),
    };
    mockJobAppModel = {
      countDocuments: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };
    mockSavedJobModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: getModelToken(Opportunity.name), useValue: mockOppModel },
        { provide: getModelToken(Organization.name), useValue: mockOrgModel },
        {
          provide: getModelToken(OrganizationMembership.name),
          useValue: mockMembershipModel,
        },
        {
          provide: getModelToken(JobApplication.name),
          useValue: mockJobAppModel,
        },
        { provide: getModelToken(SavedJob.name), useValue: mockSavedJobModel },
      ],
    }).compile();

    service = module.get<OpportunitiesService>(OpportunitiesService);
  });

  describe('UpdateOpportunityStatusDto Validation (MB-011)', () => {
    it('passes validation with valid status and ISO deadline', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
      const dto = plainToInstance(UpdateOpportunityStatusDto, {
        status: OpportunityStatus.PUBLISHED,
        deadline: futureDate,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('rejects invalid opportunity status enum', async () => {
      const dto = plainToInstance(UpdateOpportunityStatusDto, {
        status: 'INVALID_STATUS',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('status');
    });

    it('rejects invalid date string for deadline', async () => {
      const dto = plainToInstance(UpdateOpportunityStatusDto, {
        status: OpportunityStatus.PUBLISHED,
        deadline: 'not-a-valid-date',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('deadline');
    });
  });

  describe('Reopening Expired Jobs (MB-001)', () => {
    const oppId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const orgId = new Types.ObjectId();

    it('rejects publishing when deadline has passed and no new deadline provided', async () => {
      const pastDeadline = new Date(Date.now() - 1000000);
      const mockOpp = {
        _id: oppId,
        organizationId: orgId,
        postedBy: new Types.ObjectId(userId),
        status: OpportunityStatus.CLOSED,
        applicationDeadline: pastDeadline,
        title: 'Full Stack Engineer',
        description:
          'A comprehensive job description with sufficient length to pass minimum character constraints.',
        responsibilities: ['Build features', 'Review PRs'],
        requiredSkills: ['Node.js', 'React'],
        save: jest.fn(),
      };

      mockOppModel.findById.mockResolvedValue(mockOpp);
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.RECRUITER,
        status: MembershipStatus.ACTIVE,
      });

      await expect(
        service.updateStatus(oppId, userId, {
          status: OpportunityStatus.PUBLISHED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows publishing expired job when a valid future deadline is provided', async () => {
      const pastDeadline = new Date(Date.now() - 1000000);
      const futureDeadline = new Date(Date.now() + 86400000 * 14).toISOString();
      const mockOpp = {
        _id: oppId,
        organizationId: orgId,
        postedBy: new Types.ObjectId(userId),
        status: OpportunityStatus.CLOSED,
        applicationDeadline: pastDeadline,
        title: 'Full Stack Engineer',
        description:
          'A comprehensive job description with sufficient length to pass minimum character constraints.',
        responsibilities: ['Build features', 'Review PRs'],
        requiredSkills: ['Node.js', 'React'],
        discipline: 'Engineering',
        infrastructureSector: 'Infrastructure',
        location: 'Bengaluru',
        workMode: WorkMode.REMOTE,
        jobType: 'Full-time',
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      mockOppModel.findById.mockResolvedValue(mockOpp);
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.RECRUITER,
        status: MembershipStatus.ACTIVE,
      });

      const updated = await service.updateStatus(oppId, userId, {
        status: OpportunityStatus.PUBLISHED,
        deadline: futureDeadline,
      });

      expect(updated.status).toBe(OpportunityStatus.PUBLISHED);
      expect(mockOpp.applicationDeadline).toEqual(new Date(futureDeadline));
      expect(mockOpp.save).toHaveBeenCalled();
    });
  });

  describe('Draft Completeness Publishing Validation (MB-003)', () => {
    const oppId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const orgId = new Types.ObjectId();

    it('rejects publishing an incomplete draft lacking required skills and responsibilities', async () => {
      const mockIncompleteOpp = {
        _id: oppId,
        organizationId: orgId,
        postedBy: new Types.ObjectId(userId),
        status: OpportunityStatus.DRAFT,
        title: 'Incomplete Job',
        description: 'Short',
        responsibilities: [],
        requiredSkills: [],
        applicationDeadline: new Date(Date.now() + 86400000),
      };

      mockOppModel.findById.mockResolvedValue(mockIncompleteOpp);
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.RECRUITER,
        status: MembershipStatus.ACTIVE,
      });

      await expect(
        service.updateStatus(oppId, userId, {
          status: OpportunityStatus.PUBLISHED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Delete Opportunity & Data Safety (MB-007)', () => {
    const oppId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const orgId = new Types.ObjectId();

    it('prevents deletion if active applications exist for the job', async () => {
      const mockOpp = {
        _id: oppId,
        organizationId: orgId,
        postedBy: new Types.ObjectId(userId),
        title: 'Active Job',
      };
      mockOppModel.findById.mockResolvedValue(mockOpp);
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      });
      mockJobAppModel.countDocuments.mockResolvedValue(3); // 3 active applicants

      await expect(service.deleteOpportunity(oppId, userId)).rejects.toThrow(
        /Cannot delete a job with active applications/i,
      );
      expect(mockOppModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('successfully deletes opportunity when no active applications exist', async () => {
      const mockOpp = {
        _id: oppId,
        organizationId: orgId,
        postedBy: new Types.ObjectId(userId),
        title: 'Empty Draft Job',
      };
      mockOppModel.findById.mockResolvedValue(mockOpp);
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      });
      mockJobAppModel.countDocuments.mockResolvedValue(0);
      mockOppModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const res = await service.deleteOpportunity(oppId, userId);
      expect(res.success).toBe(true);
      expect(mockOppModel.deleteOne).toHaveBeenCalledWith({ _id: oppId });
    });
  });

  describe('Recruiter Application Status Management (MB-006)', () => {
    const appId = new Types.ObjectId().toString();
    const oppId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const orgId = new Types.ObjectId();

    it('allows authorized recruiter to update applicant pipeline status', async () => {
      const mockApp = {
        _id: appId,
        opportunityId: oppId,
        status: 'submitted',
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      const mockOpp = {
        _id: oppId,
        organizationId: orgId,
      };

      mockJobAppModel.findById.mockResolvedValue(mockApp);
      mockOppModel.findById.mockResolvedValue(mockOpp);
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.RECRUITER,
        status: MembershipStatus.ACTIVE,
      });

      const res = await service.updateApplicationStatus(
        appId,
        userId,
        JobApplicationStatus.SHORTLISTED,
      );
      expect(res.status).toBe('shortlisted');
      expect(mockApp.save).toHaveBeenCalled();
    });

    it('rejects invalid application status transitions', async () => {
      const mockApp = {
        _id: appId,
        opportunityId: oppId,
        status: 'submitted',
      };
      const mockOpp = {
        _id: oppId,
        organizationId: orgId,
      };

      mockJobAppModel.findById.mockResolvedValue(mockApp);
      mockOppModel.findById.mockResolvedValue(mockOpp);
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.RECRUITER,
        status: MembershipStatus.ACTIVE,
      });

      await expect(
        service.updateApplicationStatus(
          appId,
          userId,
          'invalid_status_type' as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Authorization & Teammate Access (MB-012)', () => {
    const oppId = new Types.ObjectId().toString();
    const posterId = new Types.ObjectId().toString();
    const colleagueId = new Types.ObjectId().toString();
    const unrelatedUserId = new Types.ObjectId().toString();
    const orgId = new Types.ObjectId();

    it('allows colleague with RECRUITER role in the same org to close job', async () => {
      const mockOpp = {
        _id: oppId,
        organizationId: orgId,
        postedBy: new Types.ObjectId(posterId),
        status: OpportunityStatus.PUBLISHED,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      mockOppModel.findById.mockResolvedValue(mockOpp);
      // Colleague has RECRUITER membership
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.RECRUITER,
        status: MembershipStatus.ACTIVE,
      });

      const updated = await service.updateStatus(oppId, colleagueId, {
        status: OpportunityStatus.CLOSED,
      });

      expect(updated.status).toBe(OpportunityStatus.CLOSED);
    });

    it('forbids unrelated user from managing an organization job', async () => {
      const mockOpp = {
        _id: oppId,
        organizationId: orgId,
        postedBy: new Types.ObjectId(posterId),
        status: OpportunityStatus.PUBLISHED,
      };

      mockOppModel.findById.mockResolvedValue(mockOpp);
      // Unrelated user has no membership in this organization
      mockMembershipModel.findOne.mockResolvedValue(null);
      mockOrgModel.findById.mockResolvedValue({
        _id: orgId,
        createdBy: new Types.ObjectId(posterId),
      });

      await expect(
        service.updateStatus(oppId, unrelatedUserId, {
          status: OpportunityStatus.CLOSED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
