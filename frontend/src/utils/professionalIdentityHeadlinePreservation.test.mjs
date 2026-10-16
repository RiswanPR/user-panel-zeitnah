import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatIdentityPayload } from './professionalIdentity.js';
import { normalizeUserRole } from './roleNavigation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const editProfilePath = path.resolve(__dirname, '../pages/profile/EditProfile.jsx');
const editProfileContent = fs.readFileSync(editProfilePath, 'utf8');

describe('Professional Identity Section — Headline Removal & Preservation Suite', () => {
  describe('1. Visible Headline Field Removal from Section 02', () => {
    it('verifies Professional Headline input is removed from Section 02 of EditProfile.jsx', () => {
      // Find the Section 02 boundary
      const sec02Start = editProfileContent.indexOf('SECTION 02 OF 08');
      const sec03Start = editProfileContent.indexOf('SECTION 03 OF 08');
      assert.ok(sec02Start > 0, 'Section 02 must exist in EditProfile.jsx');
      assert.ok(sec03Start > sec02Start, 'Section 03 must follow Section 02');

      const sec02Content = editProfileContent.slice(sec02Start, sec03Start);

      // Verify no headline label or input in Section 02
      assert.doesNotMatch(
        sec02Content,
        /Professional Headline/i,
        'Professional Headline label must be removed from Section 02'
      );
      assert.doesNotMatch(
        sec02Content,
        /Concise summary displayed in network search/i,
        'Headline helper text must be removed from Section 02'
      );
      assert.doesNotMatch(
        sec02Content,
        /placeholder=["'][^"']*Primavera P6/i,
        'Headline placeholder must be removed from Section 02'
      );
    });

    it('verifies RoleSelector and ProfessionalIdentityEditor are directly adjacent in the form', () => {
      const sec02Start = editProfileContent.indexOf('SECTION 02 OF 08');
      const sec03Start = editProfileContent.indexOf('SECTION 03 OF 08');
      const sec02Content = editProfileContent.slice(sec02Start, sec03Start);

      const roleSelectorIdx = sec02Content.indexOf('<RoleSelector');
      const identityEditorIdx = sec02Content.indexOf('<ProfessionalIdentityEditor');

      assert.ok(roleSelectorIdx > 0, 'RoleSelector must exist in Section 02');
      assert.ok(identityEditorIdx > 0, 'ProfessionalIdentityEditor must exist in Section 02');
      assert.ok(
        roleSelectorIdx < identityEditorIdx,
        'RoleSelector must precede ProfessionalIdentityEditor'
      );

      // Between RoleSelector closing and ProfessionalIdentityEditor opening, there should be no input or headline elements
      const between = sec02Content.slice(
        sec02Content.indexOf('/>', roleSelectorIdx) + 2,
        identityEditorIdx
      );
      assert.doesNotMatch(between, /<input/i, 'No input elements between RoleSelector and ProfessionalIdentityEditor');
      assert.doesNotMatch(between, /headline/i, 'No headline references between RoleSelector and ProfessionalIdentityEditor');
    });

    it('verifies all required Section 02 components remain intact', () => {
      const sec02Start = editProfileContent.indexOf('SECTION 02 OF 08');
      const sec03Start = editProfileContent.indexOf('SECTION 03 OF 08');
      const sec02Content = editProfileContent.slice(sec02Start, sec03Start);

      assert.match(sec02Content, /<RoleSelector/, 'RoleSelector component must be retained');
      assert.match(sec02Content, /<ProfessionalIdentityEditor/, 'ProfessionalIdentityEditor must be retained');
      assert.match(sec02Content, /Availability Status/, 'Availability Status must be retained');
      assert.match(sec02Content, /Save Professional Identity/, 'Save Professional Identity button must be retained');
      assert.match(sec02Content, /handleSaveProfessionalIdentity/, 'Save handler must be retained');
    });
  });

  describe('2. Headline Preservation in Save Payload', () => {
    // Pure function replicating the payload construction in handleSaveProfessionalIdentity
    function buildProfessionalIdentityPayload({
      headline,
      profile,
      primaryRole,
      availability,
      yearsOfExperience,
      preferredLocations,
      discoverableToRecruiters,
      profileVisibility,
      professionalIdentity,
      currentRole,
    }) {
      const identityPayload = formatIdentityPayload(professionalIdentity, currentRole);
      const payload = {
        primaryRole: normalizeUserRole(primaryRole),
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

    it('preserves existing profile headline when saving professional identity', () => {
      const existingProfile = {
        headline: 'Principal Bridge Engineer | Major Infrastructure',
        currentRole: 'Senior Structural Engineer',
      };

      const payload = buildProfessionalIdentityPayload({
        headline: existingProfile.headline,
        profile: existingProfile,
        primaryRole: 'PROFESSIONAL',
        availability: 'AVAILABLE_FOR_WORK',
        yearsOfExperience: 10,
        preferredLocations: ['London'],
        discoverableToRecruiters: true,
        profileVisibility: 'PUBLIC',
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:bridge-engineer',
          isCustomTitle: false,
        },
        currentRole: 'Bridge Engineer',
      });

      assert.equal(
        payload.headline,
        'Principal Bridge Engineer | Major Infrastructure',
        'Payload must preserve existing headline exactly'
      );
      assert.equal(payload.primaryRole, 'PROFESSIONAL');
      assert.deepEqual(payload.professionalIdentity, {
        departmentId: 'civil-engineering',
        titleId: 'civil-engineering:bridge-engineer',
        isCustomTitle: false,
      });
    });

    it('falls back to profile.headline if headline state variable is empty/missing', () => {
      const existingProfile = {
        headline: 'Rail Systems Consultant',
      };

      const payload = buildProfessionalIdentityPayload({
        headline: '', // empty in state
        profile: existingProfile,
        primaryRole: 'PROFESSIONAL',
        availability: 'AVAILABLE_FOR_WORK',
        yearsOfExperience: 5,
        preferredLocations: [],
        discoverableToRecruiters: false,
        profileVisibility: 'PUBLIC',
        professionalIdentity: {
          departmentId: 'rail-transportation',
          titleId: 'rail-transportation:signalling-engineer',
          isCustomTitle: false,
        },
        currentRole: 'Signalling Engineer',
      });

      assert.equal(payload.headline, 'Rail Systems Consultant');
    });

    it('does NOT include headline in payload when user had no headline, preventing empty string overwrite', () => {
      const newProfile = {
        headline: '',
      };

      const payload = buildProfessionalIdentityPayload({
        headline: '',
        profile: newProfile,
        primaryRole: 'STUDENT',
        availability: 'NOT_AVAILABLE',
        yearsOfExperience: 0,
        preferredLocations: [],
        discoverableToRecruiters: false,
        profileVisibility: 'PUBLIC',
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:student-intern',
          isCustomTitle: false,
        },
        currentRole: 'Student Intern',
      });

      assert.equal(
        payload.headline,
        undefined,
        'Payload headline must be undefined when no headline exists, preventing backend wipe'
      );
    });

    it('never overwrites headline with currentRole or professionalIdentity title', () => {
      const profile = {
        headline: 'Specialist in Geotechnical Instrumentation',
        currentRole: 'Geotechnical Engineer',
      };

      const payload = buildProfessionalIdentityPayload({
        headline: profile.headline,
        profile,
        primaryRole: 'PROFESSIONAL',
        availability: 'AVAILABLE_FOR_WORK',
        yearsOfExperience: 8,
        preferredLocations: [],
        discoverableToRecruiters: true,
        profileVisibility: 'PUBLIC',
        professionalIdentity: {
          departmentId: 'geotechnical-engineering',
          customTitle: 'Lead Tunnel Monitoring Specialist',
          isCustomTitle: true,
        },
        currentRole: 'Lead Tunnel Monitoring Specialist',
      });

      assert.equal(payload.headline, 'Specialist in Geotechnical Instrumentation');
      assert.notEqual(payload.headline, payload.currentRole);
      assert.equal(
        payload.professionalIdentity.customTitle,
        'Lead Tunnel Monitoring Specialist'
      );
    });
  });

  describe('3. Section Completion & Navigation Integrity', () => {
    function computeSectionStatus(profile) {
      if (!profile) return 'not-started';
      const hasTitle = Boolean(
        profile.professionalIdentity?.titleName ||
        profile.currentRole ||
        profile.headline
      );
      if (hasTitle && profile.primaryRole) return 'complete';
      if (hasTitle || profile.primaryRole) return 'in-progress';
      return 'not-started';
    }

    it('marks section complete when user has primaryRole and structured title without headline', () => {
      const profile = {
        primaryRole: 'PROFESSIONAL',
        professionalIdentity: {
          departmentId: 'project-management',
          titleName: 'Senior Project Director',
        },
      };
      assert.equal(computeSectionStatus(profile), 'complete');
    });

    it('marks section complete when user has primaryRole and legacy currentRole without headline', () => {
      const profile = {
        primaryRole: 'STUDENT',
        currentRole: 'Graduate Civil Engineer',
      };
      assert.equal(computeSectionStatus(profile), 'complete');
    });

    it('marks section complete when user has primaryRole and legacy headline', () => {
      const profile = {
        primaryRole: 'PROFESSIONAL',
        headline: 'Site Superintendent',
      };
      assert.equal(computeSectionStatus(profile), 'complete');
    });

    it('marks section in-progress if only primaryRole is set', () => {
      const profile = {
        primaryRole: 'PROFESSIONAL',
      };
      assert.equal(computeSectionStatus(profile), 'in-progress');
    });

    it('marks section not-started if neither role nor title is set', () => {
      const profile = {};
      assert.equal(computeSectionStatus(profile), 'not-started');
    });
  });

  describe('4. Preservation of Headline Support Across Other Views', () => {
    it('verifies EditProfile.jsx still renders headline in Live Preview Card', () => {
      assert.match(
        editProfileContent,
        /\{headline\s*&&\s*<p[^>]*>{headline}<\/p>\}/,
        'Live Preview sidebar card must still render headline when present'
      );
    });

    it('verifies EditProfile.jsx still checks headline in Publish Readiness Checklist', () => {
      assert.match(
        editProfileContent,
        /profile\?\.headline\s*\?[\s\S]*?Professional headline added/,
        'Readiness checklist must still recognize existing headline'
      );
    });

    it('verifies ProfileHero.jsx still renders headline', () => {
      const heroPath = path.resolve(__dirname, '../components/profile/ProfileHero.jsx');
      const heroContent = fs.readFileSync(heroPath, 'utf8');
      assert.match(
        heroContent,
        /\{\/\*\s*Professional Headline\s*\*\/\}/,
        'ProfileHero must keep Professional Headline rendering block'
      );
      assert.match(
        heroContent,
        /profile(\?)?\.headline/,
        'ProfileHero must output profile.headline'
      );
    });
  });
});
