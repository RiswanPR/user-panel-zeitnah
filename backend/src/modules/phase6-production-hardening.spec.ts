import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProfileService } from './profile/profile.service';
import { OrganizationsService } from './organizations/organizations.service';
import { OpportunitiesService } from './opportunities/opportunities.service';
import { CareerIntelligenceService } from './career-intelligence/career-intelligence.service';
import { calculateMatch } from './matching/matching.engine';
import { MatchCategory } from './matching/schemas/job-talent-match.schema';
import { User } from './auth/schemas/user.schema';
import {
  Organization,
  BusinessStatus,
  OrganizationVerificationStatus,
  OrganizationType,
} from './organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationRole,
  MembershipStatus,
} from './organizations/schemas/organization-membership.schema';
import {
  Opportunity,
  OpportunityStatus,
  OpportunityType,
} from './opportunities/schemas/opportunity.schema';
import { SavedJob } from './opportunities/schemas/saved-job.schema';
import {
  JobApplication,
  JobApplicationStatus,
} from './opportunities/schemas/job-application.schema';
import { AuditLogsService } from './audit-logs/audit-logs.service';
import { CareerInsight } from './career-intelligence/schemas/career-insight.schema';
import { InfrastructureMarketSnapshot } from './career-intelligence/schemas/market-snapshot.schema';
import { Recommendation } from './profile/schemas/recommendation.schema';
import { UploadService } from '../common/aws/upload.service';
import { SignedUrlService } from '../common/aws/signed-url.service';
import { UsernameService } from './profile/services/username.service';

describe('Phase 6 — Production Hardening & Integration QA Suite', () => {
  let profileService: ProfileService;
  let orgService: OrganizationsService;
  let oppService: OpportunitiesService;
  let careerIntelService: CareerIntelligenceService;

  let mockUserModel: any;
  let mockOrgModel: any;
  let mockMembershipModel: any;
  let mockOppModel: any;
  let mockSavedJobModel: any;
  let mockJobAppModel: any;
  let mockAuditLogsService: any;
  let mockCareerInsightModel: any;
  let mockMarketSnapshotModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      save: jest.fn(),
    };

    mockOrgModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({ _id: new Types.ObjectId(), save: jest.fn(), ...dto }),
      ),
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([]),
                }),
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
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...dto }),
      ),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        lean: jest.fn().mockResolvedValue([]),
      }),
    };

    mockOppModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({ _id: new Types.ObjectId(), save: jest.fn(), ...dto }),
      ),
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
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        lean: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockSavedJobModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...dto }),
      ),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
          lean: jest.fn().mockResolvedValue([]),
        }),
        lean: jest.fn().mockResolvedValue([]),
      }),
    };

    mockJobAppModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({ _id: new Types.ObjectId(), save: jest.fn(), ...dto }),
      ),
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
        lean: jest.fn().mockResolvedValue([]),
      }),
      aggregate: jest.fn().mockResolvedValue([]),
    };

    mockAuditLogsService = {
      record: jest.fn().mockResolvedValue({ success: true }),
    };

    mockCareerInsightModel = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      create: jest.fn(),
    };

    mockMarketSnapshotModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
      create: jest.fn().mockImplementation((dto) => ({
        toObject: () => ({ ...dto, _id: new Types.ObjectId() }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        OrganizationsService,
        OpportunitiesService,
        CareerIntelligenceService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Organization.name), useValue: mockOrgModel },
        {
          provide: getModelToken(OrganizationMembership.name),
          useValue: mockMembershipModel,
        },
        { provide: getModelToken(Opportunity.name), useValue: mockOppModel },
        { provide: getModelToken(SavedJob.name), useValue: mockSavedJobModel },
        {
          provide: getModelToken(JobApplication.name),
          useValue: mockJobAppModel,
        },
        {
          provide: getModelToken(CareerInsight.name),
          useValue: mockCareerInsightModel,
        },
        {
          provide: getModelToken(InfrastructureMarketSnapshot.name),
          useValue: mockMarketSnapshotModel,
        },
        {
          provide: getModelToken(Recommendation.name),
          useValue: { find: jest.fn(), create: jest.fn() },
        },
        {
          provide: UploadService,
          useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() },
        },
        {
          provide: SignedUrlService,
          useValue: { getSignedUrl: jest.fn() },
        },
        {
          provide: UsernameService,
          useValue: { isUsernameAvailable: jest.fn() },
        },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    profileService = module.get<ProfileService>(ProfileService);
    orgService = module.get<OrganizationsService>(OrganizationsService);
    oppService = module.get<OpportunitiesService>(OpportunitiesService);
    careerIntelService = module.get<CareerIntelligenceService>(
      CareerIntelligenceService,
    );
  });

  // =========================================================================
  // 1. EDUCATOR ROLE HARDENING (Section 6)
  // =========================================================================
  describe('1. Educator Role Hardening & Security', () => {
    it('should block normal user from self-assigning EDUCATOR via primaryRole', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        primaryRole: 'STUDENT',
        save: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile(
          String(mockUser._id),
          { primaryRole: 'EDUCATOR' } as any,
          'user',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should block normal user from self-assigning EDUCATOR via direct API role parameter', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        primaryRole: 'STUDENT',
        save: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile(
          String(mockUser._id),
          { role: 'educator' } as any,
          'user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block an Educator from self-downgrading their protected role', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        primaryRole: 'EDUCATOR',
        save: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile(
          String(mockUser._id),
          { primaryRole: 'STUDENT' } as any,
          'user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow an Administrator to assign the EDUCATOR role and log the audit event', async () => {
      const adminId = new Types.ObjectId().toString();
      const targetUserId = new Types.ObjectId().toString();
      const mockTargetUser = {
        _id: new Types.ObjectId(targetUserId),
        name: 'Prof. Sharma',
        primaryRole: 'STUDENT',
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockImplementation((id: string) => {
        if (String(id) === adminId) {
          return Promise.resolve({
            _id: new Types.ObjectId(adminId),
            role: 'admin',
          });
        }
        return Promise.resolve(mockTargetUser);
      });

      const result = await profileService.adminAssignRole(
        adminId,
        targetUserId,
        'EDUCATOR',
      );

      expect(result.user.primaryRole).toBe('EDUCATOR');
      expect(mockTargetUser.save).toHaveBeenCalled();
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_ROLE_ASSIGNED',
          entityType: 'user',
          entityId: targetUserId,
        }),
      );
    });

    it('should allow an Administrator to revoke/change an EDUCATOR role and log the audit event', async () => {
      const adminId = new Types.ObjectId().toString();
      const targetUserId = new Types.ObjectId().toString();
      const mockTargetUser = {
        _id: new Types.ObjectId(targetUserId),
        name: 'Dr. Rao',
        primaryRole: 'EDUCATOR',
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockImplementation((id: string) => {
        if (String(id) === adminId) {
          return Promise.resolve({
            _id: new Types.ObjectId(adminId),
            role: 'admin',
          });
        }
        return Promise.resolve(mockTargetUser);
      });

      const result = await profileService.adminAssignRole(
        adminId,
        targetUserId,
        'PROFESSIONAL',
      );

      expect(result.user.primaryRole).toBe('PROFESSIONAL');
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_ROLE_ASSIGNED',
        }),
      );
    });
  });

  // =========================================================================
  // 2. BUSINESS SECURITY AUDIT (Section 7)
  // =========================================================================
  describe('2. Business Security & ID Tampering Prevention', () => {
    it('should forbid Student, Professional, and Mentor from creating a business', async () => {
      const disallowedRoles = ['STUDENT', 'PROFESSIONAL', 'MENTOR'];

      for (const role of disallowedRoles) {
        const userId = new Types.ObjectId().toString();
        mockUserModel.findById.mockResolvedValue({
          _id: new Types.ObjectId(userId),
          primaryRole: role,
          role: 'user',
        });

        await expect(
          orgService.createOrganization(userId, {
            name: 'Disallowed Infra Corp',
          } as any),
        ).rejects.toThrow(ForbiddenException);
      }
    });

    it('should permit Recruiter and Founder to create a business', async () => {
      const allowedRoles = ['RECRUITER', 'FOUNDER'];

      for (const role of allowedRoles) {
        const userId = new Types.ObjectId().toString();
        mockUserModel.findById.mockResolvedValue({
          _id: new Types.ObjectId(userId),
          primaryRole: role,
          role: 'user',
        });
        mockOrgModel.findOne.mockResolvedValue(null);

        const org = await orgService.createOrganization(userId, {
          name: `${role} Infrastructure Pvt Ltd`,
        } as any);

        expect(org).toBeDefined();
        expect(mockMembershipModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: new Types.ObjectId(userId),
            role: OrganizationRole.OWNER,
          }),
        );
      }
    });

    it('should reject ID tampering when User X attempts to update Business B', async () => {
      const userXId = new Types.ObjectId().toString();
      const businessBId = new Types.ObjectId().toString();

      // Membership query returns null because User X is not a member of Business B
      mockMembershipModel.findOne.mockResolvedValue(null);

      await expect(
        orgService.updateOrganization(userXId, businessBId, {
          name: 'Tampered Name',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 3. BUSINESS APPROVAL STATE MACHINE (Section 8)
  // =========================================================================
  describe('3. Business Approval State Machine Hardening', () => {
    it('should record audit log when Administrator approves a business', async () => {
      const adminId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();
      const mockOrg = {
        _id: new Types.ObjectId(orgId),
        name: 'L&T Metro Infra',
        status: BusinessStatus.PENDING,
        verificationStatus: OrganizationVerificationStatus.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };
      mockOrgModel.findById.mockResolvedValue(mockOrg);

      const approved = await orgService.approveOrganization(adminId, orgId);

      expect(approved.status).toBe(BusinessStatus.APPROVED);
      expect(approved.verificationStatus).toBe(
        OrganizationVerificationStatus.VERIFIED,
      );
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BUSINESS_APPROVED',
          entityType: 'Organization',
          entityId: orgId,
        }),
      );
    });

    it('should fail rejection when no reason is provided', async () => {
      const adminId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();

      await expect(
        orgService.rejectOrganization(adminId, orgId, '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail suspension when no reason is provided', async () => {
      const adminId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();

      await expect(
        orgService.suspendOrganization(adminId, orgId, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should forbid resubmitting a business that is already APPROVED', async () => {
      const ownerId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();

      mockMembershipModel.findOne.mockResolvedValue({
        organizationId: new Types.ObjectId(orgId),
        userId: new Types.ObjectId(ownerId),
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });

      mockOrgModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(orgId),
        status: BusinessStatus.APPROVED,
      });

      await expect(
        orgService.resubmitOrganization(ownerId, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 4. JOB SECURITY AUDIT (Section 9)
  // =========================================================================
  describe('4. Job Security & Authorization Boundaries', () => {
    it('should forbid a PENDING or UNAPPROVED business from publishing a job', async () => {
      const userId = new Types.ObjectId().toString();
      const orgId = new Types.ObjectId().toString();

      mockMembershipModel.findOne.mockResolvedValue({
        organizationId: new Types.ObjectId(orgId),
        userId: new Types.ObjectId(userId),
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });

      mockOrgModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(orgId),
        status: BusinessStatus.PENDING,
        verificationStatus: OrganizationVerificationStatus.PENDING,
      });

      await expect(
        oppService.createOpportunity(userId, {
          organizationId: orgId,
          title: 'Senior Highway Design Engineer',
          discipline: 'Transportation Infrastructure',
          infrastructureSector: 'Highways & Roads',
          location: 'Delhi',
          workMode: 'On-site',
          jobType: 'Full-time',
          requiredSkills: ['Civil 3D', 'Highway Geometric Design'],
          status: OpportunityStatus.PUBLISHED,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent user from tampering with a job belonging to another business', async () => {
      const intruderUserId = new Types.ObjectId().toString();
      const jobId = new Types.ObjectId().toString();
      const victimOrgId = new Types.ObjectId().toString();

      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(jobId),
        organizationId: new Types.ObjectId(victimOrgId),
      });

      // Intruder is not a member of victimOrgId
      mockMembershipModel.findOne.mockResolvedValue(null);

      await expect(
        oppService.updateStatus(
          intruderUserId,
          jobId,
          OpportunityStatus.CLOSED,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 5. APPLICATION SECURITY & OWNERSHIP (Section 10)
  // =========================================================================
  describe('5. Application Security & Anti-Tampering', () => {
    it('should forbid duplicate applications to the same active job', async () => {
      const candidateId = new Types.ObjectId().toString();
      const jobId = new Types.ObjectId().toString();

      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(jobId),
        title: 'BIM Coordinator',
        status: OpportunityStatus.PUBLISHED,
      });

      mockJobAppModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        jobId: new Types.ObjectId(jobId),
        candidateUserId: new Types.ObjectId(candidateId),
        status: JobApplicationStatus.SUBMITTED,
      });

      await expect(
        oppService.applyToJob(candidateId, jobId, {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should forbid Candidate B from withdrawing Candidate A application', async () => {
      const candidateAId = new Types.ObjectId().toString();
      const candidateBId = new Types.ObjectId().toString();
      const applicationId = new Types.ObjectId().toString();

      // Finding application for Candidate B returns null
      mockJobAppModel.findOne.mockResolvedValue(null);

      await expect(
        oppService.withdrawApplication(candidateBId, applicationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forbid applications to closed jobs', async () => {
      const candidateId = new Types.ObjectId().toString();
      const jobId = new Types.ObjectId().toString();

      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(jobId),
        status: OpportunityStatus.CLOSED,
      });

      await expect(
        oppService.applyToJob(candidateId, jobId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 6. AI MATCHING INTEGRATION & GROUNDING (Sections 11 & 12)
  // =========================================================================
  describe('6. AI Matching Grounding & Consistency Audit', () => {
    it('should NOT categorize a candidate with 2 years experience as HIGHLY_COMPATIBLE for a job requiring 5+ years', () => {
      const job = {
        jobId: 'job-1',
        title: 'Principal Geotechnical Engineer',
        discipline: 'Geotechnical Engineering',
        infrastructureSector: 'Tunnels & Underground',
        minYearsExperience: 5,
        maxYearsExperience: 10,
        requiredSkills: ['Slope Stability', 'Soil Mechanics'],
        preferredSkills: [],
        requiredSoftware: ['PLAXIS'],
        preferredSoftware: [],
        requiredCertifications: [],
        preferredCertifications: [],
        location: 'Mumbai',
        workMode: 'On-site',
        jobType: 'Full-time',
        experienceLevel: 'SENIOR',
      };

      const candidate = {
        userId: 'cand-1',
        name: 'Rahul Verma',
        primaryDiscipline: 'Geotechnical Engineering',
        infrastructureSectors: ['Tunnels & Underground'],
        yearsOfExperience: 2, // 2 years vs 5 years required
        structuredSkills: {
          technicalSkills: ['Slope Stability', 'Soil Mechanics'],
          softwareSkills: ['PLAXIS'],
          industrySkills: [],
          professionalSkills: [],
        },
        skills: ['Slope Stability', 'Soil Mechanics', 'PLAXIS'],
        certifications: [],
        location: 'Mumbai',
        preferredLocations: ['Mumbai'],
        workMode: 'On-site',
        experience: [],
        projects: [],
        careerPreferences: { openToOpportunities: true },
      };

      const match = calculateMatch(job as any, candidate as any);

      // System must not describe the candidate as fully eligible or highly compatible
      expect(match.passesHardRequirements).toBe(false);
      expect(match.hardRequirementFailures.some((f) => f.type === 'experience')).toBe(
        true,
      );
      expect(match.category).not.toBe(MatchCategory.HIGHLY_COMPATIBLE);
      expect(match.category).toBe(MatchCategory.POTENTIALLY_COMPATIBLE);
    });

    it('should report "Not listed" when attributes are absent rather than inventing evidence', () => {
      const job = {
        jobId: 'job-2',
        title: 'Metro Rail Systems Lead',
        discipline: 'Railway Systems',
        infrastructureSector: 'Transit & Metro',
        minYearsExperience: 4,
        maxYearsExperience: 8,
        requiredSkills: ['Signaling Systems'],
        preferredSkills: [],
        requiredSoftware: ['ETAP'],
        preferredSoftware: [],
        requiredCertifications: ['PMP'],
        preferredCertifications: [],
        location: 'Bengaluru',
        workMode: 'On-site',
        jobType: 'Full-time',
      };

      const minimalCandidate = {
        userId: 'cand-2',
        name: 'Ananya Roy',
        primaryDiscipline: '', // absent
        infrastructureSectors: [],
        yearsOfExperience: 0,
        structuredSkills: { technicalSkills: [], softwareSkills: [] },
        skills: [],
        certifications: [], // absent
        location: '',
        preferredLocations: [],
        experience: [],
        projects: [],
      };

      const match = calculateMatch(job as any, minimalCandidate as any);

      const certFailure = match.hardRequirementFailures.find(
        (f) => f.type === 'certification',
      );
      expect(certFailure).toBeDefined();
      expect(certFailure!.actual).toBe('Not listed');

      const discFailure = match.hardRequirementFailures.find(
        (f) => f.type === 'discipline',
      );
      expect(discFailure).toBeDefined();
      expect(discFailure!.actual).toBe('Not listed');
    });
  });

  // =========================================================================
  // 7. MARKET DATA PROVENANCE (Section 16)
  // =========================================================================
  describe('7. Market Data Grounding & Provenance', () => {
    it('should generate market snapshots with explicit observation period, population, and disclaimer', async () => {
      const mockJobs = [
        {
          title: 'Structural BIM Engineer',
          requiredSkills: ['Revit', 'Tekla'],
          preferredSkills: ['Dynamo'],
          requiredSoftware: ['Revit', 'Navisworks'],
          preferredSoftware: [],
          infrastructureSector: 'Bridges & Highways',
          location: 'Delhi NCR',
        },
        {
          title: 'Highway Project Manager',
          requiredSkills: ['P6 Primavera', 'Contract Management'],
          preferredSkills: [],
          requiredSoftware: ['Primavera P6'],
          preferredSoftware: [],
          infrastructureSector: 'Highways & Expressways',
          location: 'Mumbai',
        },
      ];

      mockOppModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockJobs),
        }),
      });

      const snapshot = await careerIntelService.generateMarketSnapshot();

      expect(snapshot.source).toBe('Zeitnah Infrastructure Network Platform');
      expect(snapshot.observationPeriod).toBe('Previous 90 days');
      expect(snapshot.population).toContain('active published infrastructure jobs');
      expect(snapshot.calculationMethod).toBeDefined();
      expect(snapshot.disclaimer).toContain(
        'This reflects Zeitnah platform demand and is not presented as universal industry truth',
      );
    });
  });
});
