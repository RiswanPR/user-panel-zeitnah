import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PROFILE_QUERY_KEYS } from '../constants/profileQueryKeys.js';
import {
  USER_SELECTABLE_ROLES,
  PROFILE_ROLES,
  AVAILABILITY_STATUSES,
  DEFAULT_SOFTWARE_SKILLS,
  DEFAULT_TECHNICAL_SKILLS,
  DEFAULT_PROFESSIONAL_SKILLS,
  DEFAULT_STRUCTURED_SKILLS,
} from '../constants/infrastructureTaxonomy.js';
import {
  normalizeStructuredSkills,
  normalizeCareerPreferences,
  normalizePrivacySettings,
  isFieldVisibleOnPublicProfile,
  normalizeAvailability,
} from './profileNormalization.js';

describe('Profile Integrity & Privacy Contract Regression Tests', () => {
  describe('Structured Skills Normalization & Data Contracts', () => {
    it('normalizes legacy skill keys into canonical schema properties', () => {
      const legacyPayload = {
        software: ['AutoCAD', 'Civil 3D'],
        technical: ['Structural Analysis'],
        industry: ['FIDIC Contracts'],
        professional: ['Project Leadership'],
      };

      const normalized = normalizeStructuredSkills(legacyPayload);
      assert.deepEqual(normalized.softwareSkills, ['AutoCAD', 'Civil 3D']);
      assert.deepEqual(normalized.technicalSkills, ['Structural Analysis']);
      assert.deepEqual(normalized.industrySkills, ['FIDIC Contracts']);
      assert.deepEqual(normalized.professionalSkills, ['Project Leadership']);

      // Backward compatibility aliases exist on the returned object
      assert.deepEqual(normalized.software, ['AutoCAD', 'Civil 3D']);
      assert.deepEqual(normalized.technical, ['Structural Analysis']);
      assert.deepEqual(normalized.industry, ['FIDIC Contracts']);
      assert.deepEqual(normalized.professional, ['Project Leadership']);
    });

    it('normalizes studio alternate keys (softwareTools, technicalCalculations, etc.) correctly', () => {
      const studioPayload = {
        softwareTools: ['Primavera P6', 'Revit'],
        technicalCalculations: ['Reinforced Concrete Design'],
        industryStandards: ['QA/QC Procedures'],
        professionalLeadership: ['Stakeholder Management'],
      };

      const normalized = normalizeStructuredSkills(studioPayload);
      assert.deepEqual(normalized.softwareSkills, ['Primavera P6', 'Revit']);
      assert.deepEqual(normalized.technicalSkills, ['Reinforced Concrete Design']);
      assert.deepEqual(normalized.industrySkills, ['QA/QC Procedures']);
      assert.deepEqual(normalized.professionalSkills, ['Stakeholder Management']);
    });

    it('preserves canonical keys when already provided', () => {
      const canonicalPayload = {
        softwareSkills: ['Navisworks'],
        technicalSkills: ['Seismic Analysis'],
        industrySkills: ['OSHA Compliance'],
        professionalSkills: ['Risk Mitigation'],
      };

      const normalized = normalizeStructuredSkills(canonicalPayload);
      assert.deepEqual(normalized.softwareSkills, ['Navisworks']);
      assert.deepEqual(normalized.technicalSkills, ['Seismic Analysis']);
      assert.deepEqual(normalized.industrySkills, ['OSHA Compliance']);
      assert.deepEqual(normalized.professionalSkills, ['Risk Mitigation']);
    });

    it('safely handles empty, null, or undefined skills without throwing', () => {
      const normalizedNull = normalizeStructuredSkills(null);
      assert.deepEqual(normalizedNull.softwareSkills, []);
      assert.deepEqual(normalizedNull.technicalSkills, []);
      assert.deepEqual(normalizedNull.industrySkills, []);
      assert.deepEqual(normalizedNull.professionalSkills, []);

      const normalizedEmpty = normalizeStructuredSkills({});
      assert.deepEqual(normalizedEmpty.softwareSkills, []);
    });
  });

  describe('Career Preferences Normalization & Compatibility', () => {
    it('normalizes legacy targetRoles and preferredInfrastructureSectors into canonical fields', () => {
      const legacyPrefs = {
        targetRoles: ['Bridge Engineer', 'BIM Manager'],
        preferredInfrastructureSectors: ['Highways', 'Bridges'],
        preferredWorkMode: 'Hybrid',
        expectedSalary: { min: 60000, max: 90000, currency: 'USD' },
        activelyLooking: true,
        noticePeriod: '1 Month',
      };

      const normalized = normalizeCareerPreferences(legacyPrefs);
      assert.deepEqual(normalized.preferredRoles, ['Bridge Engineer', 'BIM Manager']);
      assert.deepEqual(normalized.preferredSectors, ['Highways', 'Bridges']);
      assert.equal(normalized.openToOpportunities, true);
      assert.equal(normalized.preferredWorkMode, 'Hybrid');
      assert.equal(normalized.expectedSalaryRange.min, 60000);
      assert.equal(normalized.expectedSalaryRange.max, 90000);
      assert.equal(normalized.expectedSalaryRange.currency, 'USD');
      assert.equal(normalized.availability, '1 Month');

      // Backward compatibility aliases exist for legacy UI
      assert.deepEqual(normalized.targetRoles, ['Bridge Engineer', 'BIM Manager']);
      assert.deepEqual(normalized.preferredInfrastructureSectors, ['Highways', 'Bridges']);
      assert.equal(normalized.activelyLooking, true);
    });

    it('preserves canonical careerPreferences without dropping fields', () => {
      const canonicalPrefs = {
        openToOpportunities: true,
        preferredRoles: ['Civil Lead'],
        preferredSectors: ['Railways', 'Metro'],
        preferredLocations: ['Mumbai', 'Delhi NCR'],
        preferredWorkMode: 'On-site',
        preferredEmploymentType: 'Full-time',
        expectedSalaryRange: { min: 800000, max: 1500000, currency: 'INR', period: 'yearly' },
        availability: 'Immediate',
        recruiterDiscovery: 'VISIBLE_ALL_RECRUITERS',
      };

      const normalized = normalizeCareerPreferences(canonicalPrefs);
      assert.equal(normalized.openToOpportunities, true);
      assert.deepEqual(normalized.preferredRoles, ['Civil Lead']);
      assert.deepEqual(normalized.preferredSectors, ['Railways', 'Metro']);
      assert.deepEqual(normalized.preferredLocations, ['Mumbai', 'Delhi NCR']);
      assert.equal(normalized.expectedSalaryRange.min, 800000);
      assert.equal(normalized.expectedSalaryRange.max, 1500000);
      assert.equal(normalized.expectedSalaryRange.currency, 'INR');
    });
  });

  describe('Profile Privacy Resolution & Conservative Defaults', () => {
    it('evaluates private fields conservatively when set via canonical keys', () => {
      const privacy = {
        experience: 'PRIVATE',
        education: 'PUBLIC',
        projects: 'PUBLIC',
        certifications: 'PUBLIC',
        careerPreferences: 'PRIVATE',
        contactInfo: 'PRIVATE',
      };

      assert.equal(isFieldVisibleOnPublicProfile(privacy, 'experience', false), false);
      assert.equal(isFieldVisibleOnPublicProfile(privacy, 'education', false), true);
      assert.equal(isFieldVisibleOnPublicProfile(privacy, 'projects', false), true);
      assert.equal(isFieldVisibleOnPublicProfile(privacy, 'certifications', false), true);
      assert.equal(isFieldVisibleOnPublicProfile(privacy, 'careerPreferences', false), false);
      assert.equal(isFieldVisibleOnPublicProfile(privacy, 'contactInfo', false), false);

      // Own profile always has visibility into own records
      assert.equal(isFieldVisibleOnPublicProfile(privacy, 'experience', true), true);
      assert.equal(isFieldVisibleOnPublicProfile(privacy, 'careerPreferences', true), true);
    });

    it('evaluates private fields conservatively when set via legacy keys (e.g. experienceVisibility)', () => {
      const legacyPrivacy = {
        experienceVisibility: 'PRIVATE',
        educationVisibility: 'PUBLIC',
        projectsVisibility: 'PRIVATE',
        certificationsVisibility: 'PUBLIC',
        careerPreferencesVisibility: 'PRIVATE',
        contactInfoVisibility: 'PRIVATE',
      };

      assert.equal(isFieldVisibleOnPublicProfile(legacyPrivacy, 'experience', false), false);
      assert.equal(isFieldVisibleOnPublicProfile(legacyPrivacy, 'education', false), true);
      assert.equal(isFieldVisibleOnPublicProfile(legacyPrivacy, 'projects', false), false);
      assert.equal(isFieldVisibleOnPublicProfile(legacyPrivacy, 'certifications', false), true);
      assert.equal(isFieldVisibleOnPublicProfile(legacyPrivacy, 'careerPreferences', false), false);
    });

    it('defaults missing careerPreferences and contactInfo to PRIVATE conservatively', () => {
      const emptyPrivacy = {};
      const normalized = normalizePrivacySettings(emptyPrivacy);
      assert.equal(normalized.careerPreferences, 'PRIVATE');
      assert.equal(normalized.contactInfo, 'PRIVATE');
      assert.equal(normalized.experience, 'PUBLIC');
      assert.equal(normalized.education, 'PUBLIC');

      assert.equal(isFieldVisibleOnPublicProfile(emptyPrivacy, 'careerPreferences', false), false);
      assert.equal(isFieldVisibleOnPublicProfile(emptyPrivacy, 'contactInfo', false), false);
    });

    it('preserves public access only when explicitly set to PUBLIC', () => {
      const publicCareer = { careerPreferences: 'PUBLIC' };
      assert.equal(isFieldVisibleOnPublicProfile(publicCareer, 'careerPreferences', false), true);

      const recruiterOnly = { careerPreferences: 'VERIFIED_RECRUITERS' };
      assert.equal(isFieldVisibleOnPublicProfile(recruiterOnly, 'careerPreferences', false), false);
    });
  });

  describe('Profile React Query Cache Keys Consistency', () => {
    it('guarantees canonical query keys match across producers and consumers', () => {
      assert.deepEqual(PROFILE_QUERY_KEYS.ME, ['profile', 'me']);
      assert.deepEqual(PROFILE_QUERY_KEYS.COMPLETION, ['myProfileCompletion']);
      assert.deepEqual(PROFILE_QUERY_KEYS.PROJECTS_MY, ['projects', 'my']);
      assert.deepEqual(PROFILE_QUERY_KEYS.RECOMMENDATIONS_MY, ['profile', 'recommendations']);
      assert.deepEqual(PROFILE_QUERY_KEYS.PUBLIC_PROFILE('testuser'), ['profile', 'public', 'testuser']);
      assert.deepEqual(PROFILE_QUERY_KEYS.TAXONOMY, ['profile', 'taxonomy']);
    });
  });

  describe('Professional Identity & Availability Normalization', () => {
    it('normalizes canonical availability values (OPEN_TO_HIRING, OPEN_TO_WORK, NOT_AVAILABLE)', () => {
      assert.equal(normalizeAvailability('OPEN_TO_HIRING'), 'OPEN_TO_HIRING');
      assert.equal(normalizeAvailability('OPEN_TO_WORK'), 'OPEN_TO_WORK');
      assert.equal(normalizeAvailability('NOT_AVAILABLE'), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability('open_to_hiring'), 'OPEN_TO_HIRING');
      assert.equal(normalizeAvailability('open_to_work'), 'OPEN_TO_WORK');
      assert.equal(normalizeAvailability('not_available'), 'NOT_AVAILABLE');
    });

    it('maps legacy availability values safely to preserve user intent', () => {
      assert.equal(normalizeAvailability('OPEN_TO_OPPORTUNITIES'), 'OPEN_TO_WORK');
      assert.equal(normalizeAvailability('AVAILABLE_FOR_COLLABORATION'), 'OPEN_TO_WORK');
      assert.equal(normalizeAvailability('AVAILABLE_FOR_MENTORSHIP'), 'OPEN_TO_WORK');
      assert.equal(normalizeAvailability('NOT_CURRENTLY_AVAILABLE'), 'NOT_AVAILABLE');
    });

    it('safely handles empty, null, or undefined availability without throwing', () => {
      assert.equal(normalizeAvailability(null), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability(undefined), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability(''), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability('RANDOM_STRING'), 'NOT_AVAILABLE');
    });

    it('restricts user-selectable roles strictly to Student, Professional, and Recruiter', () => {
      const selectableValues = USER_SELECTABLE_ROLES.map((r) => r.value);
      assert.deepEqual(selectableValues, ['STUDENT', 'PROFESSIONAL', 'RECRUITER']);
      assert.equal(USER_SELECTABLE_ROLES.length, 3);
    });

    it('preserves Educator as adminOnly and preserves Mentor and Founder in taxonomy', () => {
      const educator = PROFILE_ROLES.find((r) => r.value === 'EDUCATOR');
      assert.equal(educator.adminOnly, true);

      const mentor = PROFILE_ROLES.find((r) => r.value === 'MENTOR');
      assert.equal(mentor.legacyRole, true);

      const founder = PROFILE_ROLES.find((r) => r.value === 'FOUNDER');
      assert.equal(founder.legacyRole, true);

      assert.equal(AVAILABILITY_STATUSES.length, 3);
      assert.deepEqual(
        AVAILABILITY_STATUSES.map((s) => s.value),
        ['OPEN_TO_WORK', 'OPEN_TO_HIRING', 'NOT_AVAILABLE']
      );
    });
  });

  describe('AEC Skills Matrix & Structured Skills Editor Refinement', () => {
    it('verifies StructuredSkillsEditor statically configures exactly 3 AEC categories and excludes industrySkills', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const editorPath = path.resolve('src/components/profile/StructuredSkillsEditor.jsx');
      const content = fs.readFileSync(editorPath, 'utf8');

      // Exactly 3 categories: softwareSkills, technicalSkills, professionalSkills
      assert.match(content, /id:\s*["']softwareSkills["']/);
      assert.match(content, /id:\s*["']technicalSkills["']/);
      assert.match(content, /id:\s*["']professionalSkills["']/);

      // industrySkills must NOT be present in CATEGORY_TABS
      assert.doesNotMatch(content, /CATEGORY_TABS[\s\S]*?id:\s*["']industrySkills["']/);

      // Tab grid layout is 3 columns
      assert.match(content, /grid-cols-3/);

      // Total skill count calculates only the 3 remaining categories
      assert.match(content, /totalSkillCount\s*=[\s\S]*?softwareSkills[\s\S]*?technicalSkills[\s\S]*?professionalSkills/);
      assert.doesNotMatch(content, /totalSkillCount\s*=[\s\S]*?industrySkills/);

      // Suggestions title reflects Curated AEC Suggestions
      assert.match(content, /Curated AEC Suggestions/);
    });

    it('contains comprehensive AEC-focused software skills suggestions', () => {
      const EXPECTED_SOFTWARE = [
        'AutoCAD',
        'Autodesk Revit',
        'Civil 3D',
        'ETABS',
        'SAFE',
        'STAAD.Pro',
        'Tekla Structures',
        'Navisworks',
        'Autodesk BIM 360 / Autodesk Construction Cloud',
        'Primavera P6',
        'Microsoft Project',
        'Microsoft Excel',
        'SketchUp',
        'Autodesk 3ds Max',
        'ArcGIS',
        'QGIS',
      ];

      for (const sw of EXPECTED_SOFTWARE) {
        assert.ok(
          DEFAULT_SOFTWARE_SKILLS.includes(sw),
          `Expected ${sw} to be included in DEFAULT_SOFTWARE_SKILLS`
        );
      }
      assert.equal(DEFAULT_SOFTWARE_SKILLS.length, EXPECTED_SOFTWARE.length);
    });

    it('contains comprehensive AEC-focused technical skills suggestions', () => {
      const EXPECTED_TECHNICAL = [
        'Structural Analysis',
        'Structural Design',
        'Geotechnical Engineering',
        'Highway and Road Design',
        'Bridge Engineering',
        'Quantity Surveying',
        'Estimation and Costing',
        'Building Information Modeling (BIM)',
        'Construction Planning and Scheduling',
        'Construction Quality Control',
        'Site Engineering',
        'Surveying and Setting Out',
        'Reinforced Concrete Design',
        'Steel Structure Design',
        'Water Supply and Drainage Design',
        'Hydrology and Hydraulics',
        'Building Services Coordination',
        'Sustainable Building Design',
        'Health and Safety Management',
      ];

      for (const tech of EXPECTED_TECHNICAL) {
        assert.ok(
          DEFAULT_TECHNICAL_SKILLS.includes(tech),
          `Expected ${tech} to be included in DEFAULT_TECHNICAL_SKILLS`
        );
      }
      assert.equal(DEFAULT_TECHNICAL_SKILLS.length, EXPECTED_TECHNICAL.length);
    });

    it('contains comprehensive AEC-focused professional skills suggestions', () => {
      const EXPECTED_PROFESSIONAL = [
        'Project Coordination',
        'Construction Management',
        'Team Leadership',
        'Technical Communication',
        'Client Coordination',
        'Problem Solving',
        'Risk Management',
        'Contract Administration',
        'Tendering and Procurement',
        'Cost Control',
        'Time Management',
        'Multidisciplinary Coordination',
        'Report Writing',
        'Teamwork',
        'Stakeholder Management',
      ];

      for (const prof of EXPECTED_PROFESSIONAL) {
        assert.ok(
          DEFAULT_PROFESSIONAL_SKILLS.includes(prof),
          `Expected ${prof} to be included in DEFAULT_PROFESSIONAL_SKILLS`
        );
      }
      assert.equal(DEFAULT_PROFESSIONAL_SKILLS.length, EXPECTED_PROFESSIONAL.length);
    });

    it('preserves existing industrySkills when updating software, technical, or professional skills', () => {
      const existingUserSkills = {
        softwareSkills: ['AutoCAD'],
        technicalSkills: ['Structural Analysis'],
        industrySkills: ['FIDIC Contracts', 'Site Supervision', 'QA/QC Procedures'],
        professionalSkills: ['Project Coordination'],
      };

      // User adds "ETABS" to softwareSkills in the editor
      const updatedCategory = [...existingUserSkills.softwareSkills, 'ETABS'];
      const updatedStructured = normalizeStructuredSkills({
        ...existingUserSkills,
        softwareSkills: updatedCategory,
        software: updatedCategory,
        softwareTools: updatedCategory,
      });

      // Existing industry skills MUST remain intact
      assert.deepEqual(updatedStructured.industrySkills, ['FIDIC Contracts', 'Site Supervision', 'QA/QC Procedures']);
      assert.deepEqual(updatedStructured.softwareSkills, ['AutoCAD', 'ETABS']);
      assert.deepEqual(updatedStructured.technicalSkills, ['Structural Analysis']);
      assert.deepEqual(updatedStructured.professionalSkills, ['Project Coordination']);
    });

    it('guarantees public profile rendering preserves legacy industry skills without regression', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const profileSkillsPath = path.resolve('src/components/profile/ProfileSkillsSection.jsx');
      const content = fs.readFileSync(profileSkillsPath, 'utf8');

      // ProfileSkillsSection must still render industry skills conditionally if present
      assert.match(content, /industry\.length\s*>\s*0/);
      assert.match(content, /software\.length\s*>\s*0/);
      assert.match(content, /technical\.length\s*>\s*0/);
      assert.match(content, /professional\.length\s*>\s*0/);
    });

    it('correctly calculates 3+ skills milestone with 3 active categories only', () => {
      function calculateActiveSkillCount(structuredSkills) {
        return (
          (structuredSkills.softwareSkills?.length || 0) +
          (structuredSkills.technicalSkills?.length || 0) +
          (structuredSkills.professionalSkills?.length || 0)
        );
      }

      const empty = { softwareSkills: [], technicalSkills: [], professionalSkills: [] };
      assert.equal(calculateActiveSkillCount(empty), 0);
      assert.equal(calculateActiveSkillCount(empty) >= 3, false);

      const partial = {
        softwareSkills: ['AutoCAD'],
        technicalSkills: ['Structural Design'],
        professionalSkills: [],
        industrySkills: ['FIDIC'], // legacy industry skill not part of the 3 active categories
      };
      assert.equal(calculateActiveSkillCount(partial), 2);
      assert.equal(calculateActiveSkillCount(partial) >= 3, false);

      const qualified = {
        softwareSkills: ['AutoCAD'],
        technicalSkills: ['Structural Design'],
        professionalSkills: ['Project Coordination'],
        industrySkills: ['FIDIC'],
      };
      assert.equal(calculateActiveSkillCount(qualified), 3);
      assert.equal(calculateActiveSkillCount(qualified) >= 3, true);
    });
  });
});
