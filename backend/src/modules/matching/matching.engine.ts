/**
 * ZEITNAH MATCHING ENGINE — v1
 *
 * Multi-stage infrastructure talent matching engine.
 *
 * Architecture:
 *   1. Eligibility Filter (deterministic, hard requirements)
 *   2. Candidate Retrieval (bounded, indexed MongoDB queries)
 *   3. Multi-dimensional Scoring (weighted compatibility calculation)
 *   4. Ranking & Categorization
 *   5. Explanation Generation
 *
 * This engine uses ONLY structured profile and job data.
 * It does NOT call external AI APIs.
 * AI-enhanced semantic matching can be layered in future versions.
 */

import { Logger } from '@nestjs/common';
import {
  MatchCategory,
  MatchDimensionScore,
  HardRequirementFailure,
} from './schemas/job-talent-match.schema';

// ─── Configurable Weights ───────────────────────────────────────────────────

export const MATCH_WEIGHTS = {
  discipline: 15,
  specialization: 8,
  sector: 10,
  requiredSkills: 14,
  preferredSkills: 5,
  requiredSoftware: 12,
  preferredSoftware: 4,
  experience: 12,
  projects: 8,
  certifications: 4,
  education: 3,
  location: 6,
  workMode: 4,
  careerIntent: 3,
  availability: 2,
};

// Ensure weights sum to 110 for normalization to 100
const TOTAL_WEIGHT = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);

// ─── Match Category Thresholds ──────────────────────────────────────────────

export const MATCH_THRESHOLDS = {
  HIGHLY_COMPATIBLE: 80,
  STRONGLY_COMPATIBLE: 60,
  POTENTIALLY_COMPATIBLE: 40,
};

// ─── Software Aliases (canonical normalization) ─────────────────────────────

const SOFTWARE_ALIASES: Record<string, string> = {
  p6: 'Primavera P6',
  primavera: 'Primavera P6',
  'primavera p6': 'Primavera P6',
  'oracle primavera': 'Primavera P6',
  autocad: 'AutoCAD',
  'auto cad': 'AutoCAD',
  civil3d: 'Civil 3D',
  'civil 3d': 'Civil 3D',
  'autodesk civil 3d': 'Civil 3D',
  revit: 'Revit',
  'autodesk revit': 'Revit',
  navisworks: 'Navisworks',
  'autodesk navisworks': 'Navisworks',
  'ms project': 'MS Project',
  'microsoft project': 'MS Project',
  staad: 'STAAD.Pro',
  'staad pro': 'STAAD.Pro',
  'staad.pro': 'STAAD.Pro',
  etabs: 'ETABS',
  sap2000: 'SAP2000',
  'sap 2000': 'SAP2000',
  tekla: 'Tekla',
  'tekla structures': 'Tekla',
  gis: 'GIS',
  arcgis: 'GIS',
  costx: 'CostX',
  'cost x': 'CostX',
  synchro: 'Synchro 4D',
  'synchro 4d': 'Synchro 4D',
  bluebeam: 'Bluebeam Revu',
  'bluebeam revu': 'Bluebeam Revu',
  openroads: 'OpenRoads',
  infraworks: 'Infraworks',
  microstation: 'MicroStation',
};

// ─── Skill Aliases ──────────────────────────────────────────────────────────

const SKILL_ALIASES: Record<string, string> = {
  planning: 'Planning & Scheduling',
  scheduling: 'Planning & Scheduling',
  'planning & scheduling': 'Planning & Scheduling',
  'planning and scheduling': 'Planning & Scheduling',
  'progress tracking': 'Planning & Scheduling',
  'quantity estimation': 'Quantity Surveying',
  'quantity surveying': 'Quantity Surveying',
  boq: 'Bill of Quantities (BOQ)',
  'bill of quantities': 'Bill of Quantities (BOQ)',
  bbs: 'Bar Bending Schedule (BBS)',
  'bar bending schedule': 'Bar Bending Schedule (BBS)',
  'structural analysis': 'Structural Analysis',
  'structural design': 'Structural Analysis',
  'rc design': 'Reinforced Concrete Design',
  'reinforced concrete': 'Reinforced Concrete Design',
  'rcc design': 'Reinforced Concrete Design',
  geotechnical: 'Geotechnical Modeling',
  'site supervision': 'Site Supervision',
  'qa/qc': 'QA/QC Procedures',
  qaqc: 'QA/QC Procedures',
  safety: 'Safety / OSHA Standards',
  osha: 'Safety / OSHA Standards',
  hse: 'Safety / OSHA Standards',
  fidic: 'FIDIC Contracts',
  'fidic contracts': 'FIDIC Contracts',
  'bim modeling': 'BIM Modeling',
  bim: 'BIM Modeling',
  'clash detection': 'Clash Detection',
};

// ─── Discipline Aliases ─────────────────────────────────────────────────────

const DISCIPLINE_ALIASES: Record<string, string> = {
  civil: 'Civil Engineering',
  'civil engineering': 'Civil Engineering',
  structural: 'Structural Engineering',
  'structural engineering': 'Structural Engineering',
  architecture: 'Architecture',
  construction: 'Construction',
  'project management': 'Project Management',
  pm: 'Project Management',
  'quantity surveying': 'Quantity Surveying',
  qs: 'Quantity Surveying',
  bim: 'BIM',
  mep: 'MEP',
  geotechnical: 'Geotechnical Engineering',
  'geotechnical engineering': 'Geotechnical Engineering',
  transportation: 'Transportation',
  surveying: 'Surveying',
  planning: 'Planning & Scheduling',
  estimation: 'Estimation & Costing',
  'site engineering': 'Site Engineering',
  safety: 'Safety / HSE',
  hse: 'Safety / HSE',
  contracts: 'Contracts & Procurement',
  procurement: 'Contracts & Procurement',
  consultancy: 'Infrastructure Consultancy',
};

// ─── Sector Aliases ─────────────────────────────────────────────────────────

const SECTOR_ALIASES: Record<string, string> = {
  highway: 'Highways',
  highways: 'Highways',
  'highway epc': 'Highways',
  roads: 'Roads',
  road: 'Roads',
  bridges: 'Bridges',
  bridge: 'Bridges',
  railways: 'Railways',
  railway: 'Railways',
  rail: 'Railways',
  metro: 'Metro',
  water: 'Water & Wastewater',
  wastewater: 'Water & Wastewater',
  'water & wastewater': 'Water & Wastewater',
  buildings: 'Buildings',
  building: 'Buildings',
  urban: 'Urban Infrastructure',
  'urban infrastructure': 'Urban Infrastructure',
  industrial: 'Industrial Infrastructure',
  'industrial infrastructure': 'Industrial Infrastructure',
  ports: 'Ports',
  airports: 'Airports',
  airport: 'Airports',
  energy: 'Energy Infrastructure',
  'energy infrastructure': 'Energy Infrastructure',
  'real estate': 'Real Estate Development',
  'real estate development': 'Real Estate Development',
};

// ─── Utilities ──────────────────────────────────────────────────────────────

const logger = new Logger('MatchingEngine');

function normalize(value: string): string {
  return (value || '').trim().toLowerCase();
}

function normalizeSoftware(input: string): string {
  const key = normalize(input);
  return SOFTWARE_ALIASES[key] || input.trim();
}

function normalizeSkill(input: string): string {
  const key = normalize(input);
  return SKILL_ALIASES[key] || input.trim();
}

function normalizeDiscipline(input: string): string {
  const key = normalize(input);
  return DISCIPLINE_ALIASES[key] || input.trim();
}

function normalizeSector(input: string): string {
  const key = normalize(input);
  return SECTOR_ALIASES[key] || input.trim();
}

function normalizeList(
  items: string[],
  normalizer: (s: string) => string,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = normalizer(item);
    const key = normalize(normalized);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

function setIntersection(a: string[], b: string[]): string[] {
  const bSet = new Set(b.map(normalize));
  return a.filter((x) => bSet.has(normalize(x)));
}

function setDifference(a: string[], b: string[]): string[] {
  const bSet = new Set(b.map(normalize));
  return a.filter((x) => !bSet.has(normalize(x)));
}

function caseInsensitiveMatch(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

function fuzzyLocationMatch(
  jobLocation: string,
  candidateLocations: string[],
): boolean {
  const jobParts = normalize(jobLocation)
    .split(/[,\s]+/)
    .filter(Boolean);
  for (const loc of candidateLocations) {
    const candParts = normalize(loc)
      .split(/[,\s]+/)
      .filter(Boolean);
    for (const jp of jobParts) {
      for (const cp of candParts) {
        if (jp === cp && jp.length > 2) return true;
      }
    }
  }
  return false;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface JobProfile {
  title: string;
  description: string;
  discipline: string;
  specialization: string;
  infrastructureSector: string;
  minYearsExperience: number;
  maxYearsExperience: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredSoftware: string[];
  preferredSoftware: string[];
  requiredEducation: string;
  requiredCertifications: string[];
  preferredCertifications: string[];
  location: string;
  workMode: string;
  responsibilities: string;
  requirements: string;
}

export interface CandidateProfile {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  headline: string;
  currentRole: string;
  primaryRole: string;
  primaryDiscipline: string;
  specializations: string[];
  infrastructureSectors: string[];
  yearsOfExperience: number;
  location: string;
  preferredLocations: string[];
  skills: string[];
  structuredSkills: {
    technicalSkills: string[];
    softwareSkills: string[];
    industrySkills: string[];
    professionalSkills: string[];
  };
  experience: Array<{
    id: string;
    organization: string;
    role: string;
    location: string;
    description: string;
    skillsUsed?: string[];
    softwareUsed?: string[];
    infrastructureSector?: string;
    startDate: Date;
    endDate: Date | null;
    currentlyActive: boolean;
  }>;
  education: Array<{
    qualification: string;
    fieldOfStudy: string;
    institution: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    skills: string[];
    softwareUsed: string[];
    infrastructureSector: string;
    role: string;
  }>;
  careerPreferences: {
    openToOpportunities: boolean;
    preferredRoles: string[];
    preferredSectors: string[];
    preferredLocations: string[];
    preferredWorkMode: string;
    preferredEmploymentType: string;
  };
  availability: string;
  discoverableToRecruiters: boolean;
  profileVisibility: string;
}

export interface MatchResult {
  candidateUserId: string;
  score: number;
  category: MatchCategory;
  dimensionScores: MatchDimensionScore[];
  matchReasons: string[];
  gapReasons: string[];
  hardRequirementFailures: HardRequirementFailure[];
  passesHardRequirements: boolean;
  matchedSkills: string[];
  matchedSoftware: string[];
  matchedSectors: string[];
  matchedProjects: string[];
  matchingEngineVersion: string;
}

// ─── Core Matching Engine ───────────────────────────────────────────────────

export function calculateMatch(
  job: JobProfile,
  candidate: CandidateProfile,
): MatchResult {
  const dimensionScores: MatchDimensionScore[] = [];
  const matchReasons: string[] = [];
  const gapReasons: string[] = [];
  const hardFailures: HardRequirementFailure[] = [];

  // Normalize all data
  const jobDiscipline = normalizeDiscipline(job.discipline);
  const candDiscipline = normalizeDiscipline(candidate.primaryDiscipline);

  const jobSector = normalizeSector(job.infrastructureSector);
  const candSectors = normalizeList(
    candidate.infrastructureSectors || [],
    normalizeSector,
  );

  const jobReqSkills = normalizeList(job.requiredSkills || [], normalizeSkill);
  const jobPrefSkills = normalizeList(
    job.preferredSkills || [],
    normalizeSkill,
  );
  const jobReqSoftware = normalizeList(
    job.requiredSoftware || [],
    normalizeSoftware,
  );
  const jobPrefSoftware = normalizeList(
    job.preferredSoftware || [],
    normalizeSoftware,
  );

  // Gather all candidate skills across profile, experience, and projects
  const allCandSkills = gatherCandidateSkills(candidate);
  const allCandSoftware = gatherCandidateSoftware(candidate);
  const allCandSectors = gatherCandidateSectors(candidate, candSectors);

  // ── 1. Discipline ────────────────────────────────────────────────
  const discScore = caseInsensitiveMatch(jobDiscipline, candDiscipline)
    ? 100
    : 0;
  dimensionScores.push({
    dimension: 'discipline',
    score: discScore,
    weight: MATCH_WEIGHTS.discipline,
    note:
      discScore > 0
        ? `Primary discipline: ${candDiscipline}`
        : `Job requires ${jobDiscipline}, candidate is ${candDiscipline || 'Not listed'}`,
  });
  if (discScore > 0) matchReasons.push(`${candDiscipline} discipline`);
  else if (jobDiscipline) {
    hardFailures.push({
      type: 'discipline',
      expected: jobDiscipline,
      actual: candDiscipline || 'Not listed',
    });
    gapReasons.push(`Discipline: ${jobDiscipline} not matched`);
  }

  // ── 2. Specialization ────────────────────────────────────────────
  const candSpecializations = (candidate.specializations || []).map(normalize);
  const jobSpec = normalize(job.specialization);
  const specScore =
    jobSpec && candSpecializations.includes(jobSpec) ? 100 : jobSpec ? 0 : 50;
  dimensionScores.push({
    dimension: 'specialization',
    score: specScore,
    weight: MATCH_WEIGHTS.specialization,
    note:
      specScore === 100 ? `Specialization: ${job.specialization}` : undefined,
  });
  if (specScore === 100)
    matchReasons.push(`${job.specialization} specialization`);

  // ── 3. Infrastructure Sector ─────────────────────────────────────
  const sectorMatched = allCandSectors.some((s) =>
    caseInsensitiveMatch(s, jobSector),
  );
  const sectorScore = !jobSector ? 50 : sectorMatched ? 100 : 0;
  const matchedSectors = sectorMatched && jobSector ? [jobSector] : [];
  dimensionScores.push({
    dimension: 'sector',
    score: sectorScore,
    weight: MATCH_WEIGHTS.sector,
    matchedItems: matchedSectors,
    note: sectorScore === 100 ? `${jobSector} sector experience` : undefined,
  });
  if (sectorScore === 100) matchReasons.push(`${jobSector} sector experience`);
  else if (jobSector) gapReasons.push(`Sector: ${jobSector} not in profile`);

  // ── 4. Required Skills ───────────────────────────────────────────
  const matchedReqSkills = setIntersection(jobReqSkills, allCandSkills);
  const reqSkillScore =
    jobReqSkills.length > 0
      ? Math.round((matchedReqSkills.length / jobReqSkills.length) * 100)
      : 50;
  const missingReqSkills = setDifference(jobReqSkills, allCandSkills);
  dimensionScores.push({
    dimension: 'requiredSkills',
    score: reqSkillScore,
    weight: MATCH_WEIGHTS.requiredSkills,
    matchedItems: matchedReqSkills,
    missingItems: missingReqSkills,
  });
  if (matchedReqSkills.length > 0) {
    matchReasons.push(
      `${matchedReqSkills.length}/${jobReqSkills.length} required skills matched`,
    );
  }
  if (missingReqSkills.length > 0) {
    gapReasons.push(`Missing required skills: ${missingReqSkills.join(', ')}`);
    for (const skill of missingReqSkills) {
      hardFailures.push({
        type: 'skill',
        expected: skill,
        actual: 'Not listed',
      });
    }
  }

  // ── 5. Preferred Skills ──────────────────────────────────────────
  const matchedPrefSkills = setIntersection(jobPrefSkills, allCandSkills);
  const prefSkillScore =
    jobPrefSkills.length > 0
      ? Math.round((matchedPrefSkills.length / jobPrefSkills.length) * 100)
      : 50;
  const missingPrefSkills = setDifference(jobPrefSkills, allCandSkills);
  dimensionScores.push({
    dimension: 'preferredSkills',
    score: prefSkillScore,
    weight: MATCH_WEIGHTS.preferredSkills,
    matchedItems: matchedPrefSkills,
    missingItems: missingPrefSkills,
  });
  if (matchedPrefSkills.length > 0) {
    matchReasons.push(`${matchedPrefSkills.length} preferred skills`);
  }
  if (missingPrefSkills.length > 0) {
    gapReasons.push(
      `${missingPrefSkills.join(', ')} is preferred but not listed`,
    );
  }

  // ── 6. Required Software ─────────────────────────────────────────
  const matchedReqSw = setIntersection(jobReqSoftware, allCandSoftware);
  const reqSwScore =
    jobReqSoftware.length > 0
      ? Math.round((matchedReqSw.length / jobReqSoftware.length) * 100)
      : 50;
  const missingReqSw = setDifference(jobReqSoftware, allCandSoftware);
  dimensionScores.push({
    dimension: 'requiredSoftware',
    score: reqSwScore,
    weight: MATCH_WEIGHTS.requiredSoftware,
    matchedItems: matchedReqSw,
    missingItems: missingReqSw,
  });
  if (matchedReqSw.length > 0) {
    matchReasons.push(matchedReqSw.join(', '));
  }
  if (missingReqSw.length > 0) {
    gapReasons.push(`Missing software: ${missingReqSw.join(', ')}`);
    for (const sw of missingReqSw) {
      hardFailures.push({
        type: 'software',
        expected: sw,
        actual: 'Not listed',
      });
    }
  }

  // ── 7. Preferred Software ────────────────────────────────────────
  const matchedPrefSw = setIntersection(jobPrefSoftware, allCandSoftware);
  const prefSwScore =
    jobPrefSoftware.length > 0
      ? Math.round((matchedPrefSw.length / jobPrefSoftware.length) * 100)
      : 50;
  const missingPrefSw = setDifference(jobPrefSoftware, allCandSoftware);
  dimensionScores.push({
    dimension: 'preferredSoftware',
    score: prefSwScore,
    weight: MATCH_WEIGHTS.preferredSoftware,
    matchedItems: matchedPrefSw,
    missingItems: missingPrefSw,
  });
  if (missingPrefSw.length > 0) {
    gapReasons.push(`${missingPrefSw.join(', ')} is preferred but not listed`);
  }

  // ── 8. Experience ────────────────────────────────────────────────
  const candYears = candidate.yearsOfExperience || 0;
  const minReq = job.minYearsExperience || 0;
  const maxReq = job.maxYearsExperience || 99;
  let expScore: number;
  if (candYears >= minReq && candYears <= maxReq) {
    expScore = 100;
  } else if (candYears >= minReq && candYears > maxReq) {
    // Overqualified but still relevant — partial credit
    expScore = Math.max(50, 100 - (candYears - maxReq) * 10);
  } else if (candYears < minReq) {
    // Under-qualified — proportional penalty
    const deficit = minReq - candYears;
    if (deficit <= 1) expScore = 60;
    else if (deficit <= 2) expScore = 30;
    else expScore = 0;
  } else {
    expScore = 50;
  }
  dimensionScores.push({
    dimension: 'experience',
    score: expScore,
    weight: MATCH_WEIGHTS.experience,
    note: `${candYears} years (Job: ${minReq}–${maxReq})`,
  });
  if (expScore >= 80) {
    matchReasons.push(`${candYears} years relevant experience`);
  }
  if (candYears < minReq && minReq > 0) {
    hardFailures.push({
      type: 'experience',
      expected: minReq,
      actual: candYears,
    });
    gapReasons.push(
      `Experience: ${candYears}yr vs required ${minReq}yr minimum`,
    );
  }

  // ── 9. Project Experience ────────────────────────────────────────
  const projectMatchResults = matchProjects(job, candidate);
  const projectScore = projectMatchResults.score;
  dimensionScores.push({
    dimension: 'projects',
    score: projectScore,
    weight: MATCH_WEIGHTS.projects,
    matchedItems: projectMatchResults.matchedProjects,
  });
  if (projectMatchResults.matchedProjects.length > 0) {
    matchReasons.push(
      `Relevant project experience: ${projectMatchResults.matchedProjects.join(', ')}`,
    );
  }

  // ── 10. Certifications ───────────────────────────────────────────
  const candCertNames = (candidate.certifications || []).map((c) =>
    normalize(c.name),
  );
  const reqCerts = (job.requiredCertifications || []).map(normalize);
  const matchedCerts = reqCerts.filter((rc) =>
    candCertNames.some((cn) => cn.includes(rc) || rc.includes(cn)),
  );
  const certScore =
    reqCerts.length > 0
      ? Math.round((matchedCerts.length / reqCerts.length) * 100)
      : 50;
  const missingCerts = reqCerts.filter(
    (rc) => !candCertNames.some((cn) => cn.includes(rc) || rc.includes(cn)),
  );
  dimensionScores.push({
    dimension: 'certifications',
    score: certScore,
    weight: MATCH_WEIGHTS.certifications,
    matchedItems: matchedCerts,
    missingItems: missingCerts,
  });
  if (missingCerts.length > 0) {
    gapReasons.push(`Certifications not listed: ${missingCerts.join(', ')}`);
    for (const cert of missingCerts) {
      hardFailures.push({
        type: 'certification',
        expected: cert,
        actual: 'Not listed',
      });
    }
  }

  // ── 11. Education ────────────────────────────────────────────────
  const reqEdu = normalize(job.requiredEducation);
  const candEdus = (candidate.education || []).map(
    (e) => `${normalize(e.qualification)} ${normalize(e.fieldOfStudy)}`,
  );
  const eduMatched =
    !reqEdu ||
    candEdus.some((ce) => ce.includes(reqEdu) || reqEdu.includes(ce));
  const eduScore = eduMatched ? 100 : reqEdu ? 20 : 50;
  dimensionScores.push({
    dimension: 'education',
    score: eduScore,
    weight: MATCH_WEIGHTS.education,
  });
  if (!eduMatched && reqEdu) {
    gapReasons.push(`Education: ${job.requiredEducation} not confirmed`);
  }

  // ── 12. Location ─────────────────────────────────────────────────
  const jobLoc = job.location || '';
  const candLoc = candidate.location || '';
  const candPrefLocs = candidate.preferredLocations || [];
  const allCandLocs = [candLoc, ...candPrefLocs].filter(Boolean);
  const locMatched = !jobLoc || fuzzyLocationMatch(jobLoc, allCandLocs);
  const locScore = locMatched ? 100 : jobLoc ? 20 : 50;
  dimensionScores.push({
    dimension: 'location',
    score: locScore,
    weight: MATCH_WEIGHTS.location,
    note: locMatched
      ? `${candLoc || 'Location matched'}`
      : `Job: ${jobLoc}, Candidate: ${candLoc || 'Not listed'}`,
  });
  if (locMatched && candLoc) matchReasons.push(`${candLoc} location`);
  else if (jobLoc && !locMatched)
    gapReasons.push(`Location: ${jobLoc} not matched`);

  // ── 13. Work Mode ────────────────────────────────────────────────
  const jobWM = normalize(job.workMode);
  const candWM = normalize(
    candidate.careerPreferences?.preferredWorkMode || '',
  );
  const wmMatched =
    !jobWM || caseInsensitiveMatch(jobWM, candWM) || candWM === '';
  const wmScore = wmMatched ? 100 : 40;
  dimensionScores.push({
    dimension: 'workMode',
    score: wmScore,
    weight: MATCH_WEIGHTS.workMode,
  });

  // ── 14. Career Intent ────────────────────────────────────────────
  const prefRoles = (candidate.careerPreferences?.preferredRoles || []).map(
    normalize,
  );
  const prefSectors = (candidate.careerPreferences?.preferredSectors || []).map(
    normalize,
  );
  const jobTitle = normalize(job.title);
  let careerScore = 50; // neutral if no preferences set
  if (prefRoles.length > 0 || prefSectors.length > 0) {
    let matches = 0;
    let checks = 0;
    if (prefRoles.length > 0) {
      checks++;
      if (
        prefRoles.some(
          (r) => jobTitle.includes(r) || r.includes(jobTitle.split(' ')[0]),
        )
      ) {
        matches++;
      }
    }
    if (prefSectors.length > 0 && jobSector) {
      checks++;
      if (
        prefSectors.some((s) => caseInsensitiveMatch(s, normalize(jobSector)))
      ) {
        matches++;
      }
    }
    careerScore = checks > 0 ? Math.round((matches / checks) * 100) : 50;
  }
  dimensionScores.push({
    dimension: 'careerIntent',
    score: careerScore,
    weight: MATCH_WEIGHTS.careerIntent,
  });

  // ── 15. Availability ─────────────────────────────────────────────
  const isOpen =
    candidate.careerPreferences?.openToOpportunities ||
    candidate.availability === 'OPEN_TO_OPPORTUNITIES';
  const availScore = isOpen ? 100 : 30;
  dimensionScores.push({
    dimension: 'availability',
    score: availScore,
    weight: MATCH_WEIGHTS.availability,
    note: isOpen ? 'Open to opportunities' : 'Not actively looking',
  });
  if (isOpen) matchReasons.push('Open to opportunities');

  // ── Weighted Score Calculation ────────────────────────────────────
  let weightedSum = 0;
  for (const dim of dimensionScores) {
    weightedSum += dim.score * dim.weight;
  }
  const finalScore = Math.round(Math.min(100, weightedSum / TOTAL_WEIGHT));

  // ── Hard Requirement Evaluation ───────────────────────────────────
  const passesHard = hardFailures.length === 0;

  // ── Categorization ────────────────────────────────────────────────
  let category: MatchCategory;
  if (!passesHard) {
    category = MatchCategory.POTENTIALLY_COMPATIBLE;
  } else if (finalScore >= MATCH_THRESHOLDS.HIGHLY_COMPATIBLE) {
    category = MatchCategory.HIGHLY_COMPATIBLE;
  } else if (finalScore >= MATCH_THRESHOLDS.STRONGLY_COMPATIBLE) {
    category = MatchCategory.STRONGLY_COMPATIBLE;
  } else {
    category = MatchCategory.POTENTIALLY_COMPATIBLE;
  }

  // All matched skills and software across required + preferred
  const allMatchedSkills = [
    ...new Set([...matchedReqSkills, ...matchedPrefSkills]),
  ];
  const allMatchedSoftware = [...new Set([...matchedReqSw, ...matchedPrefSw])];

  return {
    candidateUserId: candidate.userId,
    score: finalScore,
    category,
    dimensionScores,
    matchReasons,
    gapReasons,
    hardRequirementFailures: hardFailures,
    passesHardRequirements: passesHard,
    matchedSkills: allMatchedSkills,
    matchedSoftware: allMatchedSoftware,
    matchedSectors,
    matchedProjects: projectMatchResults.matchedProjects,
    matchingEngineVersion: 'v1',
  };
}

// ─── Helper: Gather all candidate skills (profile + experience + projects) ─

function gatherCandidateSkills(candidate: CandidateProfile): string[] {
  const skills = new Set<string>();
  const addNormalized = (items: string[]) => {
    for (const item of items) {
      skills.add(normalizeSkill(item));
    }
  };

  addNormalized(candidate.skills || []);
  addNormalized(candidate.structuredSkills?.technicalSkills || []);
  addNormalized(candidate.structuredSkills?.industrySkills || []);
  addNormalized(candidate.structuredSkills?.professionalSkills || []);

  // Skills from experience entries
  for (const exp of candidate.experience || []) {
    addNormalized(exp.skillsUsed || []);
  }

  // Skills from project entries
  for (const proj of candidate.projects || []) {
    addNormalized(proj.skills || []);
  }

  return Array.from(skills);
}

// ─── Helper: Gather all candidate software (profile + experience + projects) ─

function gatherCandidateSoftware(candidate: CandidateProfile): string[] {
  const software = new Set<string>();
  const addNormalized = (items: string[]) => {
    for (const item of items) {
      software.add(normalizeSoftware(item));
    }
  };

  addNormalized(candidate.structuredSkills?.softwareSkills || []);

  // Software from experience entries
  for (const exp of candidate.experience || []) {
    addNormalized(exp.softwareUsed || []);
  }

  // Software from project entries
  for (const proj of candidate.projects || []) {
    addNormalized(proj.softwareUsed || []);
  }

  return Array.from(software);
}

// ─── Helper: Gather all candidate sectors ──────────────────────────────────

function gatherCandidateSectors(
  candidate: CandidateProfile,
  normalizedProfileSectors: string[],
): string[] {
  const sectors = new Set<string>(normalizedProfileSectors);

  // Sectors from experience entries
  for (const exp of candidate.experience || []) {
    if (exp.infrastructureSector) {
      sectors.add(normalizeSector(exp.infrastructureSector));
    }
  }

  // Sectors from project entries
  for (const proj of candidate.projects || []) {
    if (proj.infrastructureSector) {
      sectors.add(normalizeSector(proj.infrastructureSector));
    }
  }

  return Array.from(sectors);
}

// ─── Helper: Match projects ─────────────────────────────────────────────────

function matchProjects(
  job: JobProfile,
  candidate: CandidateProfile,
): { score: number; matchedProjects: string[] } {
  const projects = candidate.projects || [];
  if (projects.length === 0) return { score: 30, matchedProjects: [] }; // Neutral if no projects

  const jobSector = normalizeSector(job.infrastructureSector);
  const jobReqSkills = normalizeList(job.requiredSkills || [], normalizeSkill);
  const jobReqSw = normalizeList(job.requiredSoftware || [], normalizeSoftware);
  const jobTitle = normalize(job.title);

  const matched: string[] = [];
  let totalRelevance = 0;

  for (const proj of projects) {
    let relevance = 0;

    // Sector match
    if (
      proj.infrastructureSector &&
      caseInsensitiveMatch(
        normalizeSector(proj.infrastructureSector),
        jobSector,
      )
    ) {
      relevance += 30;
    }

    // Skill overlap
    const projSkills = normalizeList(proj.skills || [], normalizeSkill);
    const skillOverlap = setIntersection(projSkills, jobReqSkills);
    relevance += Math.min(30, skillOverlap.length * 10);

    // Software overlap
    const projSw = normalizeList(proj.softwareUsed || [], normalizeSoftware);
    const swOverlap = setIntersection(projSw, jobReqSw);
    relevance += Math.min(20, swOverlap.length * 10);

    // Title/description keyword match
    const projTitle = normalize(proj.title);
    const projDesc = normalize(proj.description);
    const titleWords = jobTitle.split(/\s+/).filter((w) => w.length > 3);
    for (const word of titleWords) {
      if (projTitle.includes(word) || projDesc.includes(word)) {
        relevance += 10;
        break;
      }
    }

    if (relevance >= 20) {
      matched.push(proj.title);
      totalRelevance += Math.min(100, relevance);
    }
  }

  const score =
    matched.length > 0
      ? Math.min(100, Math.round(totalRelevance / Math.max(1, matched.length)))
      : 20;

  return { score, matchedProjects: matched.slice(0, 5) };
}

// ─── Recommendation Types Determination ─────────────────────────────────────

/**
 * Determine the qualitative recommendation types for a candidate-job match.
 * Explains multi-label reasons why this job was surfaced for the user.
 */
export function determineRecommendationTypes(
  matchResult: MatchResult,
  job: JobProfile,
  candidate: CandidateProfile,
  isRecentlyPublished = false,
): string[] {
  const types: string[] = [];

  const dimMap: Record<string, number> = {};
  for (const d of matchResult.dimensionScores) {
    dimMap[d.dimension] = d.score;
  }

  // 1. Role match
  const prefRoles = (candidate.careerPreferences?.preferredRoles || []).map(
    (r) => r.toLowerCase(),
  );
  const jobTitleLower = job.title.toLowerCase();
  if (
    prefRoles.some(
      (pr) =>
        jobTitleLower.includes(pr) || pr.includes(jobTitleLower.split(' ')[0]),
    ) ||
    (candidate.currentRole &&
      jobTitleLower.includes(candidate.currentRole.toLowerCase()))
  ) {
    types.push('role_match');
  }

  // 2. Skill match
  if (
    (dimMap['requiredSkills'] || 0) >= 70 ||
    (dimMap['preferredSkills'] || 0) >= 70
  ) {
    types.push('skill_match');
  }

  // 3. Sector match
  if ((dimMap['sector'] || 0) >= 80) {
    types.push('sector_match');
  }

  // 4. Software match
  if (
    (dimMap['requiredSoftware'] || 0) >= 70 ||
    (dimMap['preferredSoftware'] || 0) >= 70
  ) {
    types.push('software_match');
  }

  // 5. Project match
  if (
    (dimMap['projects'] || 0) >= 60 &&
    matchResult.matchedProjects.length > 0
  ) {
    types.push('project_match');
  }

  // 6. Location match
  if ((dimMap['location'] || 0) >= 80) {
    types.push('location_match');
  }

  // 7. Career preference match
  if ((dimMap['careerIntent'] || 0) >= 75) {
    types.push('career_preference_match');
  }

  // 8. New relevant job
  if (isRecentlyPublished) {
    types.push('new_relevant_job');
  }

  // Fallback if none flagged
  if (types.length === 0) {
    types.push('skill_match');
  }

  return types;
}

// ─── Exports for testing ────────────────────────────────────────────────────

export {
  normalizeSoftware,
  normalizeSkill,
  normalizeDiscipline,
  normalizeSector,
  gatherCandidateSkills,
  gatherCandidateSoftware,
};
