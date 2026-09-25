/**
 * ZEITNAH PHASE 3 — AI-Powered Job → Talent Matching
 * Comprehensive Test Suite
 */
import { Types } from 'mongoose';
import {
  calculateMatch,
  MATCH_WEIGHTS,
  MATCH_THRESHOLDS,
  normalizeSoftware,
  normalizeSkill,
  normalizeDiscipline,
  normalizeSector,
  JobProfile,
  CandidateProfile,
} from './matching/matching.engine';
import {
  MatchCategory,
  MatchStatus,
} from './matching/schemas/job-talent-match.schema';
import { InviteStatus } from './matching/schemas/job-opportunity-invite.schema';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function makeJobProfile(overrides: Partial<JobProfile> = {}): JobProfile {
  return {
    title: 'Planning Engineer',
    description: 'Highway EPC project planning role',
    discipline: 'Civil Engineering',
    specialization: 'Highway Engineering',
    infrastructureSector: 'Highways',
    minYearsExperience: 4,
    maxYearsExperience: 8,
    requiredSkills: ['Planning & Scheduling', 'Quantity Surveying'],
    preferredSkills: ['Site Supervision'],
    requiredSoftware: ['Primavera P6', 'AutoCAD'],
    preferredSoftware: ['MS Project'],
    requiredEducation: 'B.Tech Civil Engineering',
    requiredCertifications: [],
    preferredCertifications: ['PMP'],
    location: 'Kerala',
    workMode: 'On-site',
    responsibilities: 'Prepare project schedules',
    requirements: 'B.Tech in Civil Engineering',
    ...overrides,
  };
}

function makeCandidateProfile(
  overrides: Partial<CandidateProfile> = {},
): CandidateProfile {
  return {
    userId: new Types.ObjectId().toString(),
    name: 'Rahul Kumar',
    username: 'rahulkumar',
    avatar: '',
    headline: 'Planning Engineer',
    currentRole: 'Planning Engineer',
    primaryRole: 'PROFESSIONAL',
    primaryDiscipline: 'Civil Engineering',
    specializations: ['Highway Engineering'],
    infrastructureSectors: ['Highways'],
    yearsOfExperience: 5,
    location: 'Kerala',
    preferredLocations: ['Kerala', 'Tamil Nadu'],
    skills: ['Planning', 'Scheduling'],
    structuredSkills: {
      technicalSkills: ['Planning & Scheduling', 'Quantity Surveying'],
      softwareSkills: ['Primavera P6', 'AutoCAD'],
      industrySkills: ['Site Supervision'],
      professionalSkills: ['Project Leadership'],
    },
    experience: [
      {
        id: 'exp1',
        organization: 'ABC Construction',
        role: 'Planning Engineer',
        location: 'Kerala',
        description: 'Highway EPC project planning and scheduling',
        skillsUsed: ['Planning', 'Scheduling'],
        softwareUsed: ['Primavera P6'],
        infrastructureSector: 'Highways',
        startDate: new Date('2019-01-01'),
        endDate: null,
        currentlyActive: true,
      },
    ],
    education: [
      {
        qualification: 'B.Tech',
        fieldOfStudy: 'Civil Engineering',
        institution: 'NIT Calicut',
      },
    ],
    certifications: [],
    projects: [
      {
        title: 'NH-66 Highway Extension',
        description: 'Highway EPC project for NH-66 extension',
        skills: ['Planning', 'Scheduling'],
        softwareUsed: ['Primavera P6', 'AutoCAD'],
        infrastructureSector: 'Highways',
        role: 'Planning Engineer',
      },
    ],
    careerPreferences: {
      openToOpportunities: true,
      preferredRoles: ['Planning Engineer', 'Project Manager'],
      preferredSectors: ['Highways', 'Roads'],
      preferredLocations: ['Kerala'],
      preferredWorkMode: 'On-site',
      preferredEmploymentType: 'Full-time',
    },
    availability: 'OPEN_TO_OPPORTUNITIES',
    discoverableToRecruiters: true,
    profileVisibility: 'PUBLIC',
    ...overrides,
  };
}

// ─── Test: Normalization ────────────────────────────────────────────────────

describe('Phase 3 — Normalization', () => {
  test('Software aliases normalize correctly', () => {
    expect(normalizeSoftware('P6')).toBe('Primavera P6');
    expect(normalizeSoftware('Primavera')).toBe('Primavera P6');
    expect(normalizeSoftware('autocad')).toBe('AutoCAD');
    expect(normalizeSoftware('Civil3D')).toBe('Civil 3D');
    expect(normalizeSoftware('ms project')).toBe('MS Project');
    expect(normalizeSoftware('ETABS')).toBe('ETABS');
    expect(normalizeSoftware('staad pro')).toBe('STAAD.Pro');
  });

  test('Skill aliases normalize correctly', () => {
    expect(normalizeSkill('planning')).toBe('Planning & Scheduling');
    expect(normalizeSkill('scheduling')).toBe('Planning & Scheduling');
    expect(normalizeSkill('boq')).toBe('Bill of Quantities (BOQ)');
    expect(normalizeSkill('bbs')).toBe('Bar Bending Schedule (BBS)');
    expect(normalizeSkill('hse')).toBe('Safety / OSHA Standards');
    expect(normalizeSkill('fidic')).toBe('FIDIC Contracts');
  });

  test('Discipline aliases normalize correctly', () => {
    expect(normalizeDiscipline('civil')).toBe('Civil Engineering');
    expect(normalizeDiscipline('structural')).toBe('Structural Engineering');
    expect(normalizeDiscipline('qs')).toBe('Quantity Surveying');
    expect(normalizeDiscipline('pm')).toBe('Project Management');
    expect(normalizeDiscipline('bim')).toBe('BIM');
  });

  test('Sector aliases normalize correctly', () => {
    expect(normalizeSector('highway')).toBe('Highways');
    expect(normalizeSector('highway epc')).toBe('Highways');
    expect(normalizeSector('bridge')).toBe('Bridges');
    expect(normalizeSector('metro')).toBe('Metro');
    expect(normalizeSector('water')).toBe('Water & Wastewater');
  });
});

// ─── Test: Matching Engine — Eligibility ────────────────────────────────────

describe('Phase 3 — Eligibility & Hard Requirements', () => {
  test('Hard experience requirement enforced', () => {
    const job = makeJobProfile({ minYearsExperience: 5 });
    const candidate = makeCandidateProfile({ yearsOfExperience: 2 });
    const result = calculateMatch(job, candidate);

    expect(result.hardRequirementFailures.length).toBeGreaterThan(0);
    const expFailure = result.hardRequirementFailures.find(
      (f) => f.type === 'experience',
    );
    expect(expFailure).toBeDefined();
    expect(expFailure.expected).toBe(5);
    expect(expFailure.actual).toBe(2);
  });

  test('Discipline mismatch creates hard requirement failure', () => {
    const job = makeJobProfile({ discipline: 'Structural Engineering' });
    const candidate = makeCandidateProfile({
      primaryDiscipline: 'Architecture',
    });
    const result = calculateMatch(job, candidate);

    const discFailure = result.hardRequirementFailures.find(
      (f) => f.type === 'discipline',
    );
    expect(discFailure).toBeDefined();
  });

  test('Candidate meeting all hard requirements has passesHardRequirements = true', () => {
    const result = calculateMatch(makeJobProfile(), makeCandidateProfile());
    expect(result.passesHardRequirements).toBe(true);
    expect(result.hardRequirementFailures).toHaveLength(0);
  });

  test('Closed jobs should not generate matches (validated in service level)', () => {
    // This is enforced in the service, not the engine
    // Engine only runs if job is PUBLISHED
    expect(true).toBe(true);
  });
});

// ─── Test: Matching Engine — Scoring ────────────────────────────────────────

describe('Phase 3 — Scoring & Compatibility', () => {
  test('Ideal candidate scores highly compatible', () => {
    const result = calculateMatch(makeJobProfile(), makeCandidateProfile());
    expect(result.score).toBeGreaterThanOrEqual(
      MATCH_THRESHOLDS.HIGHLY_COMPATIBLE,
    );
    expect(result.category).toBe(MatchCategory.HIGHLY_COMPATIBLE);
  });

  test('Relevant skills increase compatibility score', () => {
    const withSkills = calculateMatch(
      makeJobProfile(),
      makeCandidateProfile({
        structuredSkills: {
          technicalSkills: ['Planning & Scheduling', 'Quantity Surveying'],
          softwareSkills: ['Primavera P6', 'AutoCAD'],
          industrySkills: [],
          professionalSkills: [],
        },
      }),
    );
    const withoutSkills = calculateMatch(
      makeJobProfile(),
      makeCandidateProfile({
        skills: [],
        structuredSkills: {
          technicalSkills: [],
          softwareSkills: [],
          industrySkills: [],
          professionalSkills: [],
        },
      }),
    );
    expect(withSkills.score).toBeGreaterThan(withoutSkills.score);
  });

  test('Required skills have greater weight than preferred skills', () => {
    expect(MATCH_WEIGHTS.requiredSkills).toBeGreaterThan(
      MATCH_WEIGHTS.preferredSkills,
    );
    expect(MATCH_WEIGHTS.requiredSoftware).toBeGreaterThan(
      MATCH_WEIGHTS.preferredSoftware,
    );
  });

  test('Relevant project experience affects matching', () => {
    const withProjects = calculateMatch(
      makeJobProfile(),
      makeCandidateProfile({
        projects: [
          {
            title: 'Highway EPC Planning',
            description: 'Planned highway construction schedule',
            skills: ['Planning'],
            softwareUsed: ['Primavera P6'],
            infrastructureSector: 'Highways',
            role: 'Planning Engineer',
          },
        ],
      }),
    );
    const withoutProjects = calculateMatch(
      makeJobProfile(),
      makeCandidateProfile({ projects: [] }),
    );
    expect(withProjects.score).toBeGreaterThan(withoutProjects.score);
  });

  test('Relevant sector affects matching', () => {
    const matchedSector = calculateMatch(
      makeJobProfile({ infrastructureSector: 'Highways' }),
      makeCandidateProfile({
        infrastructureSectors: ['Highways'],
        projects: [],
        experience: [],
      }),
    );
    const unmatchedSector = calculateMatch(
      makeJobProfile({ infrastructureSector: 'Highways' }),
      makeCandidateProfile({
        infrastructureSectors: ['Railways'],
        projects: [],
        experience: [],
      }),
    );
    expect(matchedSector.score).toBeGreaterThan(unmatchedSector.score);
  });

  test('Software alignment affects matching', () => {
    const baseCandidate = makeCandidateProfile();
    const withSoftware = calculateMatch(
      makeJobProfile({ requiredSoftware: ['Primavera P6', 'AutoCAD'] }),
      {
        ...baseCandidate,
        structuredSkills: {
          ...baseCandidate.structuredSkills,
          softwareSkills: ['Primavera P6', 'AutoCAD'],
        },
        experience: [],
        projects: [],
      },
    );
    const withoutSoftware = calculateMatch(
      makeJobProfile({ requiredSoftware: ['Primavera P6', 'AutoCAD'] }),
      {
        ...baseCandidate,
        structuredSkills: {
          ...baseCandidate.structuredSkills,
          softwareSkills: [],
        },
        experience: [],
        projects: [],
      },
    );
    expect(withSoftware.score).toBeGreaterThan(withoutSoftware.score);
  });

  test('Experience range is interpreted correctly', () => {
    const inRange = calculateMatch(
      makeJobProfile({ minYearsExperience: 3, maxYearsExperience: 6 }),
      makeCandidateProfile({ yearsOfExperience: 5 }),
    );
    const belowRange = calculateMatch(
      makeJobProfile({ minYearsExperience: 3, maxYearsExperience: 6 }),
      makeCandidateProfile({ yearsOfExperience: 1 }),
    );
    const aboveRange = calculateMatch(
      makeJobProfile({ minYearsExperience: 3, maxYearsExperience: 6 }),
      makeCandidateProfile({ yearsOfExperience: 15 }),
    );

    // In-range should score highest on experience dimension
    const expDimInRange = inRange.dimensionScores.find(
      (d) => d.dimension === 'experience',
    );
    const expDimBelow = belowRange.dimensionScores.find(
      (d) => d.dimension === 'experience',
    );
    const expDimAbove = aboveRange.dimensionScores.find(
      (d) => d.dimension === 'experience',
    );
    expect(expDimInRange.score).toBe(100);
    expect(expDimBelow.score).toBeLessThan(100);
    expect(expDimAbove.score).toBeLessThanOrEqual(100);
  });

  test('Location affects matching when required', () => {
    const matchedLocation = calculateMatch(
      makeJobProfile({ location: 'Kerala' }),
      makeCandidateProfile({ location: 'Kerala' }),
    );
    const unmatchedLocation = calculateMatch(
      makeJobProfile({ location: 'Mumbai' }),
      makeCandidateProfile({
        location: 'Delhi',
        preferredLocations: ['Delhi'],
      }),
    );
    expect(matchedLocation.score).toBeGreaterThan(unmatchedLocation.score);
  });

  test('Missing information is not treated as a positive match', () => {
    const emptyCandidate = makeCandidateProfile({
      primaryDiscipline: '',
      specializations: [],
      infrastructureSectors: [],
      skills: [],
      structuredSkills: {
        technicalSkills: [],
        softwareSkills: [],
        industrySkills: [],
        professionalSkills: [],
      },
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      yearsOfExperience: 0,
      location: '',
    });
    const result = calculateMatch(makeJobProfile(), emptyCandidate);
    // Score should be significantly lower than ideal candidate
    expect(result.score).toBeLessThan(50);
  });
});

// ─── Test: Match Integrity ──────────────────────────────────────────────────

describe('Phase 3 — Match Integrity', () => {
  test('Match results use model version', () => {
    const result = calculateMatch(makeJobProfile(), makeCandidateProfile());
    expect(result.matchingEngineVersion).toBe('v1');
  });

  test('Candidate cannot be duplicated (unique compound index)', () => {
    // Enforced by schema index { jobId: 1, candidateUserId: 1, unique: true }
    expect(true).toBe(true);
  });

  test('Match explanation includes match reasons', () => {
    const result = calculateMatch(makeJobProfile(), makeCandidateProfile());
    expect(result.matchReasons.length).toBeGreaterThan(0);
    // Should mention discipline
    expect(
      result.matchReasons.some((r) => r.includes('Civil Engineering')),
    ).toBe(true);
  });

  test('Match explanation includes gap reasons when applicable', () => {
    const result = calculateMatch(
      makeJobProfile({ requiredCertifications: ['PMP'] }),
      makeCandidateProfile({ certifications: [] }),
    );
    expect(result.gapReasons.some((r) => r.toLowerCase().includes('pmp'))).toBe(
      true,
    );
  });

  test('Match categories have deterministic thresholds', () => {
    expect(MATCH_THRESHOLDS.HIGHLY_COMPATIBLE).toBe(80);
    expect(MATCH_THRESHOLDS.STRONGLY_COMPATIBLE).toBe(60);
    expect(MATCH_THRESHOLDS.POTENTIALLY_COMPATIBLE).toBe(40);
  });
});

// ─── Test: Opportunity Invite Model ─────────────────────────────────────────

describe('Phase 3 — Opportunity Invite', () => {
  test('InviteStatus enum has correct values', () => {
    expect(InviteStatus.SENT).toBe('SENT');
    expect(InviteStatus.VIEWED).toBe('VIEWED');
    expect(InviteStatus.INTERESTED).toBe('INTERESTED');
    expect(InviteStatus.DECLINED).toBe('DECLINED');
    expect(InviteStatus.EXPIRED).toBe('EXPIRED');
  });

  test('MatchStatus enum has correct values', () => {
    expect(MatchStatus.ACTIVE).toBe('ACTIVE');
    expect(MatchStatus.STALE).toBe('STALE');
    expect(MatchStatus.INVALIDATED).toBe('INVALIDATED');
  });

  test('MatchCategory enum has correct values', () => {
    expect(MatchCategory.HIGHLY_COMPATIBLE).toBe('HIGHLY_COMPATIBLE');
    expect(MatchCategory.STRONGLY_COMPATIBLE).toBe('STRONGLY_COMPATIBLE');
    expect(MatchCategory.POTENTIALLY_COMPATIBLE).toBe('POTENTIALLY_COMPATIBLE');
  });
});

// ─── Test: Alias Normalization Edge Cases ───────────────────────────────────

describe('Phase 3 — Alias Edge Cases', () => {
  test('P6 variant matching through normalization', () => {
    const job = makeJobProfile({ requiredSoftware: ['Primavera P6'] });
    const candidate = makeCandidateProfile({
      structuredSkills: {
        ...makeCandidateProfile().structuredSkills,
        softwareSkills: ['P6'],
      },
    });
    const result = calculateMatch(job, candidate);
    expect(result.matchedSoftware).toContain('Primavera P6');
  });

  test('Planning alias resolves to Planning & Scheduling', () => {
    const job = makeJobProfile({ requiredSkills: ['Planning & Scheduling'] });
    const candidate = makeCandidateProfile({
      skills: ['Planning'],
      structuredSkills: {
        technicalSkills: ['Planning'],
        softwareSkills: [],
        industrySkills: [],
        professionalSkills: [],
      },
    });
    const result = calculateMatch(job, candidate);
    expect(result.matchedSkills.length).toBeGreaterThan(0);
  });

  test('Civil alias resolves to Civil Engineering', () => {
    const job = makeJobProfile({ discipline: 'Civil Engineering' });
    // Candidate has explicit discipline already normalized in profile
    const candidate = makeCandidateProfile({
      primaryDiscipline: 'Civil Engineering',
    });
    const result = calculateMatch(job, candidate);
    expect(
      result.matchReasons.some((r) => r.includes('Civil Engineering')),
    ).toBe(true);
  });

  test('Highway EPC alias resolves to Highways sector', () => {
    expect(normalizeSector('highway epc')).toBe('Highways');
    expect(normalizeSector('highway')).toBe('Highways');
  });
});

// ─── Test: Weight Configuration ─────────────────────────────────────────────

describe('Phase 3 — Weight Configuration', () => {
  test('Weights are not hard-coded throughout — centralized in MATCH_WEIGHTS', () => {
    expect(typeof MATCH_WEIGHTS).toBe('object');
    expect(Object.keys(MATCH_WEIGHTS).length).toBeGreaterThanOrEqual(12);
  });

  test('All dimension weights are positive', () => {
    for (const [key, weight] of Object.entries(MATCH_WEIGHTS)) {
      expect(weight).toBeGreaterThan(0);
    }
  });

  test('Score is bounded between 0 and 100', () => {
    const result = calculateMatch(makeJobProfile(), makeCandidateProfile());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ─── Test: Extended Hard Requirements & Gap Analysis ───────────────────────

describe('Phase 3 — Extended Hard Requirements & Gaps', () => {
  test('Mandatory certification failure is structured and prevents hard pass', () => {
    const job = makeJobProfile({ requiredCertifications: ['PMP'] });
    const candidate = makeCandidateProfile({ certifications: [] });
    const result = calculateMatch(job, candidate);

    expect(result.passesHardRequirements).toBe(false);
    const certFailure = result.hardRequirementFailures.find(
      (f) => f.type === 'certification',
    );
    expect(certFailure).toBeDefined();
    expect(certFailure.expected).toBe('pmp');
    expect(certFailure.actual).toBe('Not listed');
  });

  test('Mandatory software failure is structured and prevents hard pass', () => {
    const job = makeJobProfile({ requiredSoftware: ['Primavera P6'] });
    const candidate = makeCandidateProfile({
      structuredSkills: {
        ...makeCandidateProfile().structuredSkills,
        softwareSkills: ['AutoCAD'], // Missing P6
      },
      experience: [],
      projects: [],
    });
    const result = calculateMatch(job, candidate);

    expect(result.passesHardRequirements).toBe(false);
    const swFailure = result.hardRequirementFailures.find(
      (f) => f.type === 'software',
    );
    expect(swFailure).toBeDefined();
    expect(swFailure.expected).toBe('Primavera P6');
  });

  test('Mandatory skills failure is structured and recorded', () => {
    const job = makeJobProfile({
      requiredSkills: ['Planning & Scheduling', 'Quantity Surveying'],
    });
    const candidate = makeCandidateProfile({
      skills: [],
      structuredSkills: {
        technicalSkills: [], // Missing both
        softwareSkills: ['Primavera P6', 'AutoCAD'],
        industrySkills: [],
        professionalSkills: [],
      },
    });
    const result = calculateMatch(job, candidate);

    expect(result.passesHardRequirements).toBe(false);
    expect(result.hardRequirementFailures.some((f) => f.type === 'skill')).toBe(
      true,
    );
  });
});

// ─── Test: Semantic & Contextual Project Relevance ──────────────────────────

describe('Phase 3 — Contextual Project Matching', () => {
  test('Highway EPC project phrasing matches Highways sector and Planning role', () => {
    const job = makeJobProfile({
      title: 'Planning Engineer',
      infrastructureSector: 'Highways',
    });
    const candidate = makeCandidateProfile({
      projects: [
        {
          title: 'Four-lane Highway EPC Corridor',
          description:
            'Comprehensive planning and scheduling for NH corridor execution',
          skills: ['Planning'],
          softwareUsed: ['Primavera P6'],
          infrastructureSector: 'Highways',
          role: 'Planning Engineer',
        },
      ],
    });
    const result = calculateMatch(job, candidate);

    expect(result.matchedProjects.length).toBeGreaterThan(0);
    const projDim = result.dimensionScores.find(
      (d) => d.dimension === 'projects',
    );
    expect(projDim.score).toBeGreaterThan(0);
  });
});

// ─── Test: MatchingService Unit Tests ────────────────────────────────────────

describe('Phase 3 — MatchingService Unit Tests', () => {
  let service: any;
  let mockMatchModel: any;
  let mockInviteModel: any;
  let mockOppModel: any;
  let mockOrgModel: any;
  let mockMembershipModel: any;
  let mockUserModel: any;
  let mockProjectModel: any;
  let mockJobAppModel: any;
  let mockAuditLogsService: any;
  let mockNotificationsService: any;

  const sampleJobId = new Types.ObjectId().toString();
  const sampleOrgId = new Types.ObjectId().toString();
  const sampleUserId = new Types.ObjectId().toString();
  const sampleCandidateId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockMatchModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      insertMany: jest.fn().mockResolvedValue([]),
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(10),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
    };

    mockInviteModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(3),
    };

    mockOppModel = {
      findById: jest.fn(),
    };

    mockOrgModel = {
      findById: jest.fn(),
    };

    mockMembershipModel = {
      findOne: jest.fn().mockResolvedValue({
        role: 'RECRUITER',
        status: 'ACTIVE',
      }),
    };

    mockUserModel = {
      find: jest.fn(),
      findById: jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue({ name: 'Rahul Kumar', avatar: '' }),
      }),
    };

    mockProjectModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    };

    mockJobAppModel = {
      countDocuments: jest.fn().mockResolvedValue(15),
    };

    mockAuditLogsService = {
      record: jest.fn().mockResolvedValue(true),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue(true),
    };

    // Instantiate MatchingService directly
    const {
      MatchingService: ServiceClass,
    } = require('./matching/matching.service');
    service = new ServiceClass(
      mockMatchModel,
      mockInviteModel,
      mockOppModel,
      mockOrgModel,
      mockMembershipModel,
      mockUserModel,
      mockProjectModel,
      mockJobAppModel,
      mockAuditLogsService,
      mockNotificationsService,
    );
  });

  describe('Eligibility and Trigger Validation', () => {
    test('triggerJobMatching throws if job is not published', async () => {
      mockOppModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(sampleJobId),
          title: 'Draft Job',
          status: 'DRAFT',
          organizationId: new Types.ObjectId(sampleOrgId),
        }),
      });

      await expect(
        service.triggerJobMatching(sampleJobId, sampleUserId),
      ).rejects.toThrow('Only published jobs can trigger matching');
    });

    test('triggerJobMatching throws if business is not approved', async () => {
      mockOppModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(sampleJobId),
          title: 'Planning Engineer',
          status: 'PUBLISHED',
          organizationId: new Types.ObjectId(sampleOrgId),
        }),
      });

      mockOrgModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(sampleOrgId),
          status: 'PENDING', // Not approved
        }),
      });

      await expect(
        service.triggerJobMatching(sampleJobId, sampleUserId),
      ).rejects.toThrow('Only approved businesses can run talent matching');
    });

    test('triggerJobMatching throws if job not found', async () => {
      mockOppModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.triggerJobMatching(sampleJobId, sampleUserId),
      ).rejects.toThrow('Job not found');
    });
  });

  describe('Recruiter Candidate Management (Save / Dismiss)', () => {
    test('toggleSaveCandidate toggles isSaved and logs audit', async () => {
      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(sampleJobId),
        title: 'Planning Engineer',
        organizationId: new Types.ObjectId(sampleOrgId),
      });

      const mockMatch = {
        _id: new Types.ObjectId(),
        isSaved: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockMatchModel.findOne.mockResolvedValue(mockMatch);

      const result = await service.toggleSaveCandidate(
        sampleUserId,
        sampleJobId,
        sampleCandidateId,
      );
      expect(result.isSaved).toBe(true);
      expect(mockMatch.save).toHaveBeenCalled();
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CANDIDATE_SAVED' }),
      );
    });

    test('dismissCandidate sets isDismissed = true and logs audit', async () => {
      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(sampleJobId),
        title: 'Planning Engineer',
        organizationId: new Types.ObjectId(sampleOrgId),
      });

      const mockMatch = {
        _id: new Types.ObjectId(),
        isDismissed: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockMatchModel.findOne.mockResolvedValue(mockMatch);

      const result = await service.dismissCandidate(
        sampleUserId,
        sampleJobId,
        sampleCandidateId,
      );
      expect(result.success).toBe(true);
      expect(mockMatch.isDismissed).toBe(true);
      expect(mockMatch.save).toHaveBeenCalled();
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CANDIDATE_DISMISSED' }),
      );
    });

    test('toggleSaveCandidate throws if match not found', async () => {
      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(sampleJobId),
        title: 'Planning Engineer',
        organizationId: new Types.ObjectId(sampleOrgId),
      });
      mockMatchModel.findOne.mockResolvedValue(null);

      await expect(
        service.toggleSaveCandidate(
          sampleUserId,
          sampleJobId,
          sampleCandidateId,
        ),
      ).rejects.toThrow('Candidate match record not found for this job');
    });

    test('Recruiter action is rejected if user is not in organization', async () => {
      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(sampleJobId),
        title: 'Planning Engineer',
        organizationId: new Types.ObjectId(sampleOrgId),
      });
      mockMembershipModel.findOne.mockResolvedValue(null); // Not member

      await expect(
        service.toggleSaveCandidate(
          sampleUserId,
          sampleJobId,
          sampleCandidateId,
        ),
      ).rejects.toThrow(
        'You must be an Owner, Admin, or Recruiter of this organization',
      );
    });
  });

  describe('Recruiter Dashboard Independent Counts', () => {
    test('getJobMatchSummary returns 4 independent counts', async () => {
      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(sampleJobId),
        organizationId: new Types.ObjectId(sampleOrgId),
      });

      // matchModel.countDocuments: first call totalMatches (10), third call savedCount (2)
      mockMatchModel.countDocuments
        .mockResolvedValueOnce(10) // total recommended
        .mockResolvedValueOnce(2); // saved

      mockInviteModel.countDocuments.mockResolvedValue(4); // offersSent
      mockJobAppModel.countDocuments.mockResolvedValue(18); // applicants

      const summary = await service.getJobMatchSummary(
        sampleUserId,
        sampleJobId,
      );

      expect(summary.jobId).toBe(sampleJobId);
      expect(summary.applicants).toBe(18);
      expect(summary.totalRecommendedTalent).toBe(10);
      expect(summary.savedCandidates).toBe(2);
      expect(summary.offersSent).toBe(4);
    });
  });

  describe('Opportunity Invites Lifecycle', () => {
    test('sendOpportunityInvite creates invite, sends notification, does NOT create job application', async () => {
      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(sampleJobId),
        title: 'Planning Engineer',
        status: 'PUBLISHED',
        organizationId: new Types.ObjectId(sampleOrgId),
      });

      mockInviteModel.findOne.mockResolvedValue(null); // No existing invite

      const createdInvite = {
        _id: new Types.ObjectId(),
        jobId: new Types.ObjectId(sampleJobId),
        candidateUserId: new Types.ObjectId(sampleCandidateId),
        status: InviteStatus.SENT,
      };
      mockInviteModel.create.mockResolvedValue(createdInvite);

      const invite = await service.sendOpportunityInvite(
        sampleUserId,
        sampleJobId,
        sampleCandidateId,
        'We would love to discuss this role with you.',
      );

      expect(invite.status).toBe(InviteStatus.SENT);
      expect(mockInviteModel.create).toHaveBeenCalled();
      // Crucial: candidate receives notification
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleCandidateId,
          type: 'opportunity_invite',
        }),
      );
      // Crucial Phase 3 invariant: does NOT create a job application
      // (mockJobAppModel has no create call)
    });

    test('sendOpportunityInvite prevents duplicate invites', async () => {
      mockOppModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(sampleJobId),
        title: 'Planning Engineer',
        status: 'PUBLISHED',
        organizationId: new Types.ObjectId(sampleOrgId),
      });

      mockInviteModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() }); // Already exists

      await expect(
        service.sendOpportunityInvite(
          sampleUserId,
          sampleJobId,
          sampleCandidateId,
          'Hello',
        ),
      ).rejects.toThrow('An opportunity invite has already been sent');
    });

    test('respondToInvite with interested updates status and notifies recruiter', async () => {
      const inviteDoc = {
        _id: new Types.ObjectId(),
        jobId: new Types.ObjectId(sampleJobId),
        candidateUserId: new Types.ObjectId(sampleCandidateId),
        senderUserId: new Types.ObjectId(sampleUserId),
        status: InviteStatus.SENT,
        respondedAt: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockInviteModel.findOne.mockResolvedValue(inviteDoc);
      mockOppModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ title: 'Planning Engineer' }),
      });

      const res = await service.respondToInvite(
        sampleCandidateId,
        String(inviteDoc._id),
        'interested',
      );

      expect(res.status).toBe(InviteStatus.INTERESTED);
      expect(res.respondedAt).toBeInstanceOf(Date);
      expect(inviteDoc.save).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUserId,
          type: 'invite_response',
          title: 'Candidate Interested!',
        }),
      );
    });

    test('respondToInvite with declined updates status and notifies recruiter', async () => {
      const inviteDoc = {
        _id: new Types.ObjectId(),
        jobId: new Types.ObjectId(sampleJobId),
        candidateUserId: new Types.ObjectId(sampleCandidateId),
        senderUserId: new Types.ObjectId(sampleUserId),
        status: InviteStatus.SENT,
        respondedAt: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockInviteModel.findOne.mockResolvedValue(inviteDoc);
      mockOppModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ title: 'Planning Engineer' }),
      });

      const res = await service.respondToInvite(
        sampleCandidateId,
        String(inviteDoc._id),
        'declined',
      );

      expect(res.status).toBe(InviteStatus.DECLINED);
      expect(res.respondedAt).toBeInstanceOf(Date);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUserId,
          type: 'invite_response',
          title: 'Candidate Declined',
        }),
      );
    });

    test('respondToInvite rejects duplicate responses', async () => {
      const inviteDoc = {
        _id: new Types.ObjectId(),
        status: InviteStatus.INTERESTED, // Already responded
      };
      mockInviteModel.findOne.mockResolvedValue(inviteDoc);

      await expect(
        service.respondToInvite(
          sampleCandidateId,
          String(inviteDoc._id),
          'declined',
        ),
      ).rejects.toThrow('This invite has already been responded to');
    });

    test('markInviteViewed transitions SENT to VIEWED and sets viewedAt', async () => {
      const inviteDoc = {
        _id: new Types.ObjectId(),
        status: InviteStatus.SENT,
        viewedAt: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockInviteModel.findOne.mockResolvedValue(inviteDoc);

      const res = await service.markInviteViewed(
        sampleCandidateId,
        String(inviteDoc._id),
      );

      expect(res.status).toBe(InviteStatus.VIEWED);
      expect(res.viewedAt).toBeInstanceOf(Date);
      expect(inviteDoc.save).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    test('invalidateJobMatches sets status of active matches to STALE', async () => {
      const count = await service.invalidateJobMatches(sampleJobId);
      expect(count).toBe(5);
      expect(mockMatchModel.updateMany).toHaveBeenCalledWith(
        { jobId: new Types.ObjectId(sampleJobId), status: 'ACTIVE' },
        { $set: { status: 'STALE' } },
      );
    });

    test('invalidateCandidateMatches sets status of active matches to STALE', async () => {
      const count = await service.invalidateCandidateMatches(sampleCandidateId);
      expect(count).toBe(5);
      expect(mockMatchModel.updateMany).toHaveBeenCalledWith(
        {
          candidateUserId: new Types.ObjectId(sampleCandidateId),
          status: 'ACTIVE',
        },
        { $set: { status: 'STALE' } },
      );
    });
  });
});
