import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProfileService } from './profile/profile.service';
import { OpportunitiesService } from './opportunities/opportunities.service';
import { User } from './auth/schemas/user.schema';
import { Recommendation } from './profile/schemas/recommendation.schema';
import {
  VerificationRequest,
  VerificationCategory,
  VerificationStatus,
} from './profile/schemas/verification-request.schema';
import {
  Project,
  ProjectVisibility,
} from './projects/schemas/project.schema';
import {
  Opportunity,
  OpportunityStatus,
} from './opportunities/schemas/opportunity.schema';
import {
  Organization,
  BusinessStatus,
  OrganizationVerificationStatus,
} from './organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationRole,
  MembershipStatus,
} from './organizations/schemas/organization-membership.schema';
import { SavedJob } from './opportunities/schemas/saved-job.schema';
import { JobApplication } from './opportunities/schemas/job-application.schema';
import {
  EmployerOpportunity,
  OpportunityInboxStatus,
  OpportunityDeclineReason,
} from './opportunities/schemas/employer-opportunity.schema';
import { UploadService } from '../common/aws/upload.service';
import { SignedUrlService } from '../common/aws/signed-url.service';
import { UsernameService } from './profile/services/username.service';
import { AuditLogsService } from './audit-logs/audit-logs.service';
import { NotificationsService } from './notifications/notifications.service';
import { ModerationService } from './moderation/moderation.service';

const makeQuery = (val: any) => {
  const p: any = Promise.resolve(val);
  p.populate = jest.fn().mockImplementation(() => makeQuery(val));
  p.sort = jest.fn().mockImplementation(() => makeQuery(val));
  p.skip = jest.fn().mockImplementation(() => makeQuery(val));
  p.limit = jest.fn().mockImplementation(() => makeQuery(val));
  p.lean = jest.fn().mockResolvedValue(val);
  p.exec = jest.fn().mockResolvedValue(val);
  return p;
};

describe('Phase 8 — Portfolio + Verification + Opportunity Inbox QA Suite', () => {
  let profileService: ProfileService;
  let oppService: OpportunitiesService;

  let mockUserModel: any;
  let mockProjectModel: any;
  let mockVerificationRequestModel: any;
  let mockOpportunityModel: any;
  let mockOrganizationModel: any;
  let mockMembershipModel: any;
  let mockEmployerOpportunityModel: any;
  let mockJobAppModel: any;
  let mockUploadService: any;
  let mockSignedUrlService: any;
  let mockNotificationsService: any;
  let mockModerationService: any;
  let mockAuditLogsService: any;

  const candidateId = new Types.ObjectId().toString();
  const recruiterId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();
  const businessId = new Types.ObjectId().toString();
  const jobId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockProjectModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue(true),
          ...dto,
        }),
      ),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockVerificationRequestModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue(true),
          auditLog: [],
          ...dto,
        }),
      ),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
    };

    mockOpportunityModel = {
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
    };

    mockOrganizationModel = {
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
    };

    mockMembershipModel = {
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
    };

    mockEmployerOpportunityModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue(true),
          auditLog: [],
          ...dto,
        }),
      ),
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockJobAppModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          ...dto,
        }),
      ),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
    };

    mockUploadService = {
      uploadFile: jest.fn().mockResolvedValue('uploaded-key'),
      deleteFile: jest.fn().mockResolvedValue(true),
    };

    mockSignedUrlService = {
      generateSignedImageUrl: jest
        .fn()
        .mockImplementation((k) => Promise.resolve(`https://cdn.zeitnah.com/${k}`)),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    mockModerationService = {
      hasBlockRelationship: jest.fn().mockResolvedValue(false),
    };

    mockAuditLogsService = {
      record: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        OpportunitiesService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Recommendation.name), useValue: {} },
        {
          provide: getModelToken(VerificationRequest.name),
          useValue: mockVerificationRequestModel,
        },
        { provide: getModelToken(Project.name), useValue: mockProjectModel },
        { provide: getModelToken(Opportunity.name), useValue: mockOpportunityModel },
        {
          provide: getModelToken(Organization.name),
          useValue: mockOrganizationModel,
        },
        {
          provide: getModelToken(OrganizationMembership.name),
          useValue: mockMembershipModel,
        },
        { provide: getModelToken(SavedJob.name), useValue: {} },
        { provide: getModelToken(JobApplication.name), useValue: mockJobAppModel },
        {
          provide: getModelToken(EmployerOpportunity.name),
          useValue: mockEmployerOpportunityModel,
        },
        { provide: UploadService, useValue: mockUploadService },
        { provide: SignedUrlService, useValue: mockSignedUrlService },
        { provide: UsernameService, useValue: {} },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ModerationService, useValue: mockModerationService },
      ],
    }).compile();

    profileService = module.get<ProfileService>(ProfileService);
    oppService = module.get<OpportunitiesService>(OpportunitiesService);
  });

  // =========================================================================
  // 1. PROFESSIONAL INFRASTRUCTURE PORTFOLIO TESTS
  // =========================================================================
  describe('1. Professional Portfolio System', () => {
    it('calculates portfolio completeness accurately with missing items', () => {
      const emptyUser: any = { portfolio: {} };
      const emptyProjects: any[] = [];
      const resEmpty = profileService.calculatePortfolioCompleteness(
        emptyUser,
        emptyProjects,
      );
      expect(resEmpty.completeness).toBe(0);
      expect(resEmpty.missingItems).toContain('Featured project');
      expect(resEmpty.missingItems).toContain('Professional resume / CV');
      expect(resEmpty.missingItems).toContain('At least 3 featured skills');

      const richUser: any = {
        portfolio: {
          featuredProjectIds: ['proj-1'],
          featuredSkills: ['Primavera P6', 'AutoCAD', 'Civil 3D'],
          featuredSoftware: ['Primavera P6', 'AutoCAD'],
          resume: { url: 'https://cdn.zeitnah.com/resume.pdf' },
          highlightedExperienceIds: ['exp-1'],
          customBio: 'Over 6 years of EPC highway planning experience.',
        },
        experience: [{ id: 'exp-1', role: 'Planning Engineer' }],
      };
      const richProjects: any[] = [
        {
          _id: 'proj-1',
          featured: true,
          media: ['img1.jpg'],
        },
      ];
      const resRich = profileService.calculatePortfolioCompleteness(
        richUser,
        richProjects,
      );
      expect(resRich.completeness).toBe(100);
      expect(resRich.missingItems).toHaveLength(0);
    });

    it('updates portfolio curation and publishes portfolio state', async () => {
      const mockCandidate: any = {
        _id: new Types.ObjectId(candidateId),
        portfolio: {
          published: false,
          featuredSkills: [],
          featuredSoftware: [],
          customHeadline: '',
        },
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(mockCandidate);
      mockProjectModel.find.mockReturnValue(makeQuery([]));

      const updateRes = await profileService.updatePortfolio(candidateId, {
        published: true,
        customHeadline: 'Lead Highways Planning Engineer',
        featuredSkills: ['Primavera P6', 'BIM Coordination', 'Cost Estimation'],
        featuredSoftware: ['Primavera P6', 'AutoCAD Civil 3D'],
        featuredProjectIds: ['proj-101'],
      });

      expect(updateRes.success).toBe(true);
      expect(mockCandidate.portfolio.published).toBe(true);
      expect(mockCandidate.portfolio.customHeadline).toBe(
        'Lead Highways Planning Engineer',
      );
      expect(mockCandidate.portfolio.featuredSkills).toContain('Primavera P6');
      expect(mockProjectModel.updateMany).toHaveBeenCalled();
    });

    it('protects private projects and private media from public viewers', async () => {
      const candidateUser = {
        _id: new Types.ObjectId(candidateId),
        name: 'Rahul Kumar',
        username: 'rahulk',
        portfolio: { published: true, resume: { visibility: 'PRIVATE' } },
        verifications: {},
      };
      mockUserModel.findById.mockReturnValue(makeQuery(candidateUser));

      const projects = [
        {
          _id: new Types.ObjectId(),
          title: 'Public Metro Project',
          visibility: ProjectVisibility.PUBLIC,
          portfolioMedia: [
            { id: 'm1', name: 'Site Photo', visibility: 'PUBLIC' },
            { id: 'm2', name: 'Internal Drawing', visibility: 'PRIVATE' },
          ],
        },
        {
          _id: new Types.ObjectId(),
          title: 'Confidential Defense Tunnel',
          visibility: ProjectVisibility.PRIVATE,
          portfolioMedia: [],
        },
      ];
      mockProjectModel.find.mockReturnValue(makeQuery(projects));

      // Public viewer (isOwner = false, role = student/guest)
      const portfolio = await profileService.getPortfolio(
        candidateId,
        false,
        'guest-id',
        'student',
      );

      expect(portfolio.allProjects).toHaveLength(1);
      expect(portfolio.allProjects[0].title).toBe('Public Metro Project');
      expect(portfolio.allProjects[0].portfolioMedia).toHaveLength(1);
      expect(portfolio.allProjects[0].portfolioMedia[0].name).toBe('Site Photo');
      expect(portfolio.resume).toBeNull(); // Private resume is hidden!
    });

    it('enforces resume upload validation and allows recruiter access only when permitted', async () => {
      const candidateUser = {
        _id: new Types.ObjectId(candidateId),
        portfolio: {
          resume: {
            url: 'https://cdn.zeitnah.com/resumes/c1.pdf',
            fileKey: 'resumes/c1.pdf',
            filename: 'Resume.pdf',
            visibility: 'RECRUITERS',
          },
        },
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(candidateUser);

      // Student/Anonymous non-recruiter gets ForbiddenException
      await expect(
        profileService.getResumeDownloadUrl(
          candidateId,
          'student-id',
          'student',
        ),
      ).rejects.toThrow(ForbiddenException);

      // Recruiter gets authorized signed download URL
      const recruiterAccess = await profileService.getResumeDownloadUrl(
        candidateId,
        recruiterId,
        'recruiter',
      );
      expect(recruiterAccess.success).toBe(true);
      expect(recruiterAccess.downloadUrl).toContain('resumes/c1.pdf');
    });

    it('rejects non-PDF files for resume upload', async () => {
      const candidateUser = {
        _id: new Types.ObjectId(candidateId),
        portfolio: {},
      };
      mockUserModel.findById.mockResolvedValue(candidateUser);

      const invalidFile: any = {
        mimetype: 'image/png',
        originalname: 'photo.png',
        size: 500,
        buffer: Buffer.from('fake'),
      };

      await expect(
        profileService.uploadResume(candidateId, invalidFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 2. PROFILE & CREDENTIAL VERIFICATION TESTS
  // =========================================================================
  describe('2. Verification System', () => {
    it('creates verification request and transitions user category state to PENDING', async () => {
      const candidateUser = {
        _id: new Types.ObjectId(candidateId),
        verifications: {
          professional: { status: 'UNVERIFIED' },
        },
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(candidateUser);
      mockVerificationRequestModel.findOne.mockReturnValue(makeQuery(null));

      const res = await profileService.submitVerificationRequest(
        candidateId,
        {
          category: VerificationCategory.PROFESSIONAL,
          documentType: 'LICENSE',
          documentNumber: 'CIVIL-REG-98124',
          organizationName: 'Indian Institution of Engineers',
          notes: 'Registered Chartered Civil Engineer',
        },
        [
          {
            originalname: 'license.pdf',
            mimetype: 'application/pdf',
            size: 2048,
            buffer: Buffer.from('data'),
          } as any,
        ],
      );

      expect(res.success).toBe(true);
      expect(mockVerificationRequestModel.create).toHaveBeenCalled();
      expect(candidateUser.verifications.professional.status).toBe('PENDING');
    });

    it('prohibits duplicate pending verification requests for the same category', async () => {
      const candidateUser = {
        _id: new Types.ObjectId(candidateId),
        verifications: { identity: { status: 'PENDING' } },
      };
      mockUserModel.findById.mockResolvedValue(candidateUser);
      mockVerificationRequestModel.findOne.mockReturnValue(
        makeQuery({ _id: new Types.ObjectId(), status: VerificationStatus.PENDING }),
      );

      await expect(
        profileService.submitVerificationRequest(candidateId, {
          category: VerificationCategory.IDENTITY,
          documentType: 'PASSPORT',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('strictly prohibits user self-request of Educator role verification', async () => {
      const candidateUser = {
        _id: new Types.ObjectId(candidateId),
        verifications: {},
      };
      mockUserModel.findById.mockResolvedValue(candidateUser);

      await expect(
        profileService.submitVerificationRequest(candidateId, {
          category: VerificationCategory.EDUCATOR,
        }),
      ).rejects.toThrow(
        /Educator role is administrator controlled and cannot be requested/,
      );
    });

    it('allows administrator to verify credential and updates category badges and audit log', async () => {
      const requestId = new Types.ObjectId().toString();
      const mockReq = {
        _id: new Types.ObjectId(requestId),
        userId: new Types.ObjectId(candidateId),
        category: VerificationCategory.PROFESSIONAL,
        status: VerificationStatus.PENDING,
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockVerificationRequestModel.findById.mockResolvedValue(mockReq);

      const candidateUser = {
        _id: new Types.ObjectId(candidateId),
        verifications: {
          professional: { status: 'PENDING' },
        },
        verification: { status: 'UNVERIFIED' },
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(candidateUser);

      const reviewRes = await profileService.adminReviewVerificationRequest(
        adminId,
        requestId,
        {
          status: VerificationStatus.VERIFIED,
          title: 'Senior Chartered Engineer',
          affiliation: 'Institution of Engineers',
          validUntil: new Date('2028-01-01'),
        },
      );

      expect(reviewRes.success).toBe(true);
      expect(mockReq.status).toBe(VerificationStatus.VERIFIED);
      expect(candidateUser.verifications.professional.status).toBe('VERIFIED');
      expect(candidateUser.verification.status).toBe('VERIFIED'); // Legacy compatibility synced
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('protects private verification evidence documents from non-owner and recruiters', async () => {
      const requestId = new Types.ObjectId().toString();
      const mockReq = {
        _id: new Types.ObjectId(requestId),
        userId: new Types.ObjectId(candidateId),
        evidenceFiles: [
          {
            id: 'file-1',
            name: 'ConfidentialPassport.pdf',
            fileKey: 'evidence/private/c1-passport.pdf',
          },
        ],
      };
      mockVerificationRequestModel.findById.mockResolvedValue(mockReq);

      // Recruiter / stranger attempts to access candidate's private passport
      await expect(
        profileService.getVerificationEvidenceUrl(
          recruiterId,
          'recruiter',
          requestId,
          'file-1',
        ),
      ).rejects.toThrow(ForbiddenException);

      // Candidate owner or Admin is allowed
      const ownerRes = await profileService.getVerificationEvidenceUrl(
        candidateId,
        'student',
        requestId,
        'file-1',
      );
      expect(ownerRes.success).toBe(true);
      expect(ownerRes.downloadUrl).toContain('c1-passport.pdf');
    });
  });

  // =========================================================================
  // 3. EMPLOYER OPPORTUNITY OUTREACH & CANDIDATE INBOX TESTS
  // =========================================================================
  describe('3. Employer Opportunity & Candidate Inbox System', () => {
    it('allows verified business recruiter to send opportunity to discoverable candidate', async () => {
      mockUserModel.findById.mockImplementation((id: string) => {
        if (id === recruiterId) {
          return makeQuery({
            _id: new Types.ObjectId(recruiterId),
            account_Status: { isBlocked: false },
          });
        }
        if (id === candidateId) {
          return makeQuery({
            _id: new Types.ObjectId(candidateId),
            name: 'Rahul Kumar',
            account_Status: { isBlocked: false, isDeleted: false },
            careerPreferences: { recruiterDiscovery: 'VISIBLE_ALL_RECRUITERS' },
          });
        }
        return makeQuery(null);
      });

      mockOrganizationModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(businessId),
          name: 'L&T Infrastructure',
          status: BusinessStatus.APPROVED,
          verificationStatus: OrganizationVerificationStatus.VERIFIED,
        }),
      );

      mockMembershipModel.findOne.mockReturnValue(
        makeQuery({
          organizationId: new Types.ObjectId(businessId),
          userId: new Types.ObjectId(recruiterId),
          role: OrganizationRole.RECRUITER,
          status: MembershipStatus.ACTIVE,
        }),
      );

      mockOpportunityModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(jobId),
          organizationId: new Types.ObjectId(businessId),
          title: 'Planning Engineer (Highways)',
          status: OpportunityStatus.PUBLISHED,
        }),
      );

      mockEmployerOpportunityModel.findOne.mockReturnValue(makeQuery(null));

      const sendRes = await oppService.sendEmployerOpportunity(recruiterId, {
        businessId,
        jobId,
        candidateUserId: candidateId,
        message: 'Your highway projects align with our EPC package.',
      });

      expect(sendRes.success).toBe(true);
      expect(mockEmployerOpportunityModel.create).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: new Types.ObjectId(candidateId),
          actorId: recruiterId,
          title: 'New Career Opportunity',
        }),
      );
    });

    it('rejects sending opportunity if candidate is NOT_DISCOVERABLE', async () => {
      mockUserModel.findById.mockImplementation((id: string) => {
        if (id === recruiterId) {
          return makeQuery({
            _id: new Types.ObjectId(recruiterId),
            account_Status: { isBlocked: false },
          });
        }
        if (id === candidateId) {
          return makeQuery({
            _id: new Types.ObjectId(candidateId),
            account_Status: { isBlocked: false, isDeleted: false },
            careerPreferences: { recruiterDiscovery: 'NOT_DISCOVERABLE' },
          });
        }
        return makeQuery(null);
      });

      await expect(
        oppService.sendEmployerOpportunity(recruiterId, {
          businessId,
          jobId,
          candidateUserId: candidateId,
          message: 'Hello',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents duplicate active opportunities for same job and candidate', async () => {
      mockUserModel.findById.mockImplementation((id: string) => {
        if (id === recruiterId) {
          return makeQuery({ _id: new Types.ObjectId(recruiterId) });
        }
        if (id === candidateId) {
          return makeQuery({
            _id: new Types.ObjectId(candidateId),
            careerPreferences: { recruiterDiscovery: 'VISIBLE_ALL_RECRUITERS' },
          });
        }
        return makeQuery(null);
      });

      mockOrganizationModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(businessId),
          status: BusinessStatus.APPROVED,
          verificationStatus: OrganizationVerificationStatus.VERIFIED,
        }),
      );

      mockMembershipModel.findOne.mockReturnValue(
        makeQuery({ role: OrganizationRole.OWNER, status: MembershipStatus.ACTIVE }),
      );

      mockOpportunityModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(jobId),
          organizationId: new Types.ObjectId(businessId),
          status: OpportunityStatus.PUBLISHED,
        }),
      );

      // Existing active opportunity exists in 'sent' state
      mockEmployerOpportunityModel.findOne.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(),
          status: OpportunityInboxStatus.SENT,
        }),
      );

      await expect(
        oppService.sendEmployerOpportunity(recruiterId, {
          businessId,
          jobId,
          candidateUserId: candidateId,
          message: 'Hello again',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('prohibits sending opportunities for closed or archived jobs', async () => {
      mockUserModel.findById.mockImplementation((id: string) => {
        if (id === recruiterId) {
          return makeQuery({ _id: new Types.ObjectId(recruiterId) });
        }
        if (id === candidateId) {
          return makeQuery({
            _id: new Types.ObjectId(candidateId),
            careerPreferences: { recruiterDiscovery: 'VISIBLE_ALL_RECRUITERS' },
          });
        }
        return makeQuery(null);
      });

      mockOrganizationModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(businessId),
          status: BusinessStatus.APPROVED,
          verificationStatus: OrganizationVerificationStatus.VERIFIED,
        }),
      );
      mockMembershipModel.findOne.mockReturnValue(
        makeQuery({ role: OrganizationRole.OWNER, status: MembershipStatus.ACTIVE }),
      );

      // Closed job
      mockOpportunityModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(jobId),
          organizationId: new Types.ObjectId(businessId),
          status: OpportunityStatus.CLOSED,
        }),
      );

      await expect(
        oppService.sendEmployerOpportunity(recruiterId, {
          businessId,
          jobId,
          candidateUserId: candidateId,
          message: 'Hello',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('transitions opportunity to INTERESTED when candidate accepts, notifying recruiter without creating application automatically', async () => {
      const oppId = new Types.ObjectId().toString();
      const mockOpp = {
        _id: new Types.ObjectId(oppId),
        candidateUserId: new Types.ObjectId(candidateId),
        recruiterUserId: new Types.ObjectId(recruiterId),
        jobId: new Types.ObjectId(jobId),
        roleTitle: 'Bridge Engineer',
        status: OpportunityInboxStatus.SENT,
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockEmployerOpportunityModel.findById.mockResolvedValue(mockOpp);

      const res = await oppService.markOpportunityInterested(candidateId, oppId);

      expect(res.success).toBe(true);
      expect(mockOpp.status).toBe(OpportunityInboxStatus.INTERESTED);
      expect(res.actions.canApply).toBe(true);
      expect(res.actions.canMessage).toBe(true);
      // Verify job application was NOT created automatically
      expect(mockJobAppModel.create).not.toHaveBeenCalled();
      // Recruiter notified
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: new Types.ObjectId(recruiterId),
          title: 'Candidate Expressed Interest',
        }),
      );
    });

    it('records decline reason and note when candidate declines', async () => {
      const oppId = new Types.ObjectId().toString();
      const mockOpp: any = {
        _id: new Types.ObjectId(oppId),
        candidateUserId: new Types.ObjectId(candidateId),
        recruiterUserId: new Types.ObjectId(recruiterId),
        roleTitle: 'Site Supervisor',
        status: OpportunityInboxStatus.SENT,
        declineReason: '',
        declineNote: '',
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockEmployerOpportunityModel.findById.mockResolvedValue(mockOpp);

      const res = await oppService.declineOpportunity(candidateId, oppId, {
        reason: OpportunityDeclineReason.LOCATION,
        note: 'Relocation to Mumbai is not feasible at this time.',
      });

      expect(res.success).toBe(true);
      expect(mockOpp.status).toBe(OpportunityInboxStatus.DECLINED);
      expect(mockOpp.declineReason).toBe('location');
      expect(mockOpp.declineNote).toContain('Relocation to Mumbai');
    });

    it('archives opportunity when candidate chooses to archive', async () => {
      const oppId = new Types.ObjectId().toString();
      const mockOpp = {
        _id: new Types.ObjectId(oppId),
        candidateUserId: new Types.ObjectId(candidateId),
        status: OpportunityInboxStatus.DECLINED,
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockEmployerOpportunityModel.findById.mockResolvedValue(mockOpp);

      const res = await oppService.archiveOpportunity(candidateId, oppId);

      expect(res.success).toBe(true);
      expect(mockOpp.status).toBe(OpportunityInboxStatus.ARCHIVED);
    });
  });

  // =========================================================================
  // 4. FULL INTEGRATION CHAIN TEST
  // =========================================================================
  describe('4. Complete End-to-End Workflow Integration', () => {
    it('executes full chain: Recruiter -> Send Opportunity -> Inbox -> Interested -> Message -> Explicit Apply', async () => {
      // 1. Recruiter verifies candidate's public portfolio & verified badge
      const candidateUser = {
        _id: new Types.ObjectId(candidateId),
        name: 'Arun Varma',
        username: 'arunv',
        verifications: {
          professional: { status: 'VERIFIED', title: 'Chartered Highway Engineer' },
        },
        careerPreferences: { recruiterDiscovery: 'VISIBLE_ALL_RECRUITERS' },
        portfolio: { published: true },
      };
      mockUserModel.findById.mockImplementation((id: string) => {
        if (id === candidateId) return makeQuery(candidateUser);
        if (id === recruiterId) return makeQuery({ _id: new Types.ObjectId(recruiterId) });
        return makeQuery(null);
      });
      mockProjectModel.find.mockReturnValue(makeQuery([]));

      const portfolio = await profileService.getPortfolio(
        candidateId,
        false,
        recruiterId,
        'recruiter',
      );
      expect(portfolio.hero.badges.professional).toBe(true);

      // 2. Recruiter sends opportunity
      mockOrganizationModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(businessId),
          name: 'Afcons Infrastructure',
          status: BusinessStatus.APPROVED,
          verificationStatus: OrganizationVerificationStatus.VERIFIED,
        }),
      );
      mockMembershipModel.findOne.mockReturnValue(
        makeQuery({ role: OrganizationRole.RECRUITER, status: MembershipStatus.ACTIVE }),
      );
      mockOpportunityModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(jobId),
          organizationId: new Types.ObjectId(businessId),
          title: 'Senior Highway Planning Specialist',
          status: OpportunityStatus.PUBLISHED,
        }),
      );
      mockEmployerOpportunityModel.findOne.mockReturnValue(makeQuery(null));

      const sendResult = await oppService.sendEmployerOpportunity(recruiterId, {
        businessId,
        jobId,
        candidateUserId: candidateId,
        message: 'We are impressed by your infrastructure portfolio.',
      });
      expect(sendResult.success).toBe(true);
      const sentOppId = sendResult.opportunity._id.toString();

      // 3. Candidate receives in Inbox & opens detail (marks viewed)
      const mockSavedOpp = {
        _id: new Types.ObjectId(sentOppId),
        candidateUserId: new Types.ObjectId(candidateId),
        recruiterUserId: new Types.ObjectId(recruiterId),
        jobId: new Types.ObjectId(jobId),
        roleTitle: 'Senior Highway Planning Specialist',
        status: OpportunityInboxStatus.SENT,
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockEmployerOpportunityModel.findById.mockReturnValue(makeQuery(mockSavedOpp));

      const openedOpp = await oppService.getCandidateOpportunityById(
        candidateId,
        sentOppId,
      );
      expect(openedOpp.status).toBe(OpportunityInboxStatus.VIEWED);

      // 4. Candidate marks Interested
      const interestRes = await oppService.markOpportunityInterested(
        candidateId,
        sentOppId,
      );
      expect(interestRes.success).toBe(true);
      expect(interestRes.opportunity.status).toBe(OpportunityInboxStatus.INTERESTED);

      // 5. Candidate explicitly applies to job (and ONLY now is application created)
      mockOpportunityModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(jobId),
          organizationId: new Types.ObjectId(businessId),
          status: OpportunityStatus.PUBLISHED,
        }),
      );
      mockJobAppModel.findOne.mockReturnValue(makeQuery(null));

      const appRes: any = await oppService.applyToJob(candidateId, jobId, {
        coverNote: 'Excited about this opportunity!',
        resumeUrl: 'https://cdn.zeitnah.com/resumes/my-resume.pdf',
      });
      expect(appRes).toBeDefined();
      expect(mockJobAppModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: new Types.ObjectId(jobId),
          candidateUserId: new Types.ObjectId(candidateId),
        }),
      );
    });
  });
});
