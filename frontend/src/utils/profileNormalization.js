/**
 * Authoritative data contract normalization utilities for Zeitnah Profile subsystem.
 * Bridges differences between legacy UI representations and canonical backend schemas.
 */

/**
 * Normalizes structured engineering skills into the canonical backend schema:
 * {
 *   technicalSkills: string[],
 *   softwareSkills: string[],
 *   industrySkills: string[],
 *   professionalSkills: string[]
 * }
 * while maintaining backward-compatible aliases for legacy consumers.
 */
export function normalizeStructuredSkills(rawSkills = {}) {
  const source = rawSkills || {};

  const technicalSkills = Array.isArray(source.technicalSkills)
    ? source.technicalSkills
    : Array.isArray(source.technical)
    ? source.technical
    : Array.isArray(source.technicalCalculations)
    ? source.technicalCalculations
    : [];

  const softwareSkills = Array.isArray(source.softwareSkills)
    ? source.softwareSkills
    : Array.isArray(source.software)
    ? source.software
    : Array.isArray(source.softwareTools)
    ? source.softwareTools
    : [];

  const industrySkills = Array.isArray(source.industrySkills)
    ? source.industrySkills
    : Array.isArray(source.industry)
    ? source.industry
    : Array.isArray(source.industryStandards)
    ? source.industryStandards
    : [];

  const professionalSkills = Array.isArray(source.professionalSkills)
    ? source.professionalSkills
    : Array.isArray(source.professional)
    ? source.professional
    : Array.isArray(source.professionalLeadership)
    ? source.professionalLeadership
    : [];

  return {
    // Canonical backend schema
    technicalSkills,
    softwareSkills,
    industrySkills,
    professionalSkills,

    // Backward-compatible aliases for legacy views & editors
    technical: technicalSkills,
    software: softwareSkills,
    industry: industrySkills,
    professional: professionalSkills,
    technicalCalculations: technicalSkills,
    softwareTools: softwareSkills,
    industryStandards: industrySkills,
    professionalLeadership: professionalSkills,
  };
}

/**
 * Normalizes career preferences into the canonical backend schema:
 * {
 *   openToOpportunities: boolean,
 *   preferredRoles: string[],
 *   preferredSectors: string[],
 *   preferredLocations: string[],
 *   preferredWorkMode: string,
 *   preferredEmploymentType: string,
 *   expectedSalaryRange: { min: number, max: number, currency: string, period: string },
 *   availability: string,
 *   recruiterDiscovery: string
 * }
 * while preserving legacy aliases (targetRoles, preferredInfrastructureSectors, etc.).
 */
export function normalizeCareerPreferences(rawPrefs = {}) {
  const source = rawPrefs || {};

  const openToOpportunities = Boolean(
    source.openToOpportunities ?? source.activelyLooking ?? false
  );

  const preferredRoles = Array.isArray(source.preferredRoles)
    ? source.preferredRoles
    : Array.isArray(source.targetRoles)
    ? source.targetRoles
    : [];

  const preferredSectors = Array.isArray(source.preferredSectors)
    ? source.preferredSectors
    : Array.isArray(source.preferredInfrastructureSectors)
    ? source.preferredInfrastructureSectors
    : [];

  const preferredLocations = Array.isArray(source.preferredLocations)
    ? source.preferredLocations
    : [];

  const preferredWorkMode =
    source.preferredWorkMode ||
    (Array.isArray(source.workModes) && source.workModes[0]) ||
    "Hybrid";

  const preferredEmploymentType =
    source.preferredEmploymentType || "Full-time";

  const rawSalary = source.expectedSalaryRange || source.expectedSalary || {};
  const minSalary = Number(rawSalary.min) || 0;
  const maxSalary = Number(rawSalary.max) || 0;
  const currency = String(rawSalary.currency || "USD").toUpperCase();
  const period = String(rawSalary.period || "yearly").toLowerCase();

  const expectedSalaryRange = {
    min: minSalary,
    max: maxSalary,
    currency,
    period,
  };

  const availability =
    source.availability || source.noticePeriod || "Immediate";

  const recruiterDiscovery =
    source.recruiterDiscovery || "VISIBLE_ALL_RECRUITERS";

  return {
    // Canonical backend schema
    openToOpportunities,
    preferredRoles,
    preferredSectors,
    preferredLocations,
    preferredWorkMode,
    preferredEmploymentType,
    expectedSalaryRange,
    availability,
    recruiterDiscovery,

    // Backward-compatible aliases for legacy UI forms
    targetRoles: preferredRoles,
    preferredInfrastructureSectors: preferredSectors,
    workModes: [preferredWorkMode],
    activelyLooking: openToOpportunities,
    noticePeriod: availability,
    expectedSalary: {
      min: minSalary > 0 ? minSalary : "",
      max: maxSalary > 0 ? maxSalary : "",
      currency,
    },
  };
}

/**
 * Normalizes privacy settings into the canonical backend schema:
 * {
 *   experience: 'PUBLIC' | 'PRIVATE',
 *   education: 'PUBLIC' | 'PRIVATE',
 *   projects: 'PUBLIC' | 'PRIVATE',
 *   certifications: 'PUBLIC' | 'PRIVATE',
 *   careerPreferences: 'PRIVATE' | 'VERIFIED_RECRUITERS' | 'PUBLIC',
 *   contactInfo: 'PRIVATE' | 'NETWORK' | 'PUBLIC',
 *   messaging: string,
 *   readReceipts: boolean,
 *   onlinePresence: boolean
 * }
 * Applies conservative defaults: careerPreferences and contactInfo default to PRIVATE/NETWORK.
 */
export function normalizePrivacySettings(rawPrivacy = {}) {
  const source = rawPrivacy || {};

  const resolveVisibility = (canonicalVal, legacyVal, defaultVal) => {
    const candidate = canonicalVal || legacyVal || defaultVal;
    return String(candidate).toUpperCase();
  };

  const experience = resolveVisibility(
    source.experience,
    source.experienceVisibility,
    "PUBLIC"
  );
  const education = resolveVisibility(
    source.education,
    source.educationVisibility,
    "PUBLIC"
  );
  const projects = resolveVisibility(
    source.projects,
    source.projectsVisibility,
    "PUBLIC"
  );
  const certifications = resolveVisibility(
    source.certifications,
    source.certificationsVisibility,
    "PUBLIC"
  );
  const careerPreferences = resolveVisibility(
    source.careerPreferences,
    source.careerPreferencesVisibility,
    "PRIVATE"
  );
  const contactInfo = resolveVisibility(
    source.contactInfo,
    source.contactInfoVisibility,
    "PRIVATE"
  );

  const messaging = source.messaging || "ANYONE";
  const readReceipts = Boolean(source.readReceipts ?? true);
  const onlinePresence = Boolean(source.onlinePresence ?? true);

  return {
    // Canonical backend schema
    experience,
    education,
    projects,
    certifications,
    careerPreferences,
    contactInfo,
    messaging,
    readReceipts,
    onlinePresence,

    // Backward-compatible aliases for legacy frontend visibility checks
    experienceVisibility: experience,
    educationVisibility: education,
    projectsVisibility: projects,
    certificationsVisibility: certifications,
    careerPreferencesVisibility: careerPreferences,
    contactInfoVisibility: contactInfo,
  };
}

/**
 * Safe visibility evaluator for public profile views.
 * Conservatively verifies both canonical and legacy keys.
 * A field is visible if and only if NEITHER the canonical NOR legacy key is set to 'PRIVATE'.
 */
export function isFieldVisibleOnPublicProfile(privacySettings, fieldName, isOwnProfile = false) {
  if (isOwnProfile) return true;
  if (!privacySettings) return true;

  const normalized = normalizePrivacySettings(privacySettings);
  switch (fieldName) {
    case "experience":
      return normalized.experience !== "PRIVATE" && normalized.experienceVisibility !== "PRIVATE";
    case "education":
      return normalized.education !== "PRIVATE" && normalized.educationVisibility !== "PRIVATE";
    case "projects":
      return normalized.projects !== "PRIVATE" && normalized.projectsVisibility !== "PRIVATE";
    case "certifications":
      return normalized.certifications !== "PRIVATE" && normalized.certificationsVisibility !== "PRIVATE";
    case "careerPreferences":
      return normalized.careerPreferences === "PUBLIC" || normalized.careerPreferencesVisibility === "PUBLIC";
    case "contactInfo":
      return normalized.contactInfo === "PUBLIC" || normalized.contactInfoVisibility === "PUBLIC";
    default:
      return true;
  }
}

/**
 * Normalizes professional availability into canonical choices:
 * - OPEN_TO_HIRING (hiring talent)
 * - OPEN_TO_WORK (looking for employment / opportunities)
 * - NOT_AVAILABLE (not currently available)
 * while safely preserving legacy intent.
 */
export function normalizeAvailability(raw) {
  if (!raw) return "NOT_AVAILABLE";
  const val = String(raw).trim().toUpperCase();
  switch (val) {
    case "OPEN_TO_HIRING":
      return "OPEN_TO_HIRING";
    case "OPEN_TO_WORK":
    case "OPEN_TO_OPPORTUNITIES":
    case "AVAILABLE_FOR_COLLABORATION":
    case "AVAILABLE_FOR_MENTORSHIP":
      return "OPEN_TO_WORK";
    case "NOT_AVAILABLE":
    case "NOT_CURRENTLY_AVAILABLE":
      return "NOT_AVAILABLE";
    default:
      return "NOT_AVAILABLE";
  }
}

export {
  sortExperienceDescending,
  formatExperienceDateRange,
  formatExperienceDateForInput,
  parseExperienceDateSafe,
  isExperienceOngoing,
  validateExperienceDates,
  calculateTotalExperience,
} from "./experienceTimeline.js";

export {
  sortEducationDescending,
  formatEducationDateRange,
  formatEducationDateForInput,
  parseEducationDateSafe,
  isEducationOngoing,
  inferAcademicDegreeLevel,
  extractAcademicHonors,
  validateEducationForm,
  AEC_QUALIFICATION_SUGGESTIONS,
  AEC_FIELD_OF_STUDY_SUGGESTIONS,
} from "./educationAcademic.js";
