import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CareerInsight,
  CareerInsightDocument,
  ProfileStrengthLevel,
  RoleAlignmentLevel,
  EvidenceType,
  RoleAlignmentItem,
  TargetRoleSkillGaps,
  TargetRolePathway,
} from './schemas/career-insight.schema';
import {
  InfrastructureMarketSnapshot,
  InfrastructureMarketSnapshotDocument,
} from './schemas/market-snapshot.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  Opportunity,
  OpportunityDocument,
  OpportunityStatus,
} from '../opportunities/schemas/opportunity.schema';
import {
  Project,
  ProjectDocument,
  ProjectVisibility,
} from '../projects/schemas/project.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  INFRASTRUCTURE_ROLE_TAXONOMY,
  getRoleByTitle,
  getAllRoles,
  getCareerProgression,
  getInfrastructureCareerMap,
} from './infrastructure-role.taxonomy';
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
} from './career-intelligence.engine';
import { SetTargetRolesDto } from './dto/career-target.dto';
import { CareerAssistantResponse } from './dto/career-assistant.dto';

@Injectable()
export class CareerIntelligenceService {
  private readonly logger = new Logger(CareerIntelligenceService.name);

  constructor(
    @InjectModel(CareerInsight.name)
    private readonly insightModel: Model<CareerInsightDocument>,
    @InjectModel(InfrastructureMarketSnapshot.name)
    private readonly snapshotModel: Model<InfrastructureMarketSnapshotDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Opportunity.name)
    private readonly oppModel: Model<OpportunityDocument>,
    @Optional()
    @InjectModel(Project.name)
    private readonly projectModel?: Model<ProjectDocument>,
    @Optional()
    private readonly auditLogsService?: AuditLogsService,
  ) {}

  // =========================================================================
  // 1. OVERVIEW & PROFILE STRENGTH
  // =========================================================================

  async getCareerOverview(userId: string) {
    let insight = await this.insightModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!insight || insight.status === 'STALE') {
      insight = (await this.generateCareerInsight(userId)) as any;
    }

    if (!insight) {
      throw new NotFoundException(
        'Career profile insight could not be generated',
      );
    }

    return {
      userId: String(insight.userId),
      profileCompleteness: insight.profileCompleteness,
      profileStrength: insight.profileStrength,
      profileStrengthEvidence: insight.profileStrengthEvidence || [],
      careerSummary: insight.careerSummary,
      primaryTargetRole: insight.primaryTargetRole || 'Planning Engineer',
      secondaryTargetRoles: insight.secondaryTargetRoles || [],
      topRoleAlignments: (insight.roleAlignments || []).slice(0, 3),
      topRecommendations: (insight.profileRecommendations || []).slice(0, 3),
      generatedAt: insight.generatedAt,
      status: insight.status,
      analysisVersion: insight.analysisVersion || 'v1',
    };
  }

  // =========================================================================
  // 2. ROLE ALIGNMENT
  // =========================================================================

  async getRoleAlignments(userId: string) {
    let insight = await this.insightModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!insight || insight.status === 'STALE') {
      insight = (await this.generateCareerInsight(userId)) as any;
    }

    const alignments = (insight?.roleAlignments || []).sort(
      (a: any, b: any) => b.alignmentScore - a.alignmentScore,
    );

    return {
      userId,
      totalRolesAnalyzed: alignments.length,
      primaryTargetRole: insight?.primaryTargetRole,
      alignments,
    };
  }

  // =========================================================================
  // 3. SKILL GAPS FOR TARGET ROLE
  // =========================================================================

  async getSkillGaps(userId: string, targetRoleTitle?: string) {
    let insight = await this.insightModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!insight || insight.status === 'STALE') {
      insight = (await this.generateCareerInsight(userId)) as any;
    }

    const selectedRoleTitle =
      targetRoleTitle || insight?.primaryTargetRole || 'Planning Engineer';

    // Find pre-calculated or compute on the fly
    let skillGaps = (insight?.skillGaps || []).find(
      (sg: any) =>
        sg.targetRole.toLowerCase() === selectedRoleTitle.toLowerCase(),
    );

    if (!skillGaps) {
      const user = await this.userModel.findById(userId).lean();
      if (!user) throw new NotFoundException('User not found');
      let projects: any[] = [];
      if (this.projectModel) {
        projects = await this.projectModel
          .find({
            ownerId: new Types.ObjectId(userId),
            visibility: { $ne: ProjectVisibility.PRIVATE },
          })
          .lean();
      }
      const demonstrated = detectDemonstratedSkills(user, projects);
      const computed = analyzeTargetRoleSkillGaps(
        selectedRoleTitle,
        demonstrated,
        projects,
      );
      skillGaps = {
        targetRole: selectedRoleTitle,
        demonstratedSkills: computed.demonstratedSkills,
        gapSkills: computed.gapSkills,
      };
    }

    const roleDef = getRoleByTitle(selectedRoleTitle);

    return {
      userId,
      targetRole: selectedRoleTitle,
      roleTier: roleDef?.tier || 'MID_LEVEL',
      discipline: roleDef?.discipline || 'Civil Engineering',
      demonstratedSkills: skillGaps.demonstratedSkills || [],
      gapSkills: skillGaps.gapSkills || [],
      missingRequiredCount: (skillGaps.gapSkills || []).filter(
        (g: any) => g.importance === 'REQUIRED',
      ).length,
      missingPreferredCount: (skillGaps.gapSkills || []).filter(
        (g: any) => g.importance === 'PREFERRED',
      ).length,
    };
  }

  // =========================================================================
  // 4. SET TARGET ROLES
  // =========================================================================

  async updateTargetRoles(userId: string, dto: SetTargetRolesDto) {
    if (!dto.primaryTargetRole) {
      throw new BadRequestException('Primary target role is required');
    }

    // Update user career preferences
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        'careerPreferences.preferredRoles': [
          dto.primaryTargetRole,
          ...(dto.secondaryTargetRoles || []),
        ],
      },
    });

    // Invalidate and recalculate insight
    await this.insightModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          primaryTargetRole: dto.primaryTargetRole,
          secondaryTargetRoles: dto.secondaryTargetRoles || [],
          status: 'STALE',
        },
      },
    );

    const refreshed = await this.generateCareerInsight(userId);

    if (this.auditLogsService) {
      await this.auditLogsService.record({
        actor: new Types.ObjectId(userId),
        action: 'CAREER_TARGET_ROLES_UPDATED',
        entityType: 'User',
        entityId: userId,
        message: `Candidate updated target roles: Primary="${dto.primaryTargetRole}"`,
        metadata: {
          primary: dto.primaryTargetRole,
          secondary: dto.secondaryTargetRoles,
        },
      });
    }

    return {
      success: true,
      primaryTargetRole: dto.primaryTargetRole,
      secondaryTargetRoles: dto.secondaryTargetRoles || [],
      insight: refreshed,
    };
  }

  // =========================================================================
  // 5. CAREER PATHWAYS & CAREER MAP
  // =========================================================================

  async getCareerPathways(userId: string, targetRoleTitle?: string) {
    let insight = await this.insightModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!insight || insight.status === 'STALE') {
      insight = (await this.generateCareerInsight(userId)) as any;
    }

    const currentPosition =
      insight?.careerSummary?.currentPosition || 'Site Engineer';
    const selectedRoleTitle =
      targetRoleTitle || insight?.primaryTargetRole || 'Planning Engineer';

    const progression = getCareerProgression(currentPosition);

    let pathway = (insight?.skillPathways || []).find(
      (p: any) =>
        p.targetRole.toLowerCase() === selectedRoleTitle.toLowerCase(),
    );

    if (!pathway) {
      const gaps = await this.getSkillGaps(userId, selectedRoleTitle);
      const steps = generateCareerPathwaySteps(
        currentPosition,
        selectedRoleTitle,
        gaps.gapSkills,
      );
      pathway = {
        targetRole: selectedRoleTitle,
        steps,
      };
    }

    return {
      userId,
      currentPosition,
      targetRole: selectedRoleTitle,
      progressionLadder: progression,
      pathwaySteps: pathway.steps || [],
    };
  }

  getInfrastructureCareerMap() {
    return {
      taxonomyVersion: 'v1',
      disciplines: getInfrastructureCareerMap(),
    };
  }

  // =========================================================================
  // 6. INFRASTRUCTURE JOB MARKET BENCHMARKS
  // =========================================================================

  async getMarketBenchmarks() {
    // Check for cached snapshot within last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    let snapshot = await this.snapshotModel
      .findOne({ snapshotDate: { $gte: oneDayAgo } })
      .sort({ snapshotDate: -1 })
      .lean();

    if (!snapshot) {
      snapshot = (await this.generateMarketSnapshot()) as any;
    }

    return snapshot;
  }

  async generateMarketSnapshot(): Promise<InfrastructureMarketSnapshot> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);

    // Retrieve active published jobs
    const activeJobs = await this.oppModel
      .find({
        status: OpportunityStatus.PUBLISHED,
        createdAt: { $gte: ninetyDaysAgo },
      })
      .select(
        'title requiredSkills preferredSkills requiredSoftware preferredSoftware infrastructureSector location',
      )
      .lean();

    const totalActiveJobs = activeJobs.length;

    // Aggregate Software demand
    const swCountMap: Record<string, number> = {};
    for (const job of activeJobs) {
      const allSw = [
        ...(job.requiredSoftware || []),
        ...(job.preferredSoftware || []),
      ].map(normalizeSoftware);
      for (const sw of new Set(allSw)) {
        if (sw) swCountMap[sw] = (swCountMap[sw] || 0) + 1;
      }
    }
    const softwareDemand = Object.entries(swCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([softwareName, count]) => ({
        softwareName,
        frequency: count,
        percentage:
          totalActiveJobs > 0 ? Math.round((count / totalActiveJobs) * 100) : 0,
        trend: count >= 5 ? ('UP' as const) : ('STABLE' as const),
      }));

    // Aggregate Skill demand
    const skillCountMap: Record<string, number> = {};
    for (const job of activeJobs) {
      const allSkills = [
        ...(job.requiredSkills || []),
        ...(job.preferredSkills || []),
      ].map(normalizeSkill);
      for (const sk of new Set(allSkills)) {
        if (sk) skillCountMap[sk] = (skillCountMap[sk] || 0) + 1;
      }
    }
    const skillDemand = Object.entries(skillCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skillName, count]) => ({
        skillName,
        frequency: count,
        percentage:
          totalActiveJobs > 0 ? Math.round((count / totalActiveJobs) * 100) : 0,
        trend: count >= 4 ? ('UP' as const) : ('STABLE' as const),
      }));

    // Aggregate Role demand
    const roleCountMap: Record<string, number> = {};
    for (const job of activeJobs) {
      const title = job.title || 'Other';
      roleCountMap[title] = (roleCountMap[title] || 0) + 1;
    }
    const roleDemand = Object.entries(roleCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([roleTitle, count]) => ({
        roleTitle,
        activeJobCount: count,
        trend: count >= 3 ? ('UP' as const) : ('EMERGING' as const),
      }));

    // Aggregate Sector demand
    const sectorCountMap: Record<string, number> = {};
    for (const job of activeJobs) {
      const sec = job.infrastructureSector || 'Civil Infrastructure';
      sectorCountMap[sec] = (sectorCountMap[sec] || 0) + 1;
    }
    const sectorDemand = Object.entries(sectorCountMap)
      .sort((a, b) => b[1] - a[1])
      .map(([sectorName, count]) => ({ sectorName, count }));

    // Aggregate Location demand
    const locCountMap: Record<string, number> = {};
    for (const job of activeJobs) {
      const loc = job.location || 'Pan-India';
      locCountMap[loc] = (locCountMap[loc] || 0) + 1;
    }
    const locationDemand = Object.entries(locCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([location, count]) => ({ location, count }));

    const snapshot = await this.snapshotModel.create({
      snapshotDate: new Date(),
      observationWindow: `Observed across ${totalActiveJobs} active Zeitnah infrastructure jobs in the last 90 days`,
      source: 'Zeitnah Infrastructure Network Platform',
      observationPeriod: 'Previous 90 days',
      population: `${totalActiveJobs} active published infrastructure jobs`,
      calculationMethod:
        'Deterministic frequency distribution and percentile calculation across active Zeitnah job postings',
      disclaimer: `Based on ${totalActiveJobs} active Zeitnah infrastructure jobs observed during the previous 90 days. This reflects Zeitnah platform demand and is not presented as universal industry truth.`,
      totalActiveJobs,
      roleDemand,
      skillDemand,
      softwareDemand,
      sectorDemand,
      locationDemand,
      modelVersion: 'v1',
    });

    return snapshot.toObject();
  }

  // =========================================================================
  // 7. PROFILE IMPROVEMENT RECOMMENDATIONS
  // =========================================================================

  async getProfileRecommendations(userId: string) {
    let insight = await this.insightModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!insight || insight.status === 'STALE') {
      insight = (await this.generateCareerInsight(userId)) as any;
    }

    return {
      userId,
      recommendations: insight?.profileRecommendations || [],
    };
  }

  // =========================================================================
  // 8. AI CAREER ASSISTANT (Grounded Factual Decision Support)
  // =========================================================================

  async askCareerAssistant(
    userId: string,
    question: string,
  ): Promise<CareerAssistantResponse> {
    if (!question || question.trim().length === 0) {
      throw new BadRequestException('Question cannot be empty');
    }

    const cleanQuestion = question.trim();

    // Fetch user and profile context
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new NotFoundException('User not found');

    let projects: any[] = [];
    if (this.projectModel) {
      projects = await this.projectModel
        .find({
          ownerId: new Types.ObjectId(userId),
          visibility: { $ne: ProjectVisibility.PRIVATE },
        })
        .lean();
    }

    const demonstratedSkills = detectDemonstratedSkills(user, projects);
    const softwareList = demonstratedSkills
      .filter((d) => d.evidenceType === EvidenceType.SOFTWARE_PROFICIENCY)
      .map((d) => d.skill);
    const yearsExp =
      user.yearsOfExperience ||
      (user.experience?.length ? user.experience.length : 0);
    const discipline = user.primaryDiscipline || 'Civil Engineering';
    const sectors = user.infrastructureSectors || ['Civil Infrastructure'];

    // Retrieve market snapshot
    const market = await this.getMarketBenchmarks();

    const profileReferences: string[] = [
      `${yearsExp} years infrastructure experience listed`,
      `${discipline} primary discipline`,
      `${projects.length} project portfolio entries`,
      softwareList.length > 0
        ? `Tools: ${softwareList.join(', ')}`
        : 'No software tools listed',
    ];

    const marketReferences: string[] = [
      `Based on ${market.totalActiveJobs} active Zeitnah infrastructure jobs observed in the last 90 days`,
    ];

    const lowerQ = cleanQuestion.toLowerCase();
    let answer = '';
    const suggestedActionItems: string[] = [];
    let relatedRole: string | undefined = undefined;

    // Detect role in question
    for (const role of INFRASTRUCTURE_ROLE_TAXONOMY) {
      if (
        lowerQ.includes(role.title.toLowerCase()) ||
        lowerQ.includes(role.id.replace('-', ' '))
      ) {
        relatedRole = role.title;
        break;
      }
    }
    if (!relatedRole && lowerQ.includes('planning'))
      relatedRole = 'Planning Engineer';
    if (!relatedRole && lowerQ.includes('site')) relatedRole = 'Site Engineer';
    if (!relatedRole && lowerQ.includes('qs'))
      relatedRole = 'Quantity Surveyor';
    if (!relatedRole && lowerQ.includes('bim')) relatedRole = 'BIM Engineer';

    if (
      lowerQ.includes('missing') ||
      lowerQ.includes('improve') ||
      lowerQ.includes('profile')
    ) {
      // Missing profile details query
      answer = `Based on your profile, you have ${yearsExp} years of experience and ${discipline} listed. To strengthen your visibility, consider documenting:`;
      if (projects.length === 0) {
        answer += `\n1. At least one infrastructure project showing your specific site responsibilities.`;
        suggestedActionItems.push(
          'Add an infrastructure project to your portfolio',
        );
      }
      if (softwareList.length === 0) {
        answer += `\n2. Key software tools you use on site (e.g. AutoCAD, Primavera P6, or Revit).`;
        suggestedActionItems.push(
          'Add software tools to your structured skills',
        );
      }
      if (!user.careerPreferences?.preferredRoles?.length) {
        answer += `\n3. Your target career roles and locations under Career Preferences.`;
        suggestedActionItems.push('Set your career preferences');
      }
      answer += `\nProfile improvements help personalize your Jobs For You recommendations and demonstrate verified capability to recruiters.`;
    } else if (relatedRole) {
      // Role-specific query
      const roleDef = getRoleByTitle(relatedRole);
      const skillGaps = analyzeTargetRoleSkillGaps(
        relatedRole,
        demonstratedSkills,
        projects,
      );
      const missingRequired = skillGaps.gapSkills.filter(
        (g) => g.importance === 'REQUIRED',
      );

      answer = `For ${relatedRole} roles in ${discipline}, Zeitnah market data indicates that employers prioritize:\n`;
      answer += `• Required skills: ${roleDef?.requiredSkills.join(', ')}\n`;
      answer += `• Core software: ${roleDef?.requiredSoftware.join(', ')}\n\n`;

      if (missingRequired.length > 0) {
        answer += `In your profile, the following competencies are currently not demonstrated:\n`;
        answer += missingRequired
          .map((m) => `• ${m.skill}: ${m.recommendedAction}`)
          .join('\n');
        suggestedActionItems.push(
          `Strengthen ${missingRequired[0].skill} through project experience`,
        );
      } else {
        answer += `Your profile strongly demonstrates the core technical requirements for ${relatedRole}! Focus on highlighting quantifiable project achievements.`;
      }
    } else if (lowerQ.includes('project') || lowerQ.includes('evidence')) {
      // Project evidence query
      if (projects.length > 0) {
        answer = `Your profile contains ${projects.length} project portfolio entry/entries:\n`;
        for (const p of projects) {
          const pSw = (p.softwareUsed || []).join(', ') || 'None listed';
          answer += `• "${p.title}" (${p.infrastructureSector || 'Infrastructure'}): Tools: ${pSw}.\n`;
        }
        answer += `\nTo maximize evidence strength, ensure each project specifies your exact responsibilities (e.g., progress scheduling, BOQ preparation, or QA/QC inspections).`;
        suggestedActionItems.push(
          'Refine project descriptions with quantitative outcomes',
        );
      } else {
        answer = `You do not currently have any published infrastructure projects. Projects are the single most credible evidence of hands-on field capability.`;
        suggestedActionItems.push('Publish your first infrastructure project');
      }
    } else {
      // General career advice
      answer = `Zeitnah Career Intelligence analyzes your ${discipline} background across ${market.totalActiveJobs} active infrastructure jobs. Your strongest demonstrated tools are ${softwareList.length > 0 ? softwareList.join(', ') : 'field experience'}. You are well-positioned to explore roles in ${sectors.join(', ')}.`;
      suggestedActionItems.push(
        'Review role alignment for target engineering positions',
      );
    }

    return {
      answer,
      profileReferences,
      marketReferences,
      suggestedActionItems,
      relatedRole,
      sourceTimestamp: new Date().toISOString(),
    };
  }

  // =========================================================================
  // 9. CORE PIPELINE: GENERATE & CACHE CAREER INSIGHT
  // =========================================================================

  async generateCareerInsight(userId: string): Promise<CareerInsight> {
    const user = (await this.userModel.findById(userId).lean()) as any;
    if (!user) throw new NotFoundException('User not found');

    let projects: any[] = [];
    if (this.projectModel) {
      projects = await this.projectModel
        .find({
          ownerId: new Types.ObjectId(userId),
          visibility: { $ne: ProjectVisibility.PRIVATE },
        })
        .lean();
    }

    // 1. Detect demonstrated skills
    const demonstratedSkills = detectDemonstratedSkills(user, projects);

    // 2. Profile completeness & strength
    const profileCompleteness = calculateProfileCompleteness(user, projects);
    const { level: profileStrength, evidence: profileStrengthEvidence } =
      calculateProfileStrength(user, projects, demonstratedSkills);

    // 3. Career summary
    const yearsOfExperience =
      user.yearsOfExperience ||
      (user.experience?.length ? user.experience.length : 0);
    const keySoftware = demonstratedSkills
      .filter((d) => d.evidenceType === EvidenceType.SOFTWARE_PROFICIENCY)
      .map((d) => d.skill);

    const primaryTargetRole =
      user.careerPreferences?.preferredRoles?.[0] || 'Planning Engineer';
    const secondaryTargetRoles = (
      user.careerPreferences?.preferredRoles || []
    ).slice(1, 4);

    const careerSummary = {
      currentPosition: user.currentRole || user.headline || 'Site Engineer',
      primaryDiscipline: user.primaryDiscipline || 'Civil Engineering',
      strongAreas: [
        ...(user.specializations || []),
        ...(user.infrastructureSectors || []),
      ].slice(0, 4),
      yearsOfExperience,
      keySoftware,
      targetRoles: [primaryTargetRole, ...secondaryTargetRoles],
    };

    // 4. Role Alignments across all taxonomy roles
    // Fetch active job counts grouped by title
    const activeJobs = await this.oppModel
      .find({ status: OpportunityStatus.PUBLISHED })
      .select('title')
      .lean();
    const jobCountMap: Record<string, number> = {};
    for (const j of activeJobs) {
      const t = (j.title || '').toLowerCase();
      jobCountMap[t] = (jobCountMap[t] || 0) + 1;
    }

    const allRoles = getAllRoles();
    const roleAlignments: RoleAlignmentItem[] = [];
    for (const role of allRoles) {
      const activeCount =
        jobCountMap[role.title.toLowerCase()] ||
        Object.entries(jobCountMap)
          .filter(([k]) => k.includes(role.title.toLowerCase()))
          .reduce((sum, [, c]) => sum + c, 0);

      const alignment = evaluateRoleAlignment(
        role,
        user,
        projects,
        demonstratedSkills,
        activeCount,
      );
      roleAlignments.push(alignment);
    }
    roleAlignments.sort((a, b) => b.alignmentScore - a.alignmentScore);

    // 5. Skill Gaps for target roles
    const targetRolesToAnalyze = [
      primaryTargetRole,
      ...secondaryTargetRoles,
      roleAlignments[0]?.roleTitle,
    ].filter(Boolean);

    const uniqueTargetRoles = Array.from(new Set(targetRolesToAnalyze));
    const skillGaps: TargetRoleSkillGaps[] = [];
    const skillPathways: TargetRolePathway[] = [];

    for (const tRole of uniqueTargetRoles) {
      const gapResult = analyzeTargetRoleSkillGaps(
        tRole,
        demonstratedSkills,
        projects,
      );
      skillGaps.push({
        targetRole: tRole,
        demonstratedSkills: gapResult.demonstratedSkills,
        gapSkills: gapResult.gapSkills,
      });

      const steps = generateCareerPathwaySteps(
        careerSummary.currentPosition,
        tRole,
        gapResult.gapSkills,
      );
      skillPathways.push({
        targetRole: tRole,
        steps,
      });
    }

    // 6. Actionable Profile Recommendations
    const primaryGaps = skillGaps[0]?.gapSkills || [];
    const profileRecommendations = generateProfileRecommendations(
      user,
      projects,
      demonstratedSkills,
      primaryGaps,
    );

    // 7. Upsert into database
    const insightDoc = await this.insightModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          profileVersion: user.profileVersion || 1,
          analysisVersion: 'v1',
          taxonomyVersion: 'v1',
          status: 'ACTIVE',
          profileCompleteness,
          profileStrength,
          profileStrengthEvidence,
          careerSummary,
          primaryTargetRole,
          secondaryTargetRoles,
          roleAlignments,
          skillGaps,
          skillPathways,
          profileRecommendations,
          generatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    return insightDoc.toObject();
  }

  // =========================================================================
  // 10. CACHE INVALIDATION
  // =========================================================================

  async invalidateUserCareerInsight(userId: string) {
    await this.insightModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $set: { status: 'STALE' } },
    );
    this.logger.log(`[careerInsightInvalidated] userId=${userId}`);
  }
}
