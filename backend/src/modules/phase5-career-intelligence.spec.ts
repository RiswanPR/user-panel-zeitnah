/**
 * ZEITNAH PHASE 5 — Career Intelligence, Skill Pathways & Infrastructure Talent Intelligence
 * Comprehensive Test Suite
 */
import { Types } from 'mongoose';
import {
  INFRASTRUCTURE_ROLE_TAXONOMY,
  getRoleByTitle,
  getAllRoles,
  getCareerProgression,
  getInfrastructureCareerMap,
} from './career-intelligence/infrastructure-role.taxonomy';
import {
  detectDemonstratedSkills,
  calculateProfileCompleteness,
  calculateProfileStrength,
  evaluateRoleAlignment,
  analyzeTargetRoleSkillGaps,
  generateCareerPathwaySteps,
  generateProfileRecommendations,
  normalizeSoftware,
  normalizeSkill,
} from './career-intelligence/career-intelligence.engine';
import {
  ProfileStrengthLevel,
  RoleAlignmentLevel,
  EvidenceType,
  SkillConfidence,
} from './career-intelligence/schemas/career-insight.schema';
import { CareerIntelligenceService } from './career-intelligence/career-intelligence.service';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function makeCandidateUser(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(),
    name: 'Vikram Menon',
    username: 'vikrammenon',
    headline: 'Site Engineer | Civil Infrastructure',
    bio: 'Site engineer with 4 years hands-on field experience in highway construction, earthworks, and structural concrete pouring.',
    primaryDiscipline: 'Civil Engineering',
    specializations: ['Highway Engineering', 'Site Supervision'],
    infrastructureSectors: ['Highways', 'Roads & Bridges'],
    yearsOfExperience: 4,
    location: 'Kerala, India',
    preferredLocations: ['Kerala', 'Karnataka'],
    skills: ['Site Supervision', 'Quality Control'],
    structuredSkills: {
      technicalSkills: [
        'Site Supervision',
        'Quality Control / QA/QC',
        'Bar Bending Schedule (BBS)',
      ],
      softwareSkills: ['AutoCAD'],
      industrySkills: ['Highway Construction', 'Earthwork'],
      professionalSkills: ['Subcontractor Coordination'],
    },
    experience: [
      {
        id: 'exp1',
        organization: 'L&T Construction',
        role: 'Site Engineer',
        location: 'Kerala',
        description:
          'Highway EPC pavement planning and daily progress tracking',
        skillsUsed: ['Site Supervision', 'Quality Control / QA/QC'],
        softwareUsed: ['AutoCAD'],
        infrastructureSector: 'Highways',
        startDate: new Date('2020-01-01'),
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
    certifications: [
      {
        name: 'OSHA Construction Safety',
        issuingOrganization: 'OSHA Academy',
        issueDate: new Date('2021-06-01'),
      },
    ],
    careerPreferences: {
      openToOpportunities: true,
      preferredRoles: ['Planning Engineer', 'Project Engineer'],
      preferredSectors: ['Highways', 'Roads & Bridges'],
      preferredLocations: ['Kerala'],
      preferredWorkMode: 'On-site',
      preferredEmploymentType: 'Full-time',
    },
    avatar: 'https://cdn.zeitnah.com/avatars/vikram.jpg',
    profileVisibility: 'PUBLIC',
    ...overrides,
  };
}

function makeCandidateProjects() {
  return [
    {
      _id: new Types.ObjectId(),
      title: 'NH-66 Highway Expansion',
      description:
        'Four-lane highway widening project involving daily progress scheduling, pavement QA/QC, and BOQ material reconciliation.',
      skills: [
        'Planning & Scheduling',
        'Site Supervision',
        'Quantity Surveying',
      ],
      softwareUsed: ['AutoCAD', 'Primavera P6'],
      infrastructureSector: 'Highways',
      role: 'Section Site Engineer',
    },
  ];
}

// ─── Test Suite: Phase 5 Career Intelligence Engine ──────────────────────────

describe('Phase 5 — Career Intelligence Engine & Taxonomy', () => {
  describe('1. Taxonomy & Career Map Integrity', () => {
    test('Infrastructure role taxonomy contains core engineering and management roles', () => {
      const roles = getAllRoles();
      expect(roles.length).toBeGreaterThanOrEqual(10);
      const roleTitles = roles.map((r) => r.title);
      expect(roleTitles).toContain('Planning Engineer');
      expect(roleTitles).toContain('Site Engineer');
      expect(roleTitles).toContain('Quantity Surveyor');
      expect(roleTitles).toContain('Project Engineer');
      expect(roleTitles).toContain('BIM Engineer');
      expect(roleTitles).toContain('Structural Engineer');
    });

    test('getRoleByTitle retrieves role by canonical name and case-insensitively', () => {
      const role = getRoleByTitle('planning engineer');
      expect(role).toBeDefined();
      expect(role?.title).toBe('Planning Engineer');
      expect(role?.discipline).toBe('Civil Engineering');
      expect(role?.requiredSoftware).toContain('Primavera P6');
    });

    test('getCareerProgression connects predecessor, adjacent, and successor roles', () => {
      const progression = getCareerProgression('Site Engineer');
      expect(progression.currentRole).toBe('Site Engineer');
      expect(progression.successorRoles).toContain('Construction Manager');
      expect(progression.adjacentRoles).toContain('Planning Engineer');
    });

    test('getInfrastructureCareerMap returns roles categorized by discipline', () => {
      const map = getInfrastructureCareerMap();
      expect(map['Civil Engineering']).toBeDefined();
      expect(map['Civil Engineering'].roles.length).toBeGreaterThan(0);
      expect(map['Digital Construction & BIM']).toBeDefined();
      expect(
        map['Digital Construction & BIM'].roles.some((r) =>
          r.title.includes('BIM'),
        ),
      ).toBe(true);
    });
  });

  describe('2. Evidence-Based Skill Detection', () => {
    test('Detects explicit skills from structuredSkills and profile skills', () => {
      const user = makeCandidateUser();
      const demonstrated = detectDemonstratedSkills(user, []);

      const skillNames = demonstrated.map((d) => d.skill);
      expect(skillNames).toContain('Site Supervision');
      expect(skillNames).toContain('Quality Control / QA/QC');
      expect(skillNames).toContain('Bar Bending Schedule (BBS)');

      const explicitItem = demonstrated.find(
        (d) => d.skill === 'Site Supervision',
      );
      expect(explicitItem?.evidenceType).toBe(EvidenceType.EXPLICIT_SKILL);
      expect(explicitItem?.confidence).toBe(SkillConfidence.HIGH);
    });

    test('Detects project portfolio evidence and software tools without mutating user document', () => {
      const user = makeCandidateUser({
        skills: ['Site Supervision'],
        structuredSkills: {
          technicalSkills: ['Site Supervision'],
          softwareSkills: [],
          industrySkills: [],
          professionalSkills: [],
        },
      });
      const originalUserCopy = JSON.parse(JSON.stringify(user));
      const projects = makeCandidateProjects();

      const demonstrated = detectDemonstratedSkills(user, projects);
      const skillNames = demonstrated.map((d) => d.skill);

      // Primavera P6 was used in project, not in profile
      expect(skillNames).toContain('Primavera P6');
      expect(skillNames).toContain('Planning & Scheduling');

      const p6Item = demonstrated.find((d) => d.skill === 'Primavera P6');
      expect(p6Item?.evidenceType).toBe(EvidenceType.PROJECT_EVIDENCE);
      expect(p6Item?.source).toContain('NH-66');

      // CRITICAL: User object was NOT mutated
      expect(user.skills).toEqual(originalUserCopy.skills);
      expect(user.structuredSkills.softwareSkills).toEqual([]);
    });

    test('Software aliases normalize canonically (P6 -> Primavera P6, autocad -> AutoCAD)', () => {
      expect(normalizeSoftware('P6')).toBe('Primavera P6');
      expect(normalizeSoftware('primavera')).toBe('Primavera P6');
      expect(normalizeSoftware('autocad')).toBe('AutoCAD');
      expect(normalizeSoftware('civil 3d')).toBe('Civil 3D');
      expect(normalizeSoftware('revit bim')).toBe('Revit');
    });
  });

  describe('3. Profile Completeness vs Profile Strength', () => {
    test('Completeness and Strength are evaluated separately', () => {
      const user = makeCandidateUser();
      const projects = makeCandidateProjects();
      const demonstrated = detectDemonstratedSkills(user, projects);

      const completeness = calculateProfileCompleteness(user, projects);
      const strength = calculateProfileStrength(user, projects, demonstrated);

      expect(typeof completeness).toBe('number');
      expect(completeness).toBeGreaterThanOrEqual(80);

      expect(strength.level).toBe(ProfileStrengthLevel.STRONG);
      expect(strength.evidence.length).toBe(5);
      expect(
        strength.evidence.every((e) => typeof e.verified === 'boolean'),
      ).toBe(true);
    });

    test('Profile with minimal project and skill depth produces EMERGING strength', () => {
      const emptyUser = makeCandidateUser({
        yearsOfExperience: 0,
        experience: [],
        skills: [],
        structuredSkills: {
          technicalSkills: [],
          softwareSkills: [],
          industrySkills: [],
          professionalSkills: [],
        },
        careerPreferences: {
          openToOpportunities: false,
          preferredRoles: [],
          preferredLocations: [],
        },
      });

      const strength = calculateProfileStrength(emptyUser, [], []);
      expect(strength.level).toBe(ProfileStrengthLevel.EMERGING);
      expect(
        strength.evidence.filter((e) => e.verified).length,
      ).toBeLessThanOrEqual(1);
    });
  });

  describe('4. Infrastructure Role Alignment Evaluation', () => {
    test('Evaluates alignment level, match reasons, and development gaps', () => {
      const user = makeCandidateUser();
      const projects = makeCandidateProjects();
      const demonstrated = detectDemonstratedSkills(user, projects);
      const planningRole = getRoleByTitle('Planning Engineer');

      const alignment = evaluateRoleAlignment(
        planningRole,
        user,
        projects,
        demonstrated,
        12,
      );

      expect(alignment.roleTitle).toBe('Planning Engineer');
      expect(alignment.alignmentScore).toBeGreaterThanOrEqual(60);
      expect([
        RoleAlignmentLevel.STRONG,
        RoleAlignmentLevel.MODERATE,
      ]).toContain(alignment.alignmentLevel);
      expect(alignment.demonstratedReasons.length).toBeGreaterThan(0);
      expect(
        alignment.demonstratedReasons.some((r) =>
          r.includes('Civil Engineering'),
        ),
      ).toBe(true);
      expect(alignment.relevantJobCount).toBe(12);
    });

    test('Discipline mismatch results in lower alignment score without crashing', () => {
      const user = makeCandidateUser({
        primaryDiscipline: 'Environmental Engineering',
      });
      const structuralRole = getRoleByTitle('Structural Engineer');

      const alignment = evaluateRoleAlignment(structuralRole, user, [], [], 0);
      expect(alignment.alignmentScore).toBeLessThan(60);
      expect(alignment.alignmentLevel).toBe(RoleAlignmentLevel.EMERGING);
    });
  });

  describe('5. Skill Gap Analysis for Target Role', () => {
    test('Differentiates demonstrated skills from non-demonstrated skills with careful phrasing', () => {
      const user = makeCandidateUser();
      const projects = makeCandidateProjects();
      const demonstrated = detectDemonstratedSkills(user, projects);

      const gaps = analyzeTargetRoleSkillGaps(
        'Planning Engineer',
        demonstrated,
        projects,
      );

      expect(gaps.demonstratedSkills.length).toBeGreaterThan(0);
      const demonstratedNames = gaps.demonstratedSkills.map((d) => d.skill);
      expect(demonstratedNames).toContain('Planning & Scheduling');

      expect(gaps.gapSkills.length).toBeGreaterThan(0);
      // Missing skill is phrased as NOT_DEMONSTRATED
      expect(gaps.gapSkills.every((g) => g.status === 'NOT_DEMONSTRATED')).toBe(
        true,
      );
      expect(
        gaps.gapSkills.some((g) =>
          g.recommendedAction.includes('project portfolio'),
        ),
      ).toBe(true);
    });
  });

  describe('6. Career Pathways & Profile Improvement Recommendations', () => {
    test('Generates step-by-step career pathway progression towards target role', () => {
      const steps = generateCareerPathwaySteps(
        'Site Engineer',
        'Planning Engineer',
        [
          {
            skill: 'Delay Analysis',
            status: 'NOT_DEMONSTRATED',
            importance: 'REQUIRED',
            recommendedAction: 'Build experience',
          },
        ],
      );

      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(steps[0].stepNumber).toBe(1);
      expect(steps[0].title).toContain('Delay Analysis');
      expect(steps.some((s) => s.skillType === 'SOFTWARE_TOOL')).toBe(true);
      expect(steps.some((s) => s.skillType === 'PROJECT_PORTFOLIO')).toBe(true);
    });

    test('Generates actionable profile recommendations based on missing data', () => {
      const user = makeCandidateUser({
        careerPreferences: { preferredRoles: [], preferredLocations: [] },
      });
      const recs = generateProfileRecommendations(user, [], [], []);

      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some((r) => r.category === 'PROJECTS')).toBe(true);
      expect(recs.some((r) => r.category === 'CAREER_PREFERENCES')).toBe(true);
    });
  });
});

// ─── Test Suite: Phase 5 Career Intelligence Service ─────────────────────────

describe('Phase 5 — Career Intelligence Service Integration & Invalidation', () => {
  let service: CareerIntelligenceService;
  let mockInsightModel: any;
  let mockSnapshotModel: any;
  let mockUserModel: any;
  let mockOppModel: any;
  let mockProjectModel: any;
  let mockAuditLogsService: any;

  beforeEach(() => {
    mockInsightModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      create: jest.fn(),
    };

    mockSnapshotModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            observationWindow:
              'Observed across 35 active Zeitnah infrastructure jobs in the last 90 days',
            totalActiveJobs: 35,
            roleDemand: [
              {
                roleTitle: 'Planning Engineer',
                activeJobCount: 14,
                trend: 'UP',
              },
            ],
            softwareDemand: [
              {
                softwareName: 'Primavera P6',
                frequency: 22,
                percentage: 63,
                trend: 'UP',
              },
            ],
            skillDemand: [
              {
                skillName: 'Planning & Scheduling',
                frequency: 20,
                percentage: 57,
                trend: 'UP',
              },
            ],
            sectorDemand: [{ sectorName: 'Highways', count: 18 }],
            locationDemand: [{ location: 'Kerala', count: 15 }],
          }),
        }),
      }),
      create: jest.fn(),
    };

    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn().mockResolvedValue(true),
    };

    mockOppModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              title: 'Planning Engineer',
              requiredSkills: ['Planning & Scheduling'],
              requiredSoftware: ['Primavera P6'],
              infrastructureSector: 'Highways',
              location: 'Kerala',
            },
          ]),
        }),
      }),
    };

    mockProjectModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(makeCandidateProjects()),
      }),
    };

    mockAuditLogsService = {
      record: jest.fn().mockResolvedValue(true),
    };

    service = new CareerIntelligenceService(
      mockInsightModel,
      mockSnapshotModel,
      mockUserModel,
      mockOppModel,
      mockProjectModel,
      mockAuditLogsService,
    );
  });

  test('getCareerOverview returns profile strength and career summary', async () => {
    const userId = new Types.ObjectId().toString();
    mockInsightModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        userId,
        status: 'ACTIVE',
        profileCompleteness: 88,
        profileStrength: ProfileStrengthLevel.STRONG,
        profileStrengthEvidence: [],
        careerSummary: {
          currentPosition: 'Site Engineer',
          primaryDiscipline: 'Civil Engineering',
          yearsOfExperience: 4,
          keySoftware: ['AutoCAD', 'Primavera P6'],
          targetRoles: ['Planning Engineer'],
        },
        primaryTargetRole: 'Planning Engineer',
        secondaryTargetRoles: [],
        roleAlignments: [],
        profileRecommendations: [],
        generatedAt: new Date(),
        analysisVersion: 'v1',
      }),
    });

    const overview = await service.getCareerOverview(userId);
    expect(overview.profileCompleteness).toBe(88);
    expect(overview.profileStrength).toBe(ProfileStrengthLevel.STRONG);
    expect(overview.primaryTargetRole).toBe('Planning Engineer');
    expect(overview.careerSummary.yearsOfExperience).toBe(4);
  });

  test('updateTargetRoles updates user preferences and refreshes insight', async () => {
    const userId = new Types.ObjectId().toString();
    const candidate = makeCandidateUser();
    mockUserModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(candidate),
    });
    mockInsightModel.findOneAndUpdate.mockReturnValue({
      toObject: jest.fn().mockReturnValue({
        userId,
        primaryTargetRole: 'Planning Engineer',
      }),
    });

    const res = await service.updateTargetRoles(userId, {
      primaryTargetRole: 'Planning Engineer',
      secondaryTargetRoles: ['Project Engineer'],
    });

    expect(res.success).toBe(true);
    expect(res.primaryTargetRole).toBe('Planning Engineer');
    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        $set: {
          'careerPreferences.preferredRoles': [
            'Planning Engineer',
            'Project Engineer',
          ],
        },
      }),
    );
    expect(mockAuditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CAREER_TARGET_ROLES_UPDATED',
      }),
    );
  });

  test('getMarketBenchmarks displays observation window and demand signals', async () => {
    const benchmarks = await service.getMarketBenchmarks();
    expect(benchmarks.observationWindow).toContain('last 90 days');
    expect(benchmarks.totalActiveJobs).toBe(35);
    expect(
      benchmarks.softwareDemand.some(
        (s: any) => s.softwareName === 'Primavera P6',
      ),
    ).toBe(true);
    expect(
      benchmarks.roleDemand.some(
        (r: any) => r.roleTitle === 'Planning Engineer',
      ),
    ).toBe(true);
  });

  test('askCareerAssistant answers with profile and market grounding without hallucinating', async () => {
    const userId = new Types.ObjectId().toString();
    const candidate = makeCandidateUser();
    mockUserModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(candidate),
    });

    const response = await service.askCareerAssistant(
      userId,
      'What skills should I strengthen for planning engineer roles?',
    );

    expect(response.answer).toBeDefined();
    expect(response.answer.length).toBeGreaterThan(20);
    expect(response.profileReferences.length).toBeGreaterThan(0);
    expect(
      response.profileReferences.some(
        (r) => r.includes('Civil Engineering') || r.includes('experience'),
      ),
    ).toBe(true);
    expect(response.marketReferences[0]).toContain(
      'active Zeitnah infrastructure jobs',
    );
    expect(response.suggestedActionItems.length).toBeGreaterThan(0);
  });

  test('invalidateUserCareerInsight marks insight as STALE', async () => {
    const userId = new Types.ObjectId().toString();
    await service.invalidateUserCareerInsight(userId);

    expect(mockInsightModel.updateOne).toHaveBeenCalledWith(
      { userId: new Types.ObjectId(userId) },
      { $set: { status: 'STALE' } },
    );
  });
});
