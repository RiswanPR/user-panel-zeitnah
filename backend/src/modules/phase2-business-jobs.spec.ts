import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { OrganizationsService } from './organizations/organizations.service';
import {
  Organization,
  OrganizationType,
  BusinessStatus,
  OrganizationVerificationStatus,
} from './organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationRole,
  MembershipStatus,
} from './organizations/schemas/organization-membership.schema';
import { User } from './auth/schemas/user.schema';
import { OpportunitiesService } from './opportunities/opportunities.service';
import {
  Opportunity,
  OpportunityStatus,
  OpportunityType,
} from './opportunities/schemas/opportunity.schema';
import { SavedJob } from './opportunities/schemas/saved-job.schema';
import { JobApplication, JobApplicationStatus } from './opportunities/schemas/job-application.schema';
import { AuditLogsService } from './audit-logs/audit-logs.service';

describe('Phase 2: Business & Job Infrastructure', () => {
  let orgService: OrganizationsService;
  let oppService: OpportunitiesService;

  let mockOrgModel: any;
  let mockMembershipModel: any;
  let mockUserModel: any;
  let mockOppModel: any;
  let mockSavedJobModel: any;
  let mockJobAppModel: any;
  let mockAuditLogsService: any;

  beforeEach(async () => {
    mockOrgModel = {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
              }),
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockMembershipModel = {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        lean: jest.fn().mockResolvedValue([]),
      }),
      aggregate: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(1),
    };

    mockUserModel = {
      findById: jest.fn(),
    };

    mockOppModel = {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
              }),
              select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
              }),
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([]),
    };

    mockSavedJobModel = {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };

    mockJobAppModel = {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
            lean: jest.fn().mockResolvedValue([]),
          }),
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
      aggregate: jest.fn().mockResolvedValue([]),
    };

    mockAuditLogsService = {
      record: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        OpportunitiesService,
        { provide: getModelToken(Organization.name), useValue: mockOrgModel },
        { provide: getModelToken(OrganizationMembership.name), useValue: mockMembershipModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Opportunity.name), useValue: mockOppModel },
        { provide: getModelToken(SavedJob.name), useValue: mockSavedJobModel },
        { provide: getModelToken(JobApplication.name), useValue: mockJobAppModel },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    orgService = module.get<OrganizationsService>(OrganizationsService);
    oppService = module.get<OpportunitiesService>(OpportunitiesService);
  });

  describe('1. Business Authorization (Profile Roles)', () => {
    it('✓ Recruiter can create business', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        primaryRole: 'RECRUITER',
      });
      mockOrgModel.findOne.mockResolvedValue(null);

      const org = await orgService.createOrganization(userId, {
        name: 'Apex Structural Engineering',
        industry: 'Structural Engineering',
        infrastructureSpecializations: ['BIM', 'Real Estate Development'],
      });

      expect(org).toBeDefined();
      expect(org.name).toBe('Apex Structural Engineering');
      expect(org.status).toBe(BusinessStatus.PENDING);
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BUSINESS_CREATED' }),
      );
    });

    it('✓ Founder can create business', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        primaryRole: 'FOUNDER',
      });
      mockOrgModel.findOne.mockResolvedValue(null);

      const org = await orgService.createOrganization(userId, {
        name: 'Infratech Systems',
        type: OrganizationType.STARTUP,
        infrastructureSpecializations: ['Infrastructure Technology', 'EPC'],
      });

      expect(org).toBeDefined();
      expect(org.status).toBe(BusinessStatus.PENDING);
    });

    it('✓ Student CANNOT create business (throws 403 Forbidden)', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        primaryRole: 'STUDENT',
      });

      await expect(
        orgService.createOrganization(userId, { name: 'Student Corp' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('✓ Educator CANNOT create business (throws 403 Forbidden)', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        primaryRole: 'EDUCATOR',
      });

      await expect(
        orgService.createOrganization(userId, { name: 'Educator Academy' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('✓ Professional CANNOT create business (throws 403 Forbidden)', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        primaryRole: 'PROFESSIONAL',
      });

      await expect(
        orgService.createOrganization(userId, { name: 'Pro Services' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('✓ Mentor CANNOT create business (throws 403 Forbidden)', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        primaryRole: 'MENTOR',
      });

      await expect(
        orgService.createOrganization(userId, { name: 'Mentor Network' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('2. Business Verification & Admin Lifecycle', () => {
    it('✓ New business starts as PENDING or DRAFT and is not publicly verified', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserModel.findById.mockResolvedValue({ primaryRole: 'RECRUITER' });
      mockOrgModel.findOne.mockResolvedValue(null);

      const pendingOrg = await orgService.createOrganization(userId, {
        name: 'Pending Builders',
      });
      expect(pendingOrg.status).toBe(BusinessStatus.PENDING);

      const draftOrg = await orgService.createOrganization(userId, {
        name: 'Draft Builders',
        status: BusinessStatus.DRAFT,
      });
      expect(draftOrg.status).toBe(BusinessStatus.DRAFT);
    });

    it('✓ Admin can approve business -> status becomes APPROVED and verified', async () => {
      const adminId = new Types.ObjectId().toString();
      const mockOrg = {
        _id: new Types.ObjectId(),
        name: 'Kerala Infra Ltd',
        status: BusinessStatus.PENDING,
        verificationStatus: OrganizationVerificationStatus.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };
      mockOrgModel.findById.mockResolvedValue(mockOrg);

      const approved = await orgService.approveOrganization(adminId, String(mockOrg._id));
      expect(approved.status).toBe(BusinessStatus.APPROVED);
      expect(approved.verificationStatus).toBe(OrganizationVerificationStatus.VERIFIED);
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BUSINESS_APPROVED' }),
      );
    });

    it('✓ Admin can reject business with reason -> status becomes REJECTED', async () => {
      const adminId = new Types.ObjectId().toString();
      const mockOrg = {
        _id: new Types.ObjectId(),
        name: 'Fake Infra',
        status: BusinessStatus.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };
      mockOrgModel.findById.mockResolvedValue(mockOrg);

      const rejected = await orgService.rejectOrganization(
        adminId,
        String(mockOrg._id),
        'Invalid business credentials provided',
      );
      expect(rejected.status).toBe(BusinessStatus.REJECTED);
      expect(rejected.rejectionReason).toBe('Invalid business credentials provided');
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BUSINESS_REJECTED' }),
      );
    });

    it('✓ Admin can suspend business with reason', async () => {
      const adminId = new Types.ObjectId().toString();
      const mockOrg = {
        _id: new Types.ObjectId(),
        name: 'Suspicious Corp',
        status: BusinessStatus.APPROVED,
        save: jest.fn().mockResolvedValue(true),
      };
      mockOrgModel.findById.mockResolvedValue(mockOrg);

      const suspended = await orgService.suspendOrganization(
        adminId,
        String(mockOrg._id),
        'Compliance breach',
      );
      expect(suspended.status).toBe(BusinessStatus.SUSPENDED);
      expect(suspended.suspensionReason).toBe('Compliance breach');
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BUSINESS_SUSPENDED' }),
      );
    });
  });

  describe('3. Ownership & Authorization Guards', () => {
    it('✓ Owner can update own business', async () => {
      const userId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });
      const mockOrg = {
        _id: orgId,
        name: 'Original Name',
        save: jest.fn().mockResolvedValue(true),
      };
      mockOrgModel.findById.mockResolvedValue(mockOrg);

      const updated = await orgService.updateOrganization(userId, orgId, {
        name: 'Updated Infra Name',
      });
      expect(updated.name).toBe('Updated Infra Name');
    });

    it('✓ Non-owner cannot update another user business (throws 403 Forbidden)', async () => {
      const intruderId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();
      mockMembershipModel.findOne.mockResolvedValue(null);

      await expect(
        orgService.updateOrganization(intruderId, orgId, { name: 'Hacked Name' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4. Infrastructure Job Creation & Validation', () => {
    it('✓ Pending business CANNOT publish jobs (throws 403 Forbidden)', async () => {
      const userId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });
      mockOrgModel.findById.mockResolvedValue({
        _id: orgId,
        status: BusinessStatus.PENDING,
        verificationStatus: OrganizationVerificationStatus.PENDING,
      });

      await expect(
        oppService.createOpportunity(userId, {
          organizationId: orgId,
          title: 'Senior Planning Engineer',
          status: OpportunityStatus.PUBLISHED,
          discipline: 'Planning & Scheduling',
          infrastructureSector: 'Highways',
          location: 'Kochi',
          workMode: 'On-site',
          jobType: 'Full-time',
          requiredSkills: ['Primavera P6'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('✓ Approved business can create & publish structured infrastructure job', async () => {
      const userId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });
      mockOrgModel.findById.mockResolvedValue({
        _id: orgId,
        name: 'Approved Infra Corp',
        status: BusinessStatus.APPROVED,
        verificationStatus: OrganizationVerificationStatus.VERIFIED,
      });

      const job = await oppService.createOpportunity(userId, {
        organizationId: orgId,
        title: 'Senior Planning Engineer',
        discipline: 'Planning & Scheduling',
        specialization: 'Delay Analysis',
        infrastructureSector: 'Highways',
        minYearsExperience: 3,
        maxYearsExperience: 6,
        requiredSkills: ['Primavera P6', 'Delay Analysis (EOT)'],
        preferredSkills: ['MS Project'],
        requiredSoftware: ['Primavera P6'],
        preferredSoftware: ['AutoCAD'],
        requiredEducation: 'B.Tech Civil Engineering',
        requiredCertifications: ['PMP'],
        location: 'Kochi, Kerala',
        workMode: 'On-site',
        jobType: 'Full-time',
        salaryMin: 800000,
        salaryMax: 1500000,
        currency: 'INR',
        responsibilities: 'Manage baseline schedule and monthly project controls.',
        requirements: 'Proven experience with FIDIC contracts and Primavera P6.',
        status: OpportunityStatus.PUBLISHED,
      });

      expect(job).toBeDefined();
      expect(job.title).toBe('Senior Planning Engineer');
      expect(job.status).toBe(OpportunityStatus.PUBLISHED);
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'JOB_CREATED' }),
      );
    });

    it('✓ Deterministic validation catches invalid experience range', async () => {
      const userId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });
      mockOrgModel.findById.mockResolvedValue({
        _id: orgId,
        status: BusinessStatus.APPROVED,
        verificationStatus: OrganizationVerificationStatus.VERIFIED,
      });

      await expect(
        oppService.createOpportunity(userId, {
          organizationId: orgId,
          title: 'Site Engineer',
          discipline: 'Civil Engineering',
          infrastructureSector: 'Buildings',
          location: 'Mumbai',
          workMode: 'On-site',
          jobType: 'Full-time',
          requiredSkills: ['Site Supervision'],
          responsibilities: 'Oversee site works',
          minYearsExperience: 8,
          maxYearsExperience: 3, // min > max!
          status: OpportunityStatus.PUBLISHED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Deterministic validation catches missing required skills', async () => {
      const userId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });
      mockOrgModel.findById.mockResolvedValue({
        _id: orgId,
        status: BusinessStatus.APPROVED,
        verificationStatus: OrganizationVerificationStatus.VERIFIED,
      });

      await expect(
        oppService.createOpportunity(userId, {
          organizationId: orgId,
          title: 'Site Engineer',
          discipline: 'Civil Engineering',
          infrastructureSector: 'Buildings',
          location: 'Mumbai',
          workMode: 'On-site',
          jobType: 'Full-time',
          requiredSkills: [], // Empty!
          responsibilities: 'Oversee site works',
          status: OpportunityStatus.PUBLISHED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Draft job can be saved with partial fields', async () => {
      const userId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();
      mockMembershipModel.findOne.mockResolvedValue({
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });
      mockOrgModel.findById.mockResolvedValue({
        _id: orgId,
        status: BusinessStatus.PENDING,
      });

      const draft = await oppService.createOpportunity(userId, {
        organizationId: orgId,
        title: 'Draft BIM Manager',
        status: OpportunityStatus.DRAFT,
      });

      expect(draft).toBeDefined();
      expect(draft.status).toBe(OpportunityStatus.DRAFT);
    });
  });

  describe('5. Job Saving & Applications Foundation', () => {
    it('✓ Candidate can save and unsave a job preventing duplicates', async () => {
      const candId = new Types.ObjectId().toString();
      const jobId = new Types.ObjectId().toString();
      mockOppModel.findById.mockResolvedValue({ _id: jobId, status: OpportunityStatus.PUBLISHED });

      // First save
      mockSavedJobModel.findOne.mockResolvedValueOnce(null);
      const res1 = await oppService.saveJob(candId, jobId);
      expect(res1.saved).toBe(true);

      // Duplicate save returns gracefully
      mockSavedJobModel.findOne.mockResolvedValueOnce({ _id: new Types.ObjectId() });
      const res2 = await oppService.saveJob(candId, jobId);
      expect(res2.saved).toBe(true);

      // Unsave
      const res3 = await oppService.unsaveJob(candId, jobId);
      expect(res3.saved).toBe(false);
    });

    it('✓ Candidate can apply to published job', async () => {
      const candId = new Types.ObjectId().toString();
      const jobId = new Types.ObjectId().toString();
      mockOppModel.findById.mockResolvedValue({
        _id: jobId,
        title: 'BIM Coordinator',
        organizationId: new Types.ObjectId(),
        status: OpportunityStatus.PUBLISHED,
      });
      mockJobAppModel.findOne.mockResolvedValue(null);

      const app: any = await oppService.applyToJob(candId, jobId, {
        coverNote: 'Extensive Navisworks and Revit experience.',
        resumeUrl: 'https://zeitnah.app/resumes/cand1.pdf',
      });

      expect(app).toBeDefined();
      expect(app.status).toBe(JobApplicationStatus.SUBMITTED);
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'JOB_APPLICATION_SUBMITTED' }),
      );
    });

    it('✓ Duplicate application to same job is blocked with 409 Conflict', async () => {
      const candId = new Types.ObjectId().toString();
      const jobId = new Types.ObjectId().toString();
      mockOppModel.findById.mockResolvedValue({
        _id: jobId,
        status: OpportunityStatus.PUBLISHED,
      });
      mockJobAppModel.findOne.mockResolvedValue({
        status: JobApplicationStatus.SUBMITTED,
      });

      await expect(
        oppService.applyToJob(candId, jobId, { coverNote: 'Again' }),
      ).rejects.toThrow(ConflictException);
    });

    it('✓ Application to DRAFT job is blocked with 400 BadRequest', async () => {
      const candId = new Types.ObjectId().toString();
      const jobId = new Types.ObjectId().toString();
      mockOppModel.findById.mockResolvedValue({
        _id: jobId,
        status: OpportunityStatus.DRAFT,
      });

      await expect(
        oppService.applyToJob(candId, jobId, { coverNote: 'Draft apply' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Candidate can withdraw application', async () => {
      const candId = new Types.ObjectId().toString();
      const appId = new Types.ObjectId().toString();
      const mockApp = {
        _id: appId,
        status: JobApplicationStatus.SUBMITTED,
        save: jest.fn().mockResolvedValue(true),
      };
      mockJobAppModel.findOne.mockResolvedValue(mockApp);

      const withdrawn: any = await oppService.withdrawApplication(candId, appId);
      expect(withdrawn.status).toBe(JobApplicationStatus.WITHDRAWN);
      expect(withdrawn.withdrawnAt).toBeDefined();
    });
  });
});
