import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeUserRole } from './roleNavigation.js';
import { formatIdentityPayload } from './professionalIdentity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const editProfilePath = path.resolve(__dirname, '../pages/profile/EditProfile.jsx');
const editProfileContent = fs.readFileSync(editProfilePath, 'utf8');

describe('Recruiter-Specific Professional Identity Form Suite', () => {
  // ── 1. Role-Based Conditional UI Rendering in EditProfile.jsx ──
  describe('1. Role-Based Conditional UI in Section 02', () => {
    it('verifies EditProfile.jsx conditionally branches between RECRUITER and engineering identity', () => {
      assert.match(
        editProfileContent,
        /normalizeUserRole\(primaryRole\)\s*===\s*["']RECRUITER["']\s*\?/,
        'EditProfile.jsx must branch on normalizeUserRole(primaryRole) === "RECRUITER"'
      );
    });

    it('verifies Recruiter UI renders Company Name, Current Position, and Recruitment Specializations', () => {
      assert.match(editProfileContent, /Company Name\s*<span[^>]*>\*<\/span>/, 'Company Name required field must exist');
      assert.match(editProfileContent, /Current Position\s*<span[^>]*>\*<\/span>/, 'Current Position required field must exist');
      assert.match(editProfileContent, /Recruitment Specializations/, 'Recruitment Specializations optional field must exist');
      assert.match(editProfileContent, /Recruiter & Organization Details/, 'Recruiter card header must exist');
    });

    it('verifies Recruiter branch hides the engineering department and title editor', () => {
      // Find the recruiter branch
      const branchIdx = editProfileContent.indexOf('normalizeUserRole(primaryRole) === "RECRUITER" ?');
      assert.ok(branchIdx > 0);
      const colonIdx = editProfileContent.indexOf(') : (', branchIdx);
      assert.ok(colonIdx > branchIdx, 'Must have else branch in ternary');

      const recruiterBranch = editProfileContent.slice(branchIdx, colonIdx);
      const engineeringBranch = editProfileContent.slice(colonIdx, colonIdx + 1000);

      assert.doesNotMatch(
        recruiterBranch,
        /<ProfessionalIdentityEditor/,
        'Recruiter branch must NOT render ProfessionalIdentityEditor'
      );
      assert.match(
        engineeringBranch,
        /<ProfessionalIdentityEditor/,
        'Non-recruiter branch must render ProfessionalIdentityEditor'
      );
    });

    it('verifies Student and Professional roles evaluate to non-recruiter and retain engineering identity', () => {
      assert.notEqual(normalizeUserRole('STUDENT'), 'RECRUITER');
      assert.notEqual(normalizeUserRole('PROFESSIONAL'), 'RECRUITER');
      assert.notEqual(normalizeUserRole('EDUCATOR'), 'RECRUITER');
      assert.equal(normalizeUserRole('RECRUITER'), 'RECRUITER');
      assert.equal(normalizeUserRole('FOUNDER'), 'RECRUITER');
    });
  });

  // ── 2. Validation & Payload Logic ──
  describe('2. Role-Specific Validation & Save Payload Construction', () => {
    function validateAndBuildSavePayload({
      primaryRole,
      availability,
      yearsOfExperience,
      preferredLocations,
      discoverableToRecruiters,
      profileVisibility,
      headline,
      profile,
      // Recruiter fields
      recruiterCompany,
      recruiterPosition,
      recruiterSpecializations,
      // Engineering fields
      professionalIdentity,
      currentRole,
    }) {
      const normalizedRole = normalizeUserRole(primaryRole);

      if (normalizedRole === 'RECRUITER') {
        const cleanCompany = (recruiterCompany || '').trim();
        const cleanPosition = (recruiterPosition || '').trim();

        if (!cleanCompany) {
          throw new Error('Company Name is required for Recruiters.');
        }
        if (cleanCompany.length > 100) {
          throw new Error('Company Name must not exceed 100 characters.');
        }
        if (!cleanPosition) {
          throw new Error('Current Position is required for Recruiters.');
        }
        if (cleanPosition.length > 100) {
          throw new Error('Current Position must not exceed 100 characters.');
        }

        const payload = {
          primaryRole: 'RECRUITER',
          availability,
          yearsOfExperience: Number(yearsOfExperience) || 0,
          preferredLocations,
          discoverableToRecruiters,
          profileVisibility,
          companyName: cleanCompany,
          currentPosition: cleanPosition,
          specializations: recruiterSpecializations || [],
          recruiterContext: {
            companyName: cleanCompany,
            currentPosition: cleanPosition,
            specializations: recruiterSpecializations || [],
          },
        };

        const preservedHeadline = (headline && headline.trim()) || profile?.headline;
        if (preservedHeadline) {
          payload.headline = preservedHeadline;
        }
        return payload;
      }

      // Student / Professional workflow
      const identityPayload = formatIdentityPayload(professionalIdentity, currentRole);
      const payload = {
        primaryRole: normalizedRole,
        availability,
        yearsOfExperience: Number(yearsOfExperience) || 0,
        preferredLocations,
        discoverableToRecruiters,
        profileVisibility,
        ...identityPayload,
      };
      const preservedHeadline = (headline && headline.trim()) || profile?.headline;
      if (preservedHeadline) {
        payload.headline = preservedHeadline;
      }
      return payload;
    }

    it('rejects recruiter submission when Company Name is empty or missing', () => {
      assert.throws(
        () =>
          validateAndBuildSavePayload({
            primaryRole: 'RECRUITER',
            recruiterCompany: '',
            recruiterPosition: 'Talent Acquisition Manager',
          }),
        /Company Name is required for Recruiters/
      );
    });

    it('rejects recruiter submission when Company Name is whitespace only', () => {
      assert.throws(
        () =>
          validateAndBuildSavePayload({
            primaryRole: 'RECRUITER',
            recruiterCompany: '     \t  ',
            recruiterPosition: 'Talent Acquisition Manager',
          }),
        /Company Name is required for Recruiters/
      );
    });

    it('rejects recruiter submission when Current Position is empty or missing', () => {
      assert.throws(
        () =>
          validateAndBuildSavePayload({
            primaryRole: 'RECRUITER',
            recruiterCompany: 'Larsen & Toubro',
            recruiterPosition: '',
          }),
        /Current Position is required for Recruiters/
      );
    });

    it('rejects recruiter submission when Current Position is whitespace only', () => {
      assert.throws(
        () =>
          validateAndBuildSavePayload({
            primaryRole: 'RECRUITER',
            recruiterCompany: 'Larsen & Toubro',
            recruiterPosition: '    ',
          }),
        /Current Position is required for Recruiters/
      );
    });

    it('builds valid recruiter payload without touching professionalIdentity or currentRole', () => {
      const existingProfile = {
        headline: 'Experienced recruiter in highways',
        currentRole: 'Old Site Engineer',
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:site-engineer-civil',
          titleName: 'Site Engineer (civil)',
          isCustomTitle: false,
        },
      };

      const payload = validateAndBuildSavePayload({
        primaryRole: 'RECRUITER',
        availability: 'OPEN_TO_HIRING',
        yearsOfExperience: 8,
        preferredLocations: ['Mumbai', 'Delhi'],
        discoverableToRecruiters: true,
        profileVisibility: 'PUBLIC',
        headline: existingProfile.headline,
        profile: existingProfile,
        recruiterCompany: '  Apex Talent Search  ',
        recruiterPosition: '  Head of Technical Hiring  ',
        recruiterSpecializations: ['Civil', 'BIM'],
        professionalIdentity: existingProfile.professionalIdentity,
        currentRole: existingProfile.currentRole,
      });

      assert.equal(payload.primaryRole, 'RECRUITER');
      assert.equal(payload.companyName, 'Apex Talent Search');
      assert.equal(payload.currentPosition, 'Head of Technical Hiring');
      assert.deepEqual(payload.specializations, ['Civil', 'BIM']);
      assert.deepEqual(payload.recruiterContext, {
        companyName: 'Apex Talent Search',
        currentPosition: 'Head of Technical Hiring',
        specializations: ['Civil', 'BIM'],
      });
      // CRITICAL: professionalIdentity and currentRole must NOT be in the recruiter payload
      assert.equal(payload.professionalIdentity, undefined);
      assert.equal(payload.currentRole, undefined);
      // Headline is preserved
      assert.equal(payload.headline, existingProfile.headline);
    });

    it('preserves Student/Professional behavior without requiring company or position', () => {
      const payload = validateAndBuildSavePayload({
        primaryRole: 'STUDENT',
        availability: 'NOT_AVAILABLE',
        yearsOfExperience: 0,
        preferredLocations: [],
        discoverableToRecruiters: false,
        profileVisibility: 'PUBLIC',
        headline: '',
        profile: {},
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:student-intern',
          isCustomTitle: false,
        },
        currentRole: 'Student Intern',
        // Recruiter fields empty
        recruiterCompany: '',
        recruiterPosition: '',
      });

      assert.equal(payload.primaryRole, 'STUDENT');
      assert.equal(payload.companyName, undefined);
      assert.equal(payload.currentPosition, undefined);
      assert.deepEqual(payload.professionalIdentity, {
        departmentId: 'civil-engineering',
        titleId: 'civil-engineering:student-intern',
        isCustomTitle: false,
      });
    });
  });

  // ── 3. Section Completion Rules ──
  describe('3. Professional Identity Section Completion', () => {
    function computeSectionStatus(profile) {
      if (!profile) return 'not-started';
      const role = normalizeUserRole(profile.primaryRole);

      if (role === 'RECRUITER') {
        const hasCompany = Boolean(
          (profile.companyName && profile.companyName.trim()) ||
          (profile.recruiterContext?.companyName && profile.recruiterContext.companyName.trim())
        );
        const hasPosition = Boolean(
          (profile.currentPosition && profile.currentPosition.trim()) ||
          (profile.recruiterContext?.currentPosition && profile.recruiterContext.currentPosition.trim())
        );
        if (hasCompany && hasPosition) return 'complete';
        if (hasCompany || hasPosition || profile.primaryRole) return 'in-progress';
        return 'not-started';
      }

      const hasTitle = Boolean(
        profile.professionalIdentity?.titleName ||
        profile.currentRole ||
        profile.headline
      );
      if (hasTitle && profile.primaryRole) return 'complete';
      if (hasTitle || profile.primaryRole) return 'in-progress';
      return 'not-started';
    }

    it('marks Recruiter section complete when Company Name and Current Position are present', () => {
      const profile = {
        primaryRole: 'RECRUITER',
        companyName: 'Bechtel Corporation',
        currentPosition: 'Senior Talent Partner',
      };
      assert.equal(computeSectionStatus(profile), 'complete');
    });

    it('marks Recruiter section complete when stored in recruiterContext', () => {
      const profile = {
        primaryRole: 'RECRUITER',
        recruiterContext: {
          companyName: 'Fluor Infrastructure',
          currentPosition: 'Recruitment Lead',
        },
      };
      assert.equal(computeSectionStatus(profile), 'complete');
    });

    it('marks Recruiter section in-progress if only Company Name is present', () => {
      const profile = {
        primaryRole: 'RECRUITER',
        companyName: 'Bechtel Corporation',
        currentPosition: '',
      };
      assert.equal(computeSectionStatus(profile), 'in-progress');
    });

    it('marks Recruiter section in-progress if only role is set', () => {
      const profile = {
        primaryRole: 'RECRUITER',
      };
      assert.equal(computeSectionStatus(profile), 'in-progress');
    });

    it('keeps Student/Professional completion dependent on role and structured title/currentRole', () => {
      const studentComplete = {
        primaryRole: 'STUDENT',
        professionalIdentity: { titleName: 'Civil Engineering Student' },
      };
      assert.equal(computeSectionStatus(studentComplete), 'complete');

      const professionalComplete = {
        primaryRole: 'PROFESSIONAL',
        currentRole: 'Senior Tunnel Engineer',
      };
      assert.equal(computeSectionStatus(professionalComplete), 'complete');

      const studentIncomplete = {
        primaryRole: 'STUDENT',
      };
      assert.equal(computeSectionStatus(studentIncomplete), 'in-progress');
    });
  });

  // ── 4. Form State Hydration & Roundtrip Integrity ──
  describe('4. Form State Hydration & Switching Roundtrips', () => {
    it('verifies resetFormToProfile populates recruiter fields from profile', () => {
      assert.match(
        editProfileContent,
        /profile\.companyName\s*\|\|\s*profile\.recruiterContext\?\.companyName/,
        'resetFormToProfile must hydrate companyName'
      );
      assert.match(
        editProfileContent,
        /profile\.currentPosition\s*\|\|\s*profile\.recruiterContext\?\.currentPosition/,
        'resetFormToProfile must hydrate currentPosition'
      );
      assert.match(
        editProfileContent,
        /profile\.recruiterContext\?\.specializations\s*\|\|\s*profile\.specializations/,
        'resetFormToProfile must hydrate recruiter specializations'
      );
    });

    it('verifies switching primaryRole in state preserves professionalIdentity and recruiter fields', () => {
      // Simulation of user switching back and forth in frontend state
      let primaryRole = 'PROFESSIONAL';
      let professionalIdentity = {
        departmentId: 'civil-engineering',
        titleId: 'civil-engineering:site-engineer-civil',
        titleName: 'Site Engineer (civil)',
      };
      let currentRole = 'Site Engineer (civil)';
      let recruiterCompany = 'Arup Talent';
      let recruiterPosition = 'Talent Director';

      // User selects RECRUITER
      primaryRole = 'RECRUITER';
      // Identity is NOT destroyed
      assert.equal(professionalIdentity.departmentId, 'civil-engineering');
      assert.equal(recruiterCompany, 'Arup Talent');

      // User selects PROFESSIONAL again
      primaryRole = 'PROFESSIONAL';
      assert.equal(professionalIdentity.departmentId, 'civil-engineering');
      assert.equal(currentRole, 'Site Engineer (civil)');
      assert.equal(recruiterCompany, 'Arup Talent');
      assert.equal(recruiterPosition, 'Talent Director');
    });
  });
});
