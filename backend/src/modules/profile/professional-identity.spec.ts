import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { ProfessionalCatalogueService } from './services/professional-catalogue.service';
import {
  PROFESSIONAL_DEPARTMENTS,
  PROFESSIONAL_CATALOGUE_VERSION,
  getAllDepartments,
  getDepartmentById,
  getTitleById,
  getCatalogueSummary,
} from './constants/professional-catalogue';
import { User } from '../auth/schemas/user.schema';
import { Recommendation } from './schemas/recommendation.schema';
import { UploadService } from '../../common/aws/upload.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { UsernameService } from './services/username.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('Professional Identity Integration (Phase 2)', () => {
  let profileService: ProfileService;
  let catalogueService: ProfessionalCatalogueService;
  let controller: ProfileController;
  let mockUserModel: any;
  let mockRecommendationModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    mockRecommendationModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
      findOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'rec_123' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        ProfileService,
        ProfessionalCatalogueService,
        UsernameService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Recommendation.name),
          useValue: mockRecommendationModel,
        },
        {
          provide: UploadService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue(true),
            deleteFile: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SignedUrlService,
          useValue: {
            generateSignedImageUrl: jest
              .fn()
              .mockImplementation((k) => `https://signed.cdn/${k}`),
          },
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    profileService = module.get<ProfileService>(ProfileService);
    catalogueService = module.get<ProfessionalCatalogueService>(ProfessionalCatalogueService);
    controller = module.get<ProfileController>(ProfileController);
  });

  // =========================================================================
  // 1. Catalogue Response Contains All 18 Departments & 254 Title Occurrences
  // =========================================================================
  describe('1. Catalogue Completeness & Integrity', () => {
    it('should return version 2026.1 and exactly 18 departments', () => {
      const catalogue = catalogueService.getCatalogue();
      expect(catalogue.version).toBe(PROFESSIONAL_CATALOGUE_VERSION);
      expect(catalogue.version).toBe('2026.1');
      expect(catalogue.departments).toHaveLength(18);
      expect(catalogue.summary.totalDepartments).toBe(18);
    });

    it('should contain exactly 254 total title occurrences across all departments', () => {
      const catalogue = catalogueService.getCatalogue();
      const totalTitles = catalogue.departments.reduce(
        (sum, dept) => sum + dept.titles.length,
        0,
      );
      expect(totalTitles).toBe(254);
      expect(catalogue.summary.totalTitles).toBe(254);
    });

    it('should expose GET /api/profile/catalogue via ProfileController returning 18 departments and 254 titles', () => {
      const response = controller.getCatalogue();
      expect(response.version).toBe('2026.1');
      expect(response.departments).toHaveLength(18);
      expect(response.summary.totalDepartments).toBe(18);
      expect(response.summary.totalTitles).toBe(254);
    });
  });

  // =========================================================================
  // 2. Duplicate Labels in Different Departments Remain Distinct Options
  // =========================================================================
  describe('2. Repeated Labels Disambiguation', () => {
    it('should keep "Project manager" distinct across Civil, Mech, Elect, and Inst departments', () => {
      const civilPm = getTitleById('civil-engineering', 'civil-engineering:project-manager');
      const mechPm = getTitleById('mechanical-engineering', 'mechanical-engineering:project-manager');
      const electPm = getTitleById('electrical-engineering', 'electrical-engineering:project-manager');
      const instPm = getTitleById('instrumentation-engineering', 'instrumentation-engineering:project-manager');

      expect(civilPm).toBeDefined();
      expect(mechPm).toBeDefined();
      expect(electPm).toBeDefined();
      expect(instPm).toBeDefined();

      expect(civilPm?.id).toBe('civil-engineering:project-manager');
      expect(mechPm?.id).toBe('mechanical-engineering:project-manager');
      expect(electPm?.id).toBe('electrical-engineering:project-manager');
      expect(instPm?.id).toBe('instrumentation-engineering:project-manager');

      expect(civilPm?.id).not.toBe(mechPm?.id);
      expect(civilPm?.label).toBe('Project manager');
      expect(mechPm?.label).toBe('Project manager');
    });

    it('should keep "Welding Inspector" distinct between Mechanical and QA/QC', () => {
      const mechWelding = getTitleById('mechanical-engineering', 'mechanical-engineering:welding-inspector');
      const qawelding = getTitleById('qa-qc', 'qa-qc:welding-inspector');

      expect(mechWelding).toBeDefined();
      expect(qawelding).toBeDefined();
      expect(mechWelding?.id).not.toBe(qawelding?.id);
      expect(mechWelding?.id).toBe('mechanical-engineering:welding-inspector');
      expect(qawelding?.id).toBe('qa-qc:welding-inspector');
    });

    it('should keep "Marine surveyor" distinct between Land Surveying and Offshore Operations', () => {
      const landMarine = getTitleById('land-surveying-geomatics', 'land-surveying-geomatics:marine-surveyor');
      const offshoreMarine = getTitleById('offshore-operations-marine', 'offshore-operations-marine:marine-surveyor');

      expect(landMarine).toBeDefined();
      expect(offshoreMarine).toBeDefined();
      expect(landMarine?.id).not.toBe(offshoreMarine?.id);
    });
  });

  // =========================================================================
  // 3. Valid Predefined Department/Title Combinations are Accepted
  // =========================================================================
  describe('3. Predefined Department & Title Resolution', () => {
    it('should accept and resolve valid predefined department and title', () => {
      const resolved = catalogueService.validateAndResolveIdentity({
        departmentId: 'civil-engineering',
        titleId: 'civil-engineering:site-engineer-civil',
      });

      expect(resolved).toEqual({
        departmentId: 'civil-engineering',
        departmentName: 'Civil Engineering',
        titleId: 'civil-engineering:site-engineer-civil',
        titleName: 'Site Engineer (civil)',
        isCustomTitle: false,
        isLegacyTitle: false,
        catalogueVersion: '2026.1',
      });
    });

    it('should persist predefined identity and synchronize currentRole in updateProfile', async () => {
      const mockUser: any = {
        _id: 'user_123',
        name: 'Riyas Developer',
        headline: 'Lead Architect',
        currentRole: 'Old Role',
        professionalIdentity: null,
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: function () {
          return { ...this };
        },
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await profileService.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:site-engineer-civil',
        },
      });

      expect(mockUser.professionalIdentity).toMatchObject({
        departmentId: 'civil-engineering',
        departmentName: 'Civil Engineering',
        titleId: 'civil-engineering:site-engineer-civil',
        titleName: 'Site Engineer (civil)',
        isCustomTitle: false,
        isLegacyTitle: false,
        catalogueVersion: '2026.1',
      });
      expect(mockUser.professionalIdentity.updatedAt).toBeInstanceOf(Date);
      // currentRole MUST be synchronized
      expect(mockUser.currentRole).toBe('Site Engineer (civil)');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.user.currentRole).toBe('Site Engineer (civil)');
    });
  });

  // =========================================================================
  // 4. Invalid Department IDs and Title IDs are Rejected
  // =========================================================================
  describe('4. Invalid Department IDs and Title IDs Rejection', () => {
    it('should reject missing departmentId', () => {
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: '',
          titleId: 'civil-engineering:site-engineer',
        });
      }).toThrow(BadRequestException);
    });

    it('should reject non-existent departmentId', () => {
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: 'non-existent-dept',
          titleId: 'civil-engineering:site-engineer',
        });
      }).toThrow(/Invalid department ID/);
    });

    it('should reject non-existent titleId in valid department', () => {
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:quantum-teleporter',
        });
      }).toThrow(/Invalid title ID/);
    });
  });

  // =========================================================================
  // 5. Predefined Title Belonging to Another Department is Rejected
  // =========================================================================
  describe('5. Cross-Department Title Invalidation', () => {
    it('should reject a title ID belonging to another department and report diagnostic', () => {
      // 'architectural-design:architectural-cad-draftsman' belongs to 'architectural-design', not 'civil-engineering'
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          titleId: 'architectural-design:architectural-cad-draftsman',
        });
      }).toThrow(/belongs to department 'Architectural Design', not 'Civil Engineering'/);
    });
  });

  // =========================================================================
  // 6. Valid Custom Titles are Accepted and Preserved
  // =========================================================================
  describe('6. Custom Titles Validation & Handling', () => {
    it('should accept valid custom title and set titleId to null', () => {
      const resolved = catalogueService.validateAndResolveIdentity({
        departmentId: 'civil-engineering',
        customTitle: 'Infrastructure Systems Specialist',
        isCustomTitle: true,
      });

      expect(resolved).toEqual({
        departmentId: 'civil-engineering',
        departmentName: 'Civil Engineering',
        titleId: null,
        titleName: 'Infrastructure Systems Specialist',
        isCustomTitle: true,
        isLegacyTitle: false,
        catalogueVersion: '2026.1',
      });
    });

    it('should accept custom title via titleName field when isCustomTitle is true', () => {
      const resolved = catalogueService.validateAndResolveIdentity({
        departmentId: 'process-engineering-department',
        titleName: 'District Cooling Auditor',
        isCustomTitle: true,
      });

      expect(resolved.isCustomTitle).toBe(true);
      expect(resolved.titleId).toBeNull();
      expect(resolved.titleName).toBe('District Cooling Auditor');
    });

    it('should keep custom title as custom even when its text matches a predefined title', () => {
      // Even if text matches 'Site Engineer', user explicitly flagged custom
      const resolved = catalogueService.validateAndResolveIdentity({
        departmentId: 'civil-engineering',
        customTitle: 'Site Engineer',
        isCustomTitle: true,
      });

      expect(resolved.isCustomTitle).toBe(true);
      expect(resolved.titleId).toBeNull();
      expect(resolved.titleName).toBe('Site Engineer');
    });

    it('should persist custom title and synchronize currentRole in updateProfile', async () => {
      const mockUser: any = {
        _id: 'user_123',
        name: 'Riyas Developer',
        headline: 'Lead Architect',
        currentRole: 'Old Role',
        professionalIdentity: null,
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: function () {
          return { ...this };
        },
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await profileService.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Coastal Structure Specialist',
          isCustomTitle: true,
        },
      });

      expect(mockUser.professionalIdentity.isCustomTitle).toBe(true);
      expect(mockUser.professionalIdentity.titleId).toBeNull();
      expect(mockUser.professionalIdentity.titleName).toBe('Coastal Structure Specialist');
      expect(mockUser.currentRole).toBe('Coastal Structure Specialist');
    });
  });

  // =========================================================================
  // 7. Empty, Whitespace-only, Oversized, or Malformed Custom Titles Rejected
  // =========================================================================
  describe('7. Custom Title Edge Cases & Rejection', () => {
    it('should reject empty custom title', () => {
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          customTitle: '',
          isCustomTitle: true,
        });
      }).toThrow(/Custom title cannot be empty/);
    });

    it('should reject whitespace-only custom title', () => {
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          customTitle: '     ',
          isCustomTitle: true,
        });
      }).toThrow(/Custom title cannot be empty/);
    });

    it('should reject oversized custom title exceeding 100 characters', () => {
      const longTitle = 'A'.repeat(101);
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          customTitle: longTitle,
          isCustomTitle: true,
        });
      }).toThrow(/must not exceed 100 characters/);
    });

    it('should reject custom title with HTML tags', () => {
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          customTitle: 'Site Engineer <script>alert(1)</script>',
          isCustomTitle: true,
        });
      }).toThrow(/must be single-line plain text without HTML/);
    });

    it('should reject custom title with newlines', () => {
      expect(() => {
        catalogueService.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          customTitle: 'Site Engineer\nSpecialist',
          isCustomTitle: true,
        });
      }).toThrow(/must be single-line plain text without HTML/);
    });
  });

  // =========================================================================
  // 8. Failed Validation Leaves Existing Identity Unchanged (Atomic Updates)
  // =========================================================================
  describe('8. Atomic Update & Pre-Validation Guard', () => {
    it('should not alter existing profile if professional identity validation fails', async () => {
      const initialIdentity = {
        departmentId: 'civil-engineering',
        departmentName: 'Civil Engineering',
        titleId: 'civil-engineering:site-engineer',
        titleName: 'Site Engineer',
        isCustomTitle: false,
        isLegacyTitle: false,
        catalogueVersion: '2026.1',
        updatedAt: new Date('2026-01-01'),
      };
      const mockUser: any = {
        _id: 'user_123',
        name: 'Original Name',
        currentRole: 'Site Engineer',
        professionalIdentity: { ...initialIdentity },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: function () {
          return { ...this };
        },
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Attempt invalid cross-department update
      await expect(
        profileService.updateProfile('user_123', {
          name: 'Attempted Name Change',
          professionalIdentity: {
            departmentId: 'civil-engineering',
            titleId: 'architectural-design:architectural-draftsman',
          },
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify that user fields and save were untouched
      expect(mockUser.name).toBe('Original Name');
      expect(mockUser.currentRole).toBe('Site Engineer');
      expect(mockUser.professionalIdentity.titleId).toBe('civil-engineering:site-engineer');
      expect(mockUser.save).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. Failed Persistence Does Not Result in Partial Department/Title Update
  // =========================================================================
  describe('9. Persistence Failure Safety', () => {
    it('should bubble persistence error without corrupting database state', async () => {
      const mockUser: any = {
        _id: 'user_123',
        currentRole: 'Original Role',
        professionalIdentity: null,
        save: jest.fn().mockRejectedValue(new Error('Database disk error')),
        markModified: jest.fn(),
        toObject: function () {
          return { ...this };
        },
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile('user_123', {
          professionalIdentity: {
            departmentId: 'civil-engineering',
            titleId: 'civil-engineering:site-engineer-civil',
          },
        }),
      ).rejects.toThrow('Database disk error');
    });
  });

  // =========================================================================
  // 10. Legacy Profiles Retain Existing currentRole
  // =========================================================================
  describe('10. Legacy Profile Compatibility', () => {
    it('should return legacy profile representation in getMe when professionalIdentity is null', async () => {
      const mockUser: any = {
        _id: 'user_legacy',
        username: 'legacy_user',
        currentRole: 'Senior Structural Consultant',
        professionalIdentity: null,
        headline: 'Civil infrastructure specialist',
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: function () {
          return {
            _id: this._id,
            username: this.username,
            currentRole: this.currentRole,
            professionalIdentity: this.professionalIdentity,
            headline: this.headline,
          };
        },
      };
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await profileService.getMe('user_legacy');
      expect(response.user.currentRole).toBe('Senior Structural Consultant');
      expect(response.user.professionalIdentity).toEqual({
        departmentId: null,
        departmentName: null,
        titleId: null,
        titleName: 'Senior Structural Consultant',
        isCustomTitle: false,
        isLegacyTitle: true,
        catalogueVersion: null,
        updatedAt: null,
      });
    });

    it('should return legacy profile representation in getPublicProfile when professionalIdentity is null', async () => {
      const mockUser: any = {
        _id: 'user_legacy',
        username: 'legacy_user',
        currentRole: 'Senior Mechanical Inspector',
        professionalIdentity: null,
        headline: 'Heavy equipment inspector',
        toObject: function () {
          return {
            _id: this._id,
            username: this.username,
            currentRole: this.currentRole,
            professionalIdentity: this.professionalIdentity,
            headline: this.headline,
          };
        },
      };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await profileService.getPublicProfile('legacy_user');
      expect(response.user.currentRole).toBe('Senior Mechanical Inspector');
      expect(response.user.professionalIdentity).toEqual({
        departmentId: null,
        departmentName: null,
        titleId: null,
        titleName: 'Senior Mechanical Inspector',
        isCustomTitle: false,
        isLegacyTitle: true,
        catalogueVersion: null,
        updatedAt: null,
      });
    });
  });

  // =========================================================================
  // 11. Unrelated Profile Updates Do Not Erase Structured Identity
  // =========================================================================
  describe('11. Profile Field Independence', () => {
    it('should preserve structured identity when updating unrelated fields like skills, bio, or location', async () => {
      const initialIdentity = {
        departmentId: 'civil-engineering',
        departmentName: 'Civil Engineering',
        titleId: 'civil-engineering:site-engineer',
        titleName: 'Site Engineer',
        isCustomTitle: false,
        isLegacyTitle: false,
        catalogueVersion: '2026.1',
        updatedAt: new Date('2026-02-01'),
      };
      const mockUser: any = {
        _id: 'user_123',
        name: 'Riyas',
        currentRole: 'Site Engineer',
        professionalIdentity: { ...initialIdentity },
        location: 'Dubai',
        bio: 'Civil engineer',
        skills: ['AutoCAD'],
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: function () {
          return { ...this };
        },
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Perform update on bio and location ONLY
      await profileService.updateProfile('user_123', {
        bio: 'Updated bio with 10 years experience',
        location: 'Abu Dhabi',
        skills: ['AutoCAD', 'Civil 3D'],
      });

      expect(mockUser.bio).toBe('Updated bio with 10 years experience');
      expect(mockUser.location).toBe('Abu Dhabi');
      expect(mockUser.skills).toEqual(['AutoCAD', 'Civil 3D']);
      // Structured identity and currentRole must remain preserved
      expect(mockUser.professionalIdentity).toEqual(initialIdentity);
      expect(mockUser.currentRole).toBe('Site Engineer');
    });
  });

  // =========================================================================
  // 12. Headline Remains Independent
  // =========================================================================
  describe('12. Headline Independence', () => {
    it('should update headline without altering professionalIdentity or currentRole', async () => {
      const initialIdentity = {
        departmentId: 'electrical-engineering',
        departmentName: 'Electrical Engineering',
        titleId: 'electrical-engineering:power-systems-engineer',
        titleName: 'Power Systems Engineer',
        isCustomTitle: false,
        isLegacyTitle: false,
        catalogueVersion: '2026.1',
        updatedAt: new Date('2026-03-01'),
      };
      const mockUser: any = {
        _id: 'user_123',
        headline: 'Old Headline',
        currentRole: 'Power Systems Engineer',
        professionalIdentity: { ...initialIdentity },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: function () {
          return { ...this };
        },
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await profileService.updateProfile('user_123', {
        headline: 'High-Voltage Grid Specialist | 500kV Substation Designer',
      });

      expect(mockUser.headline).toBe('High-Voltage Grid Specialist | 500kV Substation Designer');
      expect(mockUser.currentRole).toBe('Power Systems Engineer');
      expect(mockUser.professionalIdentity).toEqual(initialIdentity);
    });
  });

  // =========================================================================
  // 13. Existing Profile APIs and Authorization Behavior Remain Compatible
  // =========================================================================
  describe('13. Authorization and Role Security', () => {
    it('should reject unauthorized self-assignment of educator role even with valid identity', async () => {
      const mockUser: any = {
        _id: 'user_123',
        primaryRole: 'STUDENT',
        role: 'student',
        currentRole: 'Student',
        professionalIdentity: null,
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: function () {
          return { ...this };
        },
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Attempting to elevate to EDUCATOR without admin requesterRole
      await expect(
        profileService.updateProfile(
          'user_123',
          {
            primaryRole: 'EDUCATOR',
            professionalIdentity: {
              departmentId: 'civil-engineering',
              titleId: 'civil-engineering:site-engineer-civil',
            },
          },
          'student',
        ),
      ).rejects.toThrow(/The educator role can only be assigned by a Zeitnah administrator/);
    });
  });

  // =========================================================================
  // 14. Catalogue Labels and IDs Remain Deterministic
  // =========================================================================
  describe('14. Deterministic Ordering and Exact Source Labels', () => {
    it('should preserve verbatim source labels including unusual punctuation and casings', () => {
      // Dept 3: "Corrosion Engineer," (trailing comma)
      const corrosionEng = getTitleById('mechanical-engineering', 'mechanical-engineering:corrosion-engineer');
      expect(corrosionEng).toBeDefined();
      expect(corrosionEng?.label).toBe('Corrosion Engineer,');

      // Dept 2: "Construction Manager(civil)" (missing space before paren)
      const cmCivil = getTitleById('civil-engineering', 'civil-engineering:construction-manager-civil');
      expect(cmCivil).toBeDefined();
      expect(cmCivil?.label).toBe('Construction Manager(civil)');

      // Dept 2: "civil Supervisor" (lowercase civil)
      const civilSupervisor = getTitleById('civil-engineering', 'civil-engineering:civil-supervisor');
      expect(civilSupervisor).toBeDefined();
      expect(civilSupervisor?.label).toBe('civil Supervisor');

      // Dept 11: "Planning engineering" (lowercase engineering)
      const planningDept = getDepartmentById('planning-engineering');
      expect(planningDept).toBeDefined();
      expect(planningDept?.name).toBe('Planning engineering');

      // Dept 14: "Piping BIM modular" (verbatim source label)
      const pipingBimModular = getTitleById('piping-pipeline-engineering-design', 'piping-pipeline-engineering-design:piping-bim-modular');
      expect(pipingBimModular).toBeDefined();
      expect(pipingBimModular?.label).toBe('Piping BIM modular');
    });

    it('should maintain deterministic department ordering', () => {
      const departments = getAllDepartments();
      expect(departments.map((d) => d.id)).toEqual([
        'architectural-design',
        'civil-engineering',
        'mechanical-engineering',
        'electrical-engineering',
        'instrumentation-engineering',
        'quantity-surveying-cost-management',
        'structural-engineering-design',
        'qa-qc',
        'land-surveying-geomatics',
        'gis-mapping',
        'planning-engineering',
        'procurement-department',
        'mep-mechanical-electrical-plumbing',
        'piping-pipeline-engineering-design',
        'process-engineering-department',
        'hse-health-safety-environment',
        'construction-document-control',
        'offshore-operations-marine',
      ]);
    });
  });

  // ── 15. Recruiter Professional Identity Integration ──
  describe('15. Recruiter Professional Identity Integration', () => {
    it('should save valid recruiter details and populate recruiterContext and top-level fields', async () => {
      const mockUser: any = {
        _id: 'user_recruiter_1',
        primaryRole: 'STUDENT',
        currentRole: 'Site Engineer',
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:site-engineer-civil',
          titleName: 'Site Engineer (civil)',
          isCustomTitle: false,
        },
        recruiterContext: {
          organizationId: '',
          hiringInterests: [],
          opportunityTypes: [],
        },
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await profileService.updateProfile('user_recruiter_1', {
        primaryRole: 'recruiter',
        companyName: 'Apex Infrastructure Group',
        currentPosition: 'Talent Acquisition Director',
        specializations: ['Civil & Structural', 'BIM Modelling'],
      });

      expect(mockUser.primaryRole).toBe('RECRUITER');
      expect(mockUser.companyName).toBe('Apex Infrastructure Group');
      expect(mockUser.currentPosition).toBe('Talent Acquisition Director');
      expect(mockUser.recruiterContext.companyName).toBe('Apex Infrastructure Group');
      expect(mockUser.recruiterContext.currentPosition).toBe('Talent Acquisition Director');
      expect(mockUser.recruiterContext.specializations).toEqual(['Civil & Structural', 'BIM Modelling']);
      // Preserves existing engineering identity without wiping it
      expect(mockUser.professionalIdentity.departmentId).toBe('civil-engineering');
      expect(mockUser.currentRole).toBe('Site Engineer');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject recruiter submission with missing or empty company name', async () => {
      const mockUser: any = {
        _id: 'user_recruiter_1',
        primaryRole: 'RECRUITER',
        companyName: '',
        toObject: () => ({ ...mockUser }),
        save: jest.fn(),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile('user_recruiter_1', {
          primaryRole: 'recruiter',
          companyName: '',
          currentPosition: 'Technical Recruiter',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        profileService.updateProfile('user_recruiter_1', {
          primaryRole: 'recruiter',
          currentPosition: 'Technical Recruiter',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should reject recruiter submission with whitespace-only company name', async () => {
      const mockUser: any = {
        _id: 'user_recruiter_1',
        primaryRole: 'RECRUITER',
        toObject: () => ({ ...mockUser }),
        save: jest.fn(),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile('user_recruiter_1', {
          primaryRole: 'recruiter',
          companyName: '    ',
          currentPosition: 'Lead Talent Partner',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should reject recruiter submission with missing or empty current position', async () => {
      const mockUser: any = {
        _id: 'user_recruiter_1',
        primaryRole: 'RECRUITER',
        currentPosition: '',
        toObject: () => ({ ...mockUser }),
        save: jest.fn(),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile('user_recruiter_1', {
          primaryRole: 'recruiter',
          companyName: 'Larsen & Toubro',
          currentPosition: '',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        profileService.updateProfile('user_recruiter_1', {
          primaryRole: 'recruiter',
          companyName: 'Larsen & Toubro',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should reject recruiter submission with whitespace-only current position', async () => {
      const mockUser: any = {
        _id: 'user_recruiter_1',
        primaryRole: 'RECRUITER',
        toObject: () => ({ ...mockUser }),
        save: jest.fn(),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile('user_recruiter_1', {
          primaryRole: 'recruiter',
          companyName: 'Larsen & Toubro',
          currentPosition: '   \t  ',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should reject recruiter details containing HTML tags', async () => {
      const mockUser: any = {
        _id: 'user_recruiter_1',
        primaryRole: 'RECRUITER',
        toObject: () => ({ ...mockUser }),
        save: jest.fn(),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile('user_recruiter_1', {
          primaryRole: 'recruiter',
          companyName: '<script>alert(1)</script>InfraCorp',
          currentPosition: 'Recruiter',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        profileService.updateProfile('user_recruiter_1', {
          primaryRole: 'recruiter',
          companyName: 'InfraCorp',
          currentPosition: 'Recruiter<b>Lead</b>',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should preserve engineering identity when saving Recruiter, and preserve recruiter data when switching back to Professional', async () => {
      const userDoc: any = {
        _id: 'user_roundtrip_1',
        primaryRole: 'PROFESSIONAL',
        currentRole: 'Structural Engineer',
        professionalIdentity: {
          departmentId: 'structural-engineering-design',
          titleId: 'structural-engineering-design:structural-design-engineer',
          titleName: 'Structural Design Engineer',
          isCustomTitle: false,
        },
        companyName: '',
        currentPosition: '',
        recruiterContext: {
          organizationId: '',
          companyName: '',
          currentPosition: '',
          specializations: [],
          hiringInterests: [],
          opportunityTypes: [],
        },
        toObject: () => ({ ...userDoc }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(userDoc);

      // Step 1: Switch to Recruiter
      await profileService.updateProfile('user_roundtrip_1', {
        primaryRole: 'recruiter',
        companyName: 'Arup Talent',
        currentPosition: 'Engineering Recruiter',
        specializations: ['Bridges', 'Tunnels'],
      });

      expect(userDoc.primaryRole).toBe('RECRUITER');
      expect(userDoc.companyName).toBe('Arup Talent');
      expect(userDoc.currentPosition).toBe('Engineering Recruiter');
      // Engineering identity remains intact
      expect(userDoc.professionalIdentity.departmentId).toBe('structural-engineering-design');
      expect(userDoc.currentRole).toBe('Structural Engineer');

      // Step 2: Switch back to Professional
      await profileService.updateProfile('user_roundtrip_1', {
        primaryRole: 'professional',
        professionalIdentity: {
          departmentId: 'structural-engineering-design',
          titleId: 'structural-engineering-design:structural-design-engineer',
          isCustomTitle: false,
        },
      });

      expect(userDoc.primaryRole).toBe('PROFESSIONAL');
      expect(userDoc.professionalIdentity.departmentId).toBe('structural-engineering-design');
      // Recruiter context was preserved and not cleared
      expect(userDoc.companyName).toBe('Arup Talent');
      expect(userDoc.currentPosition).toBe('Engineering Recruiter');
    });

    it('should not require company name or position for Student or Professional', async () => {
      const mockStudent: any = {
        _id: 'user_student_1',
        primaryRole: 'STUDENT',
        currentRole: '',
        toObject: () => ({ ...mockStudent }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockStudent);

      // Saving student role does not throw BadRequestException about company name
      await expect(
        profileService.updateProfile('user_student_1', {
          primaryRole: 'student',
        }),
      ).resolves.toBeDefined();
    });
  });
});
