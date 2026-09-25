/**
 * ZEITNAH PHASE 4 — AI-Powered Talent → Job Matching ("Jobs For You")
 * Comprehensive Test Suite
 */
import { Types } from 'mongoose';
import {
  calculateMatch,
  determineRecommendationTypes,
  MATCH_WEIGHTS,
  MATCH_THRESHOLDS,
  JobProfile,
  CandidateProfile,
} from './matching/matching.engine';
import {
  MatchCategory,
  MatchStatus,
} from './matching/schemas/job-talent-match.schema';
import { RecommendationFeedback } from './matching/schemas/user-job-recommendation.schema';
import { MatchingService } from './matching/matching.service';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function makeJobProfile(overrides: Partial<JobProfile> = {}): JobProfile {
  return {
    title: 'Planning Engineer',
    description: 'Highway EPC project planning role in Kerala',
    discipline: 'Civil Engineering',
    specialization: 'Highway Engineering',
    infrastructureSector: 'Highways',
    minYearsExperience: 3,
    maxYearsExperience: 6,
    requiredSkills: ['Planning & Scheduling', 'Quantity Surveying'],
    preferredSkills: ['Site Supervision'],
    requiredSoftware: ['AutoCAD'],
    preferredSoftware: ['Primavera P6'],
    requiredEducation: 'B.Tech Civil Engineering',
    requiredCertifications: [],
    preferredCertifications: ['PMP'],
    location: 'Kerala',
    workMode: 'On-site',
    responsibilities: 'Prepare project schedules and BOQ monitoring',
    requirements: 'B.Tech in Civil Engineering with 3+ years experience',
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
    headline: 'Planning Engineer | Civil Infrastructure',
    currentRole: 'Planning Engineer',
    primaryRole: 'PROFESSIONAL',
    primaryDiscipline: 'Civil Engineering',
    specializations: ['Highway Engineering'],
    infrastructureSectors: ['Highways'],
    yearsOfExperience: 4,
    location: 'Kerala',
    preferredLocations: ['Kerala'],
    skills: ['Planning & Scheduling', 'Quantity Surveying'],
    structuredSkills: {
      technicalSkills: ['Planning & Scheduling', 'Quantity Surveying'],
      softwareSkills: ['AutoCAD'],
      industrySkills: ['Highway Construction'],
      professionalSkills: ['Contract Administration'],
    },
    experience: [
      {
        id: 'exp1',
        organization: 'L&T Infrastructure',
        role: 'Planning Engineer',
        location: 'Kerala',
        description: 'Highway EPC project planning and BOQ estimation',
        skillsUsed: ['Planning & Scheduling'],
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
    certifications: [],
    projects: [
      {
        title: 'NH-66 Highway Bypass',
        description: 'Four-lane highway construction and pavement planning',
        skills: ['Planning & Scheduling'],
        softwareUsed: ['AutoCAD'],
        infrastructureSector: 'Highways',
        role: 'Site Planning Engineer',
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
    availability: 'OPEN_TO_OPPORTUNITIES',
    discoverableToRecruiters: true,
    profileVisibility: 'PUBLIC',
    ...overrides,
  };
}

// ─── Test Suite: Phase 4 Talent → Job Matching ──────────────────────────────

describe('Phase 4 — Talent → Job Matching Engine ("Jobs For You")', () => {
  describe('1. Hard Requirement Eligibility Validation', () => {
    test('Candidate meeting all hard requirements passes eligibility', () => {
      const job = makeJobProfile({
        minYearsExperience: 3,
        discipline: 'Civil Engineering',
        requiredSoftware: ['AutoCAD'],
      });
      const candidate = makeCandidateProfile({
        yearsOfExperience: 4,
        primaryDiscipline: 'Civil Engineering',
        structuredSkills: {
          technicalSkills: ['Planning & Scheduling'],
          softwareSkills: ['AutoCAD'],
          industrySkills: [],
          professionalSkills: [],
        },
      });

      const match = calculateMatch(job, candidate);
      expect(match.passesHardRequirements).toBe(true);
      expect(match.hardRequirementFailures).toHaveLength(0);
      expect(match.score).toBeGreaterThanOrEqual(
        MATCH_THRESHOLDS.STRONGLY_COMPATIBLE,
      );
    });

    test('Candidate failing minimum experience by > 1 year fails hard requirements', () => {
      const job = makeJobProfile({ minYearsExperience: 5 });
      const candidate = makeCandidateProfile({ yearsOfExperience: 2 });

      const match = calculateMatch(job, candidate);
      expect(match.passesHardRequirements).toBe(false);
      expect(
        match.hardRequirementFailures.some((f) => f.type === 'experience'),
      ).toBe(true);
      // Validating that candidate meeting experience scores higher
      const eligibleCandidate = makeCandidateProfile({ yearsOfExperience: 5 });
      const eligibleMatch = calculateMatch(job, eligibleCandidate);
      expect(eligibleMatch.passesHardRequirements).toBe(true);
      expect(eligibleMatch.score).toBeGreaterThan(match.score);
    });

    test('Candidate missing mandatory required software fails hard requirements', () => {
      const job = makeJobProfile({ requiredSoftware: ['Revit BIM'] });
      const candidate = makeCandidateProfile({
        structuredSkills: {
          technicalSkills: ['Planning'],
          softwareSkills: ['AutoCAD'], // Missing Revit BIM
          industrySkills: [],
          professionalSkills: [],
        },
        projects: [],
      });

      const match = calculateMatch(job, candidate);
      expect(match.passesHardRequirements).toBe(false);
      expect(
        match.hardRequirementFailures.some(
          (f) => f.type === 'software' && String(f.expected).includes('Revit'),
        ),
      ).toBe(true);
    });

    test('Candidate missing mandatory certification fails hard requirements', () => {
      const job = makeJobProfile({
        requiredCertifications: ['Chartered Engineer (CEng)'],
      });
      const candidate = makeCandidateProfile({ certifications: [] });

      const match = calculateMatch(job, candidate);
      expect(match.passesHardRequirements).toBe(false);
      expect(
        match.hardRequirementFailures.some((f) => f.type === 'certification'),
      ).toBe(true);
    });

    test('Candidate missing PREFERRED software does NOT fail hard requirements', () => {
      const job = makeJobProfile({
        requiredSoftware: ['AutoCAD'],
        preferredSoftware: ['Primavera P6'],
      });
      const candidate = makeCandidateProfile({
        structuredSkills: {
          technicalSkills: ['Planning & Scheduling'],
          softwareSkills: ['AutoCAD'], // Has AutoCAD, missing preferred Primavera P6
          industrySkills: [],
          professionalSkills: [],
        },
      });

      const match = calculateMatch(job, candidate);
      expect(match.passesHardRequirements).toBe(true);
      expect(match.gapReasons.some((g) => g.includes('Primavera P6'))).toBe(
        true,
      );
      expect(match.score).toBeGreaterThan(60);
    });
  });

  describe('2. Multi-Dimensional Contextual Matching & Explanations', () => {
    test('Role alignment strongly impacts compatibility score', () => {
      const job = makeJobProfile({ title: 'Planning Engineer' });
      const strongCandidate = makeCandidateProfile({
        currentRole: 'Planning Engineer',
        careerPreferences: {
          openToOpportunities: true,
          preferredRoles: ['Planning Engineer'],
          preferredSectors: ['Highways'],
          preferredLocations: ['Kerala'],
          preferredWorkMode: 'On-site',
          preferredEmploymentType: 'Full-time',
        },
      });

      const weakCandidate = makeCandidateProfile({
        currentRole: 'Mechanical HVAC Technician',
        headline: 'HVAC Specialist',
        careerPreferences: {
          openToOpportunities: true,
          preferredRoles: ['HVAC Engineer'],
          preferredSectors: ['MEP'],
          preferredLocations: ['Kerala'],
          preferredWorkMode: 'On-site',
          preferredEmploymentType: 'Full-time',
        },
      });

      const matchStrong = calculateMatch(job, strongCandidate);
      const matchWeak = calculateMatch(job, weakCandidate);

      expect(matchStrong.score).toBeGreaterThan(matchWeak.score);
      const careerDimStrong = matchStrong.dimensionScores.find(
        (d) => d.dimension === 'careerIntent',
      );
      const careerDimWeak = matchWeak.dimensionScores.find(
        (d) => d.dimension === 'careerIntent',
      );
      expect(careerDimStrong.score).toBeGreaterThan(careerDimWeak.score);
    });

    test('Infrastructure sector alignment boosts matching score', () => {
      const job = makeJobProfile({ infrastructureSector: 'Highways' });
      const highwayCandidate = makeCandidateProfile({
        infrastructureSectors: ['Highways'],
      });
      const waterCandidate = makeCandidateProfile({
        infrastructureSectors: ['Water & Wastewater'],
        experience: [],
        projects: [],
      });

      const highwayMatch = calculateMatch(job, highwayCandidate);
      const waterMatch = calculateMatch(job, waterCandidate);

      expect(highwayMatch.score).toBeGreaterThan(waterMatch.score);
      expect(highwayMatch.matchedSectors).toContain('Highways');
    });

    test('Project experience in target sector adds matching weight', () => {
      const job = makeJobProfile({ infrastructureSector: 'Highways' });
      const candidateWithProjects = makeCandidateProfile({
        projects: [
          {
            title: 'NH-66 Four Laning',
            description: 'Highway EPC project in Kerala',
            infrastructureSector: 'Highways',
            skills: ['Planning & Scheduling'],
            softwareUsed: ['AutoCAD'],
            role: 'Planning Engineer',
          },
        ],
      });
      const candidateNoProjects = makeCandidateProfile({
        projects: [],
      });

      const matchWithProj = calculateMatch(job, candidateWithProjects);
      const matchNoProj = calculateMatch(job, candidateNoProjects);

      expect(matchWithProj.matchedProjects.length).toBeGreaterThan(0);
      const projDimWith = matchWithProj.dimensionScores.find(
        (d) => d.dimension === 'projects',
      );
      const projDimNo = matchNoProj.dimensionScores.find(
        (d) => d.dimension === 'projects',
      );
      expect(projDimWith.score).toBeGreaterThan(projDimNo.score);
    });

    test('Match explanation contains specific reasons and identified gaps', () => {
      const job = makeJobProfile({
        requiredSkills: ['Planning & Scheduling'],
        preferredSkills: ['Site Supervision'],
        requiredSoftware: ['AutoCAD'],
        preferredSoftware: ['Primavera P6'],
      });
      const candidate = makeCandidateProfile({
        structuredSkills: {
          technicalSkills: ['Planning & Scheduling'],
          softwareSkills: ['AutoCAD'],
          industrySkills: [],
          professionalSkills: [],
        },
      });

      const match = calculateMatch(job, candidate);
      expect(match.matchReasons.length).toBeGreaterThan(0);
      expect(
        match.matchReasons.some(
          (r) => r.includes('Civil Engineering') || r.includes('AutoCAD'),
        ),
      ).toBe(true);
      expect(match.gapReasons.length).toBeGreaterThan(0);
      expect(match.gapReasons.some((g) => g.includes('Primavera P6'))).toBe(
        true,
      );
    });
  });

  describe('3. Recommendation Types Generation', () => {
    test('Correctly tags recommendation types: role_match, skill_match, software_match, sector_match, project_match', () => {
      const job = makeJobProfile();
      const candidate = makeCandidateProfile();
      const matchResult = calculateMatch(job, candidate);

      const types = determineRecommendationTypes(
        matchResult,
        job,
        candidate,
        true,
      );
      expect(types).toContain('role_match');
      expect(types).toContain('skill_match');
      expect(types).toContain('sector_match');
      expect(types).toContain('software_match');
      expect(types).toContain('project_match');
      expect(types).toContain('new_relevant_job');
    });

    test('Tags location_match when location is closely aligned', () => {
      const job = makeJobProfile({ location: 'Kerala' });
      const candidate = makeCandidateProfile({
        location: 'Kerala',
        preferredLocations: ['Kerala'],
      });
      const matchResult = calculateMatch(job, candidate);
      const types = determineRecommendationTypes(
        matchResult,
        job,
        candidate,
        false,
      );

      expect(types).toContain('location_match');
      expect(types).not.toContain('new_relevant_job');
    });
  });
});

// ─── Test Suite: Phase 4 Matching Service & Invalidation ─────────────────────

describe('Phase 4 — Recommendation Service, Feedback & Cache Invalidation', () => {
  let matchingService: MatchingService;
  let mockMatchModel: any;
  let mockUserJobRecModel: any;
  let mockOppModel: any;
  let mockUserModel: any;
  let mockProjectModel: any;
  let mockOrgModel: any;
  let mockJobAppModel: any;
  let mockMembershipModel: any;
  let mockAuditLogsService: any;

  beforeEach(() => {
    mockMatchModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 4 }),
      updateOne: jest.fn(),
      bulkWrite: jest.fn(),
    };

    mockUserJobRecModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 6 }),
      findOneAndUpdate: jest.fn().mockResolvedValue({ isHidden: true }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      insertMany: jest.fn().mockResolvedValue([]),
    };

    mockOppModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    mockUserModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    mockProjectModel = {
      find: jest.fn(),
    };

    mockOrgModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    mockJobAppModel = {
      find: jest.fn(),
    };

    mockMembershipModel = {
      findOne: jest.fn(),
    };

    mockAuditLogsService = {
      record: jest.fn().mockResolvedValue(true),
    };

    matchingService = new MatchingService(
      mockMatchModel,
      null as any, // inviteModel
      mockOppModel,
      mockOrgModel,
      mockMembershipModel,
      mockUserModel,
      mockProjectModel,
      mockJobAppModel,
      mockAuditLogsService,
      null, // notificationsService
      mockUserJobRecModel,
    );
  });

  test('Candidate profile changes mark candidate recommendations as STALE', async () => {
    const candidateUserId = new Types.ObjectId().toString();
    const modifiedCount =
      await matchingService.invalidateCandidateMatches(candidateUserId);

    expect(mockMatchModel.updateMany).toHaveBeenCalledWith(
      {
        candidateUserId: new Types.ObjectId(candidateUserId),
        status: MatchStatus.ACTIVE,
      },
      { $set: { status: MatchStatus.STALE } },
    );
    expect(mockUserJobRecModel.updateMany).toHaveBeenCalledWith(
      {
        userId: new Types.ObjectId(candidateUserId),
        status: MatchStatus.ACTIVE,
      },
      { $set: { status: MatchStatus.STALE } },
    );
    expect(modifiedCount).toBe(4);
  });

  test('Job requirement changes mark job recommendations as STALE', async () => {
    const jobId = new Types.ObjectId().toString();
    const modifiedCount = await matchingService.invalidateJobMatches(jobId);

    expect(mockMatchModel.updateMany).toHaveBeenCalledWith(
      { jobId: new Types.ObjectId(jobId), status: MatchStatus.ACTIVE },
      { $set: { status: MatchStatus.STALE } },
    );
    expect(mockUserJobRecModel.updateMany).toHaveBeenCalledWith(
      { jobId: new Types.ObjectId(jobId), status: MatchStatus.ACTIVE },
      { $set: { status: MatchStatus.STALE } },
    );
    expect(modifiedCount).toBe(4);
  });

  test('User can hide a recommended job without mutating profile skills', async () => {
    const userId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();

    const res = await matchingService.hideRecommendedJob(userId, jobId);
    expect(res.success).toBe(true);
    expect(mockUserJobRecModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: new Types.ObjectId(userId), jobId: new Types.ObjectId(jobId) },
      { $set: { isHidden: true } },
      { upsert: true, returnDocument: 'after' },
    );
    expect(mockAuditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECOMMENDED_JOB_HIDDEN',
        entityId: jobId,
      }),
    );
  });

  test('User can dismiss a recommended job', async () => {
    const userId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();

    const res = await matchingService.dismissRecommendedJob(userId, jobId);
    expect(res.success).toBe(true);
    expect(mockUserJobRecModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: new Types.ObjectId(userId), jobId: new Types.ObjectId(jobId) },
      { $set: { isDismissed: true } },
      { upsert: true, returnDocument: 'after' },
    );
  });

  test('User feedback (INTERESTED / NOT_INTERESTED) records without altering profile', async () => {
    const userId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();

    const res = await matchingService.recordJobFeedback(
      userId,
      jobId,
      'INTERESTED',
    );
    expect(res.success).toBe(true);
    expect(res.feedback).toBe(RecommendationFeedback.INTERESTED);

    expect(mockUserJobRecModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: new Types.ObjectId(userId), jobId: new Types.ObjectId(jobId) },
      { $set: { feedback: RecommendationFeedback.INTERESTED } },
      { upsert: true, returnDocument: 'after' },
    );
    // Profile is untouched
    expect(mockUserModel.findById).not.toHaveBeenCalled();
  });

  test('Career profile insights aggregates sectors, skills, and actionable advice', async () => {
    const userId = new Types.ObjectId().toString();

    mockUserJobRecModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            compatibilityScore: 92,
            category: MatchCategory.HIGHLY_COMPATIBLE,
            matchedSkills: ['Planning & Scheduling', 'Quantity Surveying'],
            matchedSoftware: ['AutoCAD'],
            matchedSectors: ['Highways'],
            gapReasons: ['Missing software: Primavera P6'],
          },
          {
            compatibilityScore: 85,
            category: MatchCategory.HIGHLY_COMPATIBLE,
            matchedSkills: ['Planning & Scheduling'],
            matchedSoftware: ['AutoCAD'],
            matchedSectors: ['Highways'],
            gapReasons: ['Missing software: Primavera P6'],
          },
        ]),
      }),
    });

    const insights = await matchingService.getProfileJobInsights(userId);

    expect(insights.totalRecommended).toBe(2);
    expect(insights.highlyCompatibleCount).toBe(2);
    expect(insights.topMatchingSectors).toContain('Highways');
    expect(insights.topMatchingSkills).toContain('Planning & Scheduling');
    expect(insights.commonGaps).toHaveLength(1);
    expect(insights.commonGaps[0].gap).toBe('Missing software: Primavera P6');
    expect(insights.profileImprovements.length).toBeGreaterThan(0);
    expect(insights.profileImprovements[0].advice).toContain('Primavera P6');
  });
});
