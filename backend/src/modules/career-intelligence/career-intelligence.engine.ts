/**
 * ZEITNAH LMS NETWORK — CAREER INTELLIGENCE ENGINE
 * Core algorithms for:
 * 1. Evidence-Based Skill Detection across Profile, Experience, and Projects
 * 2. Independent Profile Completeness vs Profile Strength Evaluation
 * 3. Multi-Factor Infrastructure Role Alignment
 * 4. Grounded Skill Gap Identification
 * 5. Constructive Profile Improvement Recommendations
 */

import {
  INFRASTRUCTURE_ROLE_TAXONOMY,
  InfrastructureRoleDefinition,
  getRoleByTitle,
} from './infrastructure-role.taxonomy';
import {
  ProfileStrengthLevel,
  RoleAlignmentLevel,
  EvidenceType,
  SkillConfidence,
  DemonstratedSkillEvidence,
  SkillGapItem,
  RoleAlignmentItem,
  ProfileRecommendationItem,
  ProfileStrengthEvidenceItem,
  CareerPathwayStep,
} from './schemas/career-insight.schema';

// ── Canonical Normalization & Aliases ──────────────────────────────────────────

const SOFTWARE_ALIASES: Record<string, string> = {
  p6: 'Primavera P6',
  primavera: 'Primavera P6',
  primaverap6: 'Primavera P6',
  autocad: 'AutoCAD',
  cad: 'AutoCAD',
  civil3d: 'Civil 3D',
  revit: 'Revit',
  revitbim: 'Revit',
  navisworks: 'Navisworks',
  msproject: 'MS Project',
  staad: 'STAAD.Pro',
  staadpro: 'STAAD.Pro',
  etabs: 'ETABS',
  plaxis: 'PLAXIS',
  plaxis2d: 'PLAXIS',
  plaxis3d: 'PLAXIS',
  synchro: 'Synchro 4D',
  synchro4d: 'Synchro 4D',
  infraworks: 'InfraWorks',
  costx: 'CostX',
  powerbi: 'Power BI',
};

const SKILL_ALIASES: Record<string, string> = {
  planning: 'Planning & Scheduling',
  scheduling: 'Planning & Scheduling',
  'planning & scheduling': 'Planning & Scheduling',
  'project planning': 'Planning & Scheduling',
  boq: 'Bill of Quantities (BOQ)',
  'bill of quantities': 'Bill of Quantities (BOQ)',
  bbs: 'Bar Bending Schedule (BBS)',
  'bar bending schedule': 'Bar Bending Schedule (BBS)',
  'quantity surveying': 'Quantity Surveying',
  qs: 'Quantity Surveying',
  'site supervision': 'Site Supervision',
  'qa/qc': 'Quality Control / QA/QC',
  'quality control': 'Quality Control / QA/QC',
  'delay analysis': 'Delay Analysis',
  'progress monitoring': 'Progress Monitoring',
  'progress tracking': 'Progress Monitoring',
  'contract administration': 'Contract Administration',
  fidic: 'FIDIC Contracts',
  'fidic contracts': 'FIDIC Contracts',
  safety: 'Safety / OSHA Standards',
  hse: 'Safety / OSHA Standards',
  'clash detection': 'Clash Detection',
  'bim modeling': 'BIM Modeling',
  'structural analysis': 'Structural Analysis & Design',
  'cost estimation': 'Cost Estimation',
};

export function normalizeSoftware(name: string): string {
  if (!name) return '';
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return SOFTWARE_ALIASES[clean] || name.trim();
}

export function normalizeSkill(name: string): string {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  return SKILL_ALIASES[clean] || name.trim();
}

// ── 1. Evidence-Based Skill Detection ─────────────────────────────────────────

export function detectDemonstratedSkills(
  user: any,
  projects: any[] = [],
): DemonstratedSkillEvidence[] {
  const skillEvidenceMap = new Map<string, DemonstratedSkillEvidence>();

  function registerSkill(
    rawSkill: string,
    evidenceType: EvidenceType,
    confidence: SkillConfidence,
    source: string,
  ) {
    if (!rawSkill || typeof rawSkill !== 'string') return;
    const normalized = normalizeSkill(rawSkill);
    if (!normalized) return;

    const existing = skillEvidenceMap.get(normalized.toLowerCase());
    if (!existing) {
      skillEvidenceMap.set(normalized.toLowerCase(), {
        skill: normalized,
        evidenceType,
        confidence,
        source,
      });
    } else if (
      existing.confidence !== SkillConfidence.HIGH &&
      confidence === SkillConfidence.HIGH
    ) {
      skillEvidenceMap.set(normalized.toLowerCase(), {
        skill: normalized,
        evidenceType,
        confidence,
        source,
      });
    }
  }

  // A. Explicit Structured Skills
  const structSkills = user.structuredSkills || {};
  for (const sk of structSkills.technicalSkills || []) {
    registerSkill(sk, EvidenceType.EXPLICIT_SKILL, SkillConfidence.HIGH, 'Profile Technical Skills');
  }
  for (const sk of structSkills.industrySkills || []) {
    registerSkill(sk, EvidenceType.EXPLICIT_SKILL, SkillConfidence.HIGH, 'Profile Industry Skills');
  }
  for (const sk of structSkills.professionalSkills || []) {
    registerSkill(sk, EvidenceType.EXPLICIT_SKILL, SkillConfidence.HIGH, 'Profile Professional Skills');
  }
  for (const sk of user.skills || []) {
    registerSkill(sk, EvidenceType.EXPLICIT_SKILL, SkillConfidence.HIGH, 'Profile Skills');
  }

  // B. Software Skills
  for (const sw of structSkills.softwareSkills || []) {
    const normSw = normalizeSoftware(sw);
    registerSkill(normSw, EvidenceType.SOFTWARE_PROFICIENCY, SkillConfidence.HIGH, 'Profile Software Tools');
  }

  // C. Project Portfolio Evidence
  for (const proj of projects) {
    const projTitle = proj.title || 'Project';
    for (const sk of proj.skills || []) {
      registerSkill(sk, EvidenceType.PROJECT_EVIDENCE, SkillConfidence.HIGH, `Project: "${projTitle}"`);
    }
    for (const sw of proj.softwareUsed || []) {
      const normSw = normalizeSoftware(sw);
      registerSkill(normSw, EvidenceType.PROJECT_EVIDENCE, SkillConfidence.HIGH, `Tools in: "${projTitle}"`);
    }

    // Contextual project description analysis
    const desc = (proj.description || '').toLowerCase();
    if (desc.includes('planning') || desc.includes('schedule') || desc.includes('scheduling')) {
      registerSkill('Planning & Scheduling', EvidenceType.PROJECT_EVIDENCE, SkillConfidence.MEDIUM, `Responsibilities in "${projTitle}"`);
    }
    if (desc.includes('quantity') || desc.includes('boq') || desc.includes('takeoff')) {
      registerSkill('Quantity Surveying', EvidenceType.PROJECT_EVIDENCE, SkillConfidence.MEDIUM, `Quantity duties in "${projTitle}"`);
    }
    if (desc.includes('site supervision') || desc.includes('field execution')) {
      registerSkill('Site Supervision', EvidenceType.PROJECT_EVIDENCE, SkillConfidence.MEDIUM, `Field execution in "${projTitle}"`);
    }
    if (desc.includes('bbs') || desc.includes('bar bending')) {
      registerSkill('Bar Bending Schedule (BBS)', EvidenceType.PROJECT_EVIDENCE, SkillConfidence.MEDIUM, `Reinforcement logs in "${projTitle}"`);
    }
    if (desc.includes('bim') || desc.includes('clash') || desc.includes('revit')) {
      registerSkill('BIM Modeling', EvidenceType.PROJECT_EVIDENCE, SkillConfidence.MEDIUM, `Digital modeling in "${projTitle}"`);
    }
  }

  // D. Professional Experience Entries
  for (const exp of user.experience || []) {
    const roleOrg = `${exp.role || 'Role'} at ${exp.organization || 'Company'}`;
    for (const sk of exp.skillsUsed || []) {
      registerSkill(sk, EvidenceType.EXPERIENCE_EVIDENCE, SkillConfidence.HIGH, roleOrg);
    }
    for (const sw of exp.softwareUsed || []) {
      const normSw = normalizeSoftware(sw);
      registerSkill(normSw, EvidenceType.EXPERIENCE_EVIDENCE, SkillConfidence.HIGH, `${normSw} used at ${roleOrg}`);
    }

    const expDesc = (exp.description || '').toLowerCase();
    if (expDesc.includes('schedule') || expDesc.includes('primavera') || expDesc.includes('critical path')) {
      registerSkill('Planning & Scheduling', EvidenceType.EXPERIENCE_EVIDENCE, SkillConfidence.MEDIUM, `Experience: ${roleOrg}`);
    }
    if (expDesc.includes('quality') || expDesc.includes('qa/qc') || expDesc.includes('inspection')) {
      registerSkill('Quality Control / QA/QC', EvidenceType.EXPERIENCE_EVIDENCE, SkillConfidence.MEDIUM, `Inspection responsibilities at ${roleOrg}`);
    }
  }

  // E. Certifications
  for (const cert of user.certifications || []) {
    const certName = cert.name || '';
    if (certName.toLowerCase().includes('pmp') || certName.toLowerCase().includes('project management')) {
      registerSkill('Project Leadership', EvidenceType.CERTIFICATION_EVIDENCE, SkillConfidence.HIGH, `Certification: ${certName}`);
      registerSkill('Planning & Scheduling', EvidenceType.CERTIFICATION_EVIDENCE, SkillConfidence.MEDIUM, `Certification: ${certName}`);
    }
    if (certName.toLowerCase().includes('revit') || certName.toLowerCase().includes('bim')) {
      registerSkill('BIM Modeling', EvidenceType.CERTIFICATION_EVIDENCE, SkillConfidence.HIGH, `Certification: ${certName}`);
    }
  }

  return Array.from(skillEvidenceMap.values());
}

// ── 2. Profile Completeness Calculation ───────────────────────────────────────

export function calculateProfileCompleteness(user: any, projects: any[] = []): number {
  const checks = [
    Boolean(user.avatar),
    Boolean(user.headline && user.headline.trim().length > 3),
    Boolean(user.bio && user.bio.trim().length > 10),
    Boolean(user.primaryDiscipline),
    Boolean(user.infrastructureSectors && user.infrastructureSectors.length > 0),
    Boolean(user.location),
    Boolean(
      (user.skills && user.skills.length > 0) ||
        (user.structuredSkills?.technicalSkills && user.structuredSkills.technicalSkills.length > 0),
    ),
    Boolean(user.structuredSkills?.softwareSkills && user.structuredSkills.softwareSkills.length > 0),
    Boolean(user.experience && user.experience.length > 0),
    Boolean(user.education && user.education.length > 0),
    Boolean(projects.length > 0),
    Boolean(user.careerPreferences?.preferredRoles && user.careerPreferences.preferredRoles.length > 0),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

// ── 3. Profile Strength Evaluation ───────────────────────────────────────────

export function calculateProfileStrength(
  user: any,
  projects: any[] = [],
  demonstratedSkills: DemonstratedSkillEvidence[] = [],
): {
  level: ProfileStrengthLevel;
  evidence: ProfileStrengthEvidenceItem[];
} {
  const evidence: ProfileStrengthEvidenceItem[] = [];

  // 1. Relevant Experience
  const expCount = (user.experience || []).length;
  const yearsExp = user.yearsOfExperience || (expCount > 0 ? expCount : 0);
  const hasExp = yearsExp >= 2 || expCount >= 1;
  evidence.push({
    label: 'Relevant Infrastructure Experience',
    verified: hasExp,
    note: hasExp ? `${yearsExp} years documented across ${expCount} positions` : 'Less than 2 years documented',
    iconType: 'briefcase',
  });

  // 2. Verified Infrastructure Projects
  const projCount = projects.length;
  const hasProjects = projCount >= 1;
  evidence.push({
    label: 'Infrastructure Project Portfolio',
    verified: hasProjects,
    note: hasProjects ? `${projCount} project${projCount > 1 ? 's' : ''} with documented responsibilities` : 'No infrastructure projects added yet',
    iconType: 'folder',
  });

  // 3. Technical & Domain Skills
  const techSkillCount = (user.structuredSkills?.technicalSkills || []).length + (user.skills || []).length;
  const hasSkills = techSkillCount >= 3 || demonstratedSkills.length >= 4;
  evidence.push({
    label: 'Demonstrated Technical Skills',
    verified: hasSkills,
    note: hasSkills ? `${demonstratedSkills.length} verifiable technical competencies` : 'Fewer than 3 technical skills listed',
    iconType: 'check-circle',
  });

  // 4. Software Proficiency
  const softwareList = [
    ...(user.structuredSkills?.softwareSkills || []),
    ...projects.flatMap((p) => p.softwareUsed || []),
  ];
  const uniqueSoftware = new Set(softwareList.map(normalizeSoftware).filter(Boolean));
  const hasSoftware = uniqueSoftware.size >= 2;
  evidence.push({
    label: 'Software Tool Proficiencies',
    verified: hasSoftware,
    note: hasSoftware ? `${uniqueSoftware.size} recognized tools (${Array.from(uniqueSoftware).slice(0, 3).join(', ')})` : 'Fewer than 2 engineering software tools listed',
    iconType: 'cpu',
  });

  // 5. Career Intent Alignment
  const hasCareerPrefs = Boolean(
    user.careerPreferences?.preferredRoles?.length > 0 &&
      user.careerPreferences?.preferredLocations?.length > 0,
  );
  evidence.push({
    label: 'Career Direction & Preferences',
    verified: hasCareerPrefs,
    note: hasCareerPrefs ? `Targeting ${user.careerPreferences.preferredRoles.slice(0, 2).join(', ')}` : 'Career preferences not yet configured',
    iconType: 'target',
  });

  const verifiedCount = evidence.filter((e) => e.verified).length;

  let level: ProfileStrengthLevel;
  if (verifiedCount >= 4) {
    level = ProfileStrengthLevel.STRONG;
  } else if (verifiedCount >= 2) {
    level = ProfileStrengthLevel.MODERATE;
  } else {
    level = ProfileStrengthLevel.EMERGING;
  }

  return { level, evidence };
}

// ── 4. Infrastructure Role Alignment Evaluation ──────────────────────────────

export function evaluateRoleAlignment(
  role: InfrastructureRoleDefinition,
  user: any,
  projects: any[] = [],
  demonstratedSkills: DemonstratedSkillEvidence[] = [],
  activeJobCount = 0,
): RoleAlignmentItem {
  const candDiscipline = (user.primaryDiscipline || '').toLowerCase();
  const roleDiscipline = role.discipline.toLowerCase();
  const disciplineMatch =
    candDiscipline.includes(roleDiscipline) ||
    roleDiscipline.includes(candDiscipline) ||
    (candDiscipline === 'civil engineering' && roleDiscipline.includes('civil'));

  const candSectors = (user.infrastructureSectors || []).map((s: string) => s.toLowerCase());
  const matchedSectors = role.sectors.filter((sec) =>
    candSectors.some((cs: string) => cs.includes(sec.toLowerCase()) || sec.toLowerCase().includes(cs)),
  );

  const demonstratedSkillNames = new Set(demonstratedSkills.map((d) => d.skill.toLowerCase()));

  // Required skills evaluation
  const matchedReqSkills = role.requiredSkills.filter((sk) =>
    demonstratedSkillNames.has(sk.toLowerCase()) ||
    demonstratedSkillNames.has(normalizeSkill(sk).toLowerCase()),
  );
  const missingReqSkills = role.requiredSkills.filter(
    (sk) =>
      !demonstratedSkillNames.has(sk.toLowerCase()) &&
      !demonstratedSkillNames.has(normalizeSkill(sk).toLowerCase()),
  );

  // Software evaluation
  const candSoftwareList = [
    ...(user.structuredSkills?.softwareSkills || []),
    ...projects.flatMap((p) => p.softwareUsed || []),
    ...demonstratedSkills
      .filter((d) => d.evidenceType === EvidenceType.SOFTWARE_PROFICIENCY)
      .map((d) => d.skill),
  ];
  const candNormalizedSoftware = new Set(candSoftwareList.map(normalizeSoftware).map((s) => s.toLowerCase()));

  const matchedSoftware = role.requiredSoftware.filter((sw) =>
    candNormalizedSoftware.has(normalizeSoftware(sw).toLowerCase()),
  );
  const missingSoftware = role.requiredSoftware.filter(
    (sw) => !candNormalizedSoftware.has(normalizeSoftware(sw).toLowerCase()),
  );

  // Experience evaluation
  const candYears = user.yearsOfExperience || 0;
  let expScore = 50;
  if (candYears >= role.experienceRange.min && candYears <= role.experienceRange.max) {
    expScore = 100;
  } else if (candYears > role.experienceRange.max) {
    expScore = 80;
  } else if (candYears >= role.experienceRange.min - 1) {
    expScore = 65;
  } else {
    expScore = Math.max(20, 50 - (role.experienceRange.min - candYears) * 15);
  }

  // Weighted calculation (Discipline: 25, Sectors: 15, Skills: 25, Software: 20, Experience: 15)
  const discScore = disciplineMatch ? 100 : 30;
  const sectorScore = role.sectors.length > 0 ? Math.round((matchedSectors.length / role.sectors.length) * 100) : 50;
  const skillScore = role.requiredSkills.length > 0 ? Math.round((matchedReqSkills.length / role.requiredSkills.length) * 100) : 50;
  const swScore = role.requiredSoftware.length > 0 ? Math.round((matchedSoftware.length / role.requiredSoftware.length) * 100) : 50;

  const totalScore = Math.round(
    discScore * 0.25 +
      sectorScore * 0.15 +
      skillScore * 0.25 +
      swScore * 0.2 +
      expScore * 0.15,
  );

  let alignmentLevel: RoleAlignmentLevel;
  if (totalScore >= 75) {
    alignmentLevel = RoleAlignmentLevel.STRONG;
  } else if (totalScore >= 50) {
    alignmentLevel = RoleAlignmentLevel.MODERATE;
  } else {
    alignmentLevel = RoleAlignmentLevel.EMERGING;
  }

  const demonstratedReasons: string[] = [];
  if (disciplineMatch) demonstratedReasons.push(`${role.discipline} background`);
  if (matchedSectors.length > 0) demonstratedReasons.push(`${matchedSectors.slice(0, 2).join(', ')} sector exposure`);
  if (matchedReqSkills.length > 0) demonstratedReasons.push(`${matchedReqSkills.slice(0, 3).join(', ')} demonstrated`);
  if (matchedSoftware.length > 0) demonstratedReasons.push(`${matchedSoftware.join(', ')} software proficiency`);
  if (candYears >= role.experienceRange.min) demonstratedReasons.push(`${candYears} years experience aligns with role tier`);

  const developmentGaps: string[] = [];
  if (missingSoftware.length > 0) developmentGaps.push(`Experience with ${missingSoftware.join(', ')} not yet listed`);
  if (missingReqSkills.length > 0) developmentGaps.push(`${missingReqSkills.slice(0, 2).join(', ')} required but under-documented`);
  if (candYears < role.experienceRange.min) developmentGaps.push(`Role typically seeks ${role.experienceRange.typical} (${candYears} yrs listed)`);

  return {
    roleId: role.id,
    roleTitle: role.title,
    discipline: role.discipline,
    alignmentLevel,
    alignmentScore: totalScore,
    demonstratedReasons,
    developmentGaps,
    relevantJobCount: activeJobCount,
  };
}

// ── 5. Skill Gap Analysis for Target Role ────────────────────────────────────

export function analyzeTargetRoleSkillGaps(
  targetRoleTitle: string,
  demonstratedSkills: DemonstratedSkillEvidence[],
  projects: any[] = [],
): {
  demonstratedSkills: DemonstratedSkillEvidence[];
  gapSkills: SkillGapItem[];
} {
  const role = getRoleByTitle(targetRoleTitle);
  if (!role) {
    return {
      demonstratedSkills,
      gapSkills: [],
    };
  }

  const demonstratedMap = new Map(
    demonstratedSkills.map((d) => [d.skill.toLowerCase(), d]),
  );

  const matchedDemonstrated: DemonstratedSkillEvidence[] = [];
  const gapSkills: SkillGapItem[] = [];

  // Check required skills
  for (const sk of role.requiredSkills) {
    const norm = normalizeSkill(sk);
    const found = demonstratedMap.get(norm.toLowerCase()) || demonstratedMap.get(sk.toLowerCase());
    if (found) {
      matchedDemonstrated.push(found);
    } else {
      gapSkills.push({
        skill: sk,
        status: 'NOT_DEMONSTRATED',
        importance: 'REQUIRED',
        recommendedAction: `Highlight practical experience with ${sk} in your project portfolio if you have hands-on experience.`,
      });
    }
  }

  // Check required software
  for (const sw of role.requiredSoftware) {
    const norm = normalizeSoftware(sw);
    const found = demonstratedMap.get(norm.toLowerCase()) || demonstratedMap.get(sw.toLowerCase());
    if (found) {
      if (!matchedDemonstrated.some((m) => m.skill.toLowerCase() === found.skill.toLowerCase())) {
        matchedDemonstrated.push(found);
      }
    } else {
      gapSkills.push({
        skill: sw,
        status: 'NOT_DEMONSTRATED',
        importance: 'REQUIRED',
        recommendedAction: `Add experience with ${sw} to your profile tools or link it to a specific project milestone.`,
      });
    }
  }

  // Check preferred skills
  for (const sk of role.preferredSkills) {
    const norm = normalizeSkill(sk);
    const found = demonstratedMap.get(norm.toLowerCase()) || demonstratedMap.get(sk.toLowerCase());
    if (found) {
      if (!matchedDemonstrated.some((m) => m.skill.toLowerCase() === found.skill.toLowerCase())) {
        matchedDemonstrated.push(found);
      }
    } else {
      gapSkills.push({
        skill: sk,
        status: 'NOT_DEMONSTRATED',
        importance: 'PREFERRED',
        recommendedAction: `Consider developing familiarity with ${sk} to stand out for senior-level opportunities.`,
      });
    }
  }

  return {
    demonstratedSkills: matchedDemonstrated,
    gapSkills,
  };
}

// ── 6. Career Pathway Steps Generator ────────────────────────────────────────

export function generateCareerPathwaySteps(
  currentRoleTitle: string,
  targetRoleTitle: string,
  gapSkills: SkillGapItem[] = [],
): CareerPathwayStep[] {
  const targetRole = getRoleByTitle(targetRoleTitle);
  const steps: CareerPathwayStep[] = [];

  let stepNumber = 1;

  // Step 1: Core Technical Capability
  const missingReq = gapSkills.filter((g) => g.importance === 'REQUIRED');
  if (missingReq.length > 0) {
    steps.push({
      stepNumber: stepNumber++,
      title: `Strengthen ${missingReq[0].skill}`,
      description: `Target ${targetRoleTitle} positions consistently require ${missingReq[0].skill}. Build hands-on familiarity.`,
      skillType: 'TECHNICAL_SKILL',
      actionItem: `Document tasks involving ${missingReq[0].skill} in your daily work log or site assignments.`,
    });
  } else {
    steps.push({
      stepNumber: stepNumber++,
      title: 'Consolidate Core Competencies',
      description: `Your profile demonstrates the foundational requirements for ${targetRoleTitle}. Ensure achievements are clearly quantified.`,
      skillType: 'CORE_EXECUTION',
      actionItem: 'Add quantifiable metrics (budget size, lane kilometers, concrete volume) to your experience.',
    });
  }

  // Step 2: Software & Digital Tools
  if (targetRole && targetRole.requiredSoftware.length > 0) {
    const primarySw = targetRole.requiredSoftware[0];
    steps.push({
      stepNumber: stepNumber++,
      title: `Master ${primarySw} Workflows`,
      description: `${targetRoleTitle} leads rely on ${primarySw} for critical delivery. Build demonstrable sample deliverables.`,
      skillType: 'SOFTWARE_TOOL',
      actionItem: `Produce a sample project model or schedule using ${primarySw} to showcase in your portfolio.`,
    });
  }

  // Step 3: Verified Project Portfolio Evidence
  steps.push({
    stepNumber: stepNumber++,
    title: 'Showcase Relevant Project Evidence',
    description: `Connect your skills to real infrastructure deliverables (highways, bridges, structures, or transit corridors).`,
    skillType: 'PROJECT_PORTFOLIO',
    actionItem: 'Add detailed project responsibilities highlighting budget, schedule, and team interface roles.',
  });

  // Step 4: Industry Certification & Professional Body Recognition
  if (targetRole && targetRole.commonCertifications.length > 0) {
    steps.push({
      stepNumber: stepNumber++,
      title: `Target ${targetRole.commonCertifications[0]} Certification`,
      description: `Earning ${targetRole.commonCertifications[0]} provides industry-recognized credibility for ${targetRoleTitle} roles.`,
      skillType: 'CREDENTIAL',
      actionItem: `Review eligibility requirements and course preparation for ${targetRole.commonCertifications[0]}.`,
    });
  }

  return steps;
}

// ── 7. Profile Improvement Recommendations ───────────────────────────────────

export function generateProfileRecommendations(
  user: any,
  projects: any[] = [],
  demonstratedSkills: DemonstratedSkillEvidence[] = [],
  gapSkills: SkillGapItem[] = [],
): ProfileRecommendationItem[] {
  const recs: ProfileRecommendationItem[] = [];

  // Project detail recommendation
  if (projects.length === 0) {
    recs.push({
      title: 'Add an Infrastructure Project',
      description: 'Your profile has no published projects. Verified project portfolios provide the strongest evidence for recruiters and role matching.',
      category: 'PROJECTS',
      priority: 'HIGH',
      actionType: 'add_project',
    });
  } else if (projects.some((p) => !p.softwareUsed || p.softwareUsed.length === 0)) {
    recs.push({
      title: 'Document Software Used in Projects',
      description: 'Some of your projects lack software details. Specifying tools like AutoCAD, Primavera P6, or Revit dramatically increases evidence strength.',
      category: 'SOFTWARE',
      priority: 'MEDIUM',
      actionType: 'edit_project_tools',
    });
  }

  // Software tools recommendation
  const missingSoftwareGaps = gapSkills.filter(
    (g) =>
      g.skill.toLowerCase().includes('primavera') ||
      g.skill.toLowerCase().includes('autocad') ||
      g.skill.toLowerCase().includes('revit'),
  );
  if (missingSoftwareGaps.length > 0) {
    const swName = missingSoftwareGaps[0].skill;
    recs.push({
      title: `Add ${swName} if you have experience with it`,
      description: `${swName} is frequently required across target roles. If you have practical project experience with this tool, add it to your profile.`,
      category: 'SOFTWARE',
      priority: 'HIGH',
      actionType: 'add_software',
    });
  }

  // Career preferences recommendation
  if (
    !user.careerPreferences?.preferredRoles ||
    user.careerPreferences.preferredRoles.length === 0
  ) {
    recs.push({
      title: 'Set Your Career Preferences',
      description: 'Specifying your preferred roles, infrastructure sectors, and target locations customizes your Career Intelligence and Jobs For You feeds.',
      category: 'CAREER_PREFERENCES',
      priority: 'HIGH',
      actionType: 'set_career_preferences',
    });
  }

  // Technical skills recommendation
  if (demonstratedSkills.length < 4) {
    recs.push({
      title: 'Expand Documented Technical Skills',
      description: 'Profiles with 5 or more structured skills match up to 3x more infrastructure positions. List your core engineering proficiencies.',
      category: 'SKILLS',
      priority: 'MEDIUM',
      actionType: 'add_skills',
    });
  }

  // Certifications recommendation
  if (!user.certifications || user.certifications.length === 0) {
    recs.push({
      title: 'Add Certifications if completed',
      description: 'Industry credentials such as PMP, OSHA, or software certificates unlock higher profile strength tiers.',
      category: 'CERTIFICATIONS',
      priority: 'LOW',
      actionType: 'add_certification',
    });
  }

  return recs;
}
