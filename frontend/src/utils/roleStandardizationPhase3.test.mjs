import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUserRole,
  isRecruiterOrFounder,
  isAdmin,
  isCanonicalCommunityRole,
  CANONICAL_COMMUNITY_ROLES,
  getPrimaryCareerNavigation,
  getPrimaryNavLinks,
  getMoreNavSections,
} from './roleNavigation.js';
import {
  CANONICAL_COMMUNITY_ROLES as TAXONOMY_CANONICAL_ROLES,
  PROFILE_ROLES,
  USER_SELECTABLE_ROLES,
  DISCOVERY_ROLE_FILTERS,
} from '../constants/infrastructureTaxonomy.js';
import { getProfessionalContext } from './messagingIdentity.js';
import { normalizeAvailability } from './profileNormalization.js';

describe('Phase 3: Frontend Role Standardization & UI Integrity Suite', () => {
  describe('1. Canonical Role Taxonomy & Normalization Engine', () => {
    it('CANONICAL 1: exactly 4 authoritative community roles are recognized', () => {
      assert.deepEqual(CANONICAL_COMMUNITY_ROLES, [
        'STUDENT',
        'PROFESSIONAL',
        'RECRUITER',
        'EDUCATOR',
      ]);
      assert.deepEqual(TAXONOMY_CANONICAL_ROLES, CANONICAL_COMMUNITY_ROLES);

      for (const role of CANONICAL_COMMUNITY_ROLES) {
        assert.equal(isCanonicalCommunityRole(role), true, `Role ${role} should be canonical`);
        assert.equal(isCanonicalCommunityRole(role.toLowerCase()), true, `Lowercase ${role} should match`);
      }
      assert.equal(isCanonicalCommunityRole('MENTOR'), false, 'MENTOR is legacy, not canonical');
      assert.equal(isCanonicalCommunityRole('FOUNDER'), false, 'FOUNDER is legacy, not canonical');
      assert.equal(isCanonicalCommunityRole('ADMIN'), false, 'ADMIN is system privilege, not community role');
      assert.equal(isCanonicalCommunityRole(null), false);
      assert.equal(isCanonicalCommunityRole(undefined), false);
    });

    it('CANONICAL 2: maps legacy and alias roles to authoritative canonical community identity', () => {
      // Student
      assert.equal(normalizeUserRole('STUDENT'), 'STUDENT');
      assert.equal(normalizeUserRole('student'), 'STUDENT');
      assert.equal(normalizeUserRole({ primaryRole: 'STUDENT' }), 'STUDENT');
      assert.equal(normalizeUserRole({ role: 'student' }), 'STUDENT');

      // Professional & Mentor -> PROFESSIONAL
      assert.equal(normalizeUserRole('PROFESSIONAL'), 'PROFESSIONAL');
      assert.equal(normalizeUserRole('professional'), 'PROFESSIONAL');
      assert.equal(normalizeUserRole('MENTOR'), 'PROFESSIONAL');
      assert.equal(normalizeUserRole('mentor'), 'PROFESSIONAL');
      assert.equal(normalizeUserRole({ primaryRole: 'MENTOR' }), 'PROFESSIONAL');
      assert.equal(normalizeUserRole({ role: 'mentor' }), 'PROFESSIONAL');

      // Recruiter & Founder -> RECRUITER
      assert.equal(normalizeUserRole('RECRUITER'), 'RECRUITER');
      assert.equal(normalizeUserRole('recruiter'), 'RECRUITER');
      assert.equal(normalizeUserRole('FOUNDER'), 'RECRUITER');
      assert.equal(normalizeUserRole('founder'), 'RECRUITER');
      assert.equal(normalizeUserRole({ primaryRole: 'FOUNDER' }), 'RECRUITER');
      assert.equal(normalizeUserRole({ role: 'founder' }), 'RECRUITER');

      // Educator & Teacher -> EDUCATOR
      assert.equal(normalizeUserRole('EDUCATOR'), 'EDUCATOR');
      assert.equal(normalizeUserRole('educator'), 'EDUCATOR');
      assert.equal(normalizeUserRole('TEACHER'), 'EDUCATOR');
      assert.equal(normalizeUserRole('teacher'), 'EDUCATOR');
      assert.equal(normalizeUserRole({ primaryRole: 'EDUCATOR' }), 'EDUCATOR');
      assert.equal(normalizeUserRole({ role: 'teacher' }), 'EDUCATOR');

      // Admin & Superuser -> ADMIN
      assert.equal(normalizeUserRole('ADMIN'), 'ADMIN');
      assert.equal(normalizeUserRole('admin'), 'ADMIN');
      assert.equal(normalizeUserRole('SUPERUSER'), 'ADMIN');
      assert.equal(normalizeUserRole('superuser'), 'ADMIN');
      assert.equal(normalizeUserRole({ primaryRole: 'ADMIN' }), 'ADMIN');
    });

    it('CANONICAL 3: safe fallbacks for empty, missing, invalid inputs', () => {
      assert.equal(normalizeUserRole(null), 'STUDENT');
      assert.equal(normalizeUserRole(undefined), 'STUDENT');
      assert.equal(normalizeUserRole(''), 'STUDENT');
      assert.equal(normalizeUserRole('   '), 'STUDENT');
      assert.equal(normalizeUserRole({}), 'STUDENT');
      assert.equal(normalizeUserRole('invalid_string'), 'STUDENT');
      assert.equal(normalizeUserRole('invalid_string', 'PROFESSIONAL'), 'PROFESSIONAL');
    });
  });

  describe('2. Role Identity Decoupled from Capabilities & Authorization', () => {
    it('CAPABILITY 1: mentorship operates via availability and capability, not role identity', () => {
      const mentorProfessional = {
        name: 'Dr. Jane Smith',
        primaryRole: 'PROFESSIONAL',
        mentorship: { isAvailableForMentorship: true, topics: ['BIM', 'Civil Structures'] },
        availability: 'AVAILABLE_FOR_MENTORSHIP',
      };

      // Role is canonically PROFESSIONAL
      assert.equal(normalizeUserRole(mentorProfessional), 'PROFESSIONAL');
      // Mentorship availability normalizes safely
      assert.equal(normalizeAvailability(mentorProfessional.availability), 'OPEN_TO_WORK');
      // Primary career navigation remains Jobs
      const nav = getPrimaryCareerNavigation(mentorProfessional);
      assert.equal(nav.key, 'jobs');
      assert.equal(nav.path, '/jobs');
    });

    it('CAPABILITY 2: business ownership operates via organization membership, separate from platform role', () => {
      // Recruiter with organizations
      const recruiterUser = {
        id: 'u_recruiter',
        primaryRole: 'RECRUITER',
      };
      assert.equal(isRecruiterOrFounder(recruiterUser), true);
      const recruiterNav = getPrimaryCareerNavigation(recruiterUser);
      assert.equal(recruiterNav.key, 'manage-business');
      assert.equal(recruiterNav.path, '/manage-business');

      // Legacy Founder user canonically maps to Recruiter and gets Manage Business
      const legacyFounder = {
        id: 'u_founder',
        primaryRole: 'FOUNDER',
        role: 'recruiter',
      };
      assert.equal(normalizeUserRole(legacyFounder), 'RECRUITER');
      assert.equal(isRecruiterOrFounder(legacyFounder), true);
      const founderNav = getPrimaryCareerNavigation(legacyFounder);
      assert.equal(founderNav.key, 'manage-business');
      assert.equal(founderNav.path, '/manage-business');
    });

    it('CAPABILITY 3: student user cannot access manage-business', () => {
      const studentUser = { primaryRole: 'STUDENT' };
      assert.equal(isRecruiterOrFounder(studentUser), false);
      const studentNav = getPrimaryCareerNavigation(studentUser);
      assert.equal(studentNav.key, 'jobs');
      assert.equal(studentNav.path, '/jobs');
    });
  });

  describe('3. Selectors, Taxonomies & Discovery Filters', () => {
    it('SELECTORS 1: USER_SELECTABLE_ROLES only permits self-service community roles (Student, Professional, Recruiter)', () => {
      const selectableValues = USER_SELECTABLE_ROLES.map((r) => r.value);
      assert.deepEqual(selectableValues, ['STUDENT', 'PROFESSIONAL', 'RECRUITER']);

      // Educator must be admin-assigned only
      const educatorRole = PROFILE_ROLES.find((r) => r.value === 'EDUCATOR');
      assert.ok(educatorRole);
      assert.equal(educatorRole.adminOnly, true);

      // Mentor and Founder are legacy roles
      const mentorRole = PROFILE_ROLES.find((r) => r.value === 'MENTOR');
      assert.ok(mentorRole);
      assert.equal(mentorRole.legacyRole, true);
      assert.equal(mentorRole.canonicalMapping, 'PROFESSIONAL');

      const founderRole = PROFILE_ROLES.find((r) => r.value === 'FOUNDER');
      assert.ok(founderRole);
      assert.equal(founderRole.legacyRole, true);
      assert.equal(founderRole.canonicalMapping, 'RECRUITER');
    });

    it('DISCOVERY 1: DISCOVERY_ROLE_FILTERS provides persona filters without redundant legacy Founder', () => {
      const filterValues = DISCOVERY_ROLE_FILTERS.map((f) => f.value);
      assert.deepEqual(filterValues, ['STUDENT', 'PROFESSIONAL', 'RECRUITER', 'EDUCATOR', 'MENTOR']);
      assert.equal(filterValues.includes('FOUNDER'), false, 'Founder should not be a redundant filter pill');

      const mentorFilter = DISCOVERY_ROLE_FILTERS.find((f) => f.value === 'MENTOR');
      assert.equal(mentorFilter.isCapability, true, 'Mentor filter represents mentorship capability discovery');
    });
  });

  describe('4. Navigation & Route Guard Consistency', () => {
    it('NAV 1: Courses is unconditionally first for all canonical roles', () => {
      for (const role of CANONICAL_COMMUNITY_ROLES) {
        const links = getPrimaryNavLinks({ primaryRole: role });
        assert.equal(links[0].key, 'courses', `Courses must be first for ${role}`);
      }
    });

    it('NAV 2: Recruiter gets Manage Business, others get Jobs', () => {
      const recruiterLinks = getPrimaryNavLinks({ primaryRole: 'RECRUITER' });
      assert.ok(recruiterLinks.some((l) => l.key === 'manage-business'));
      assert.equal(recruiterLinks.some((l) => l.key === 'jobs'), false);

      const studentLinks = getPrimaryNavLinks({ primaryRole: 'STUDENT' });
      assert.ok(studentLinks.some((l) => l.key === 'jobs'));
      assert.equal(studentLinks.some((l) => l.key === 'manage-business'), false);

      const professionalLinks = getPrimaryNavLinks({ primaryRole: 'PROFESSIONAL' });
      assert.ok(professionalLinks.some((l) => l.key === 'jobs'));
      assert.equal(professionalLinks.some((l) => l.key === 'manage-business'), false);

      const educatorLinks = getPrimaryNavLinks({ primaryRole: 'EDUCATOR' });
      assert.ok(educatorLinks.some((l) => l.key === 'jobs'));
      assert.equal(educatorLinks.some((l) => l.key === 'manage-business'), false);
    });

    it('NAV 3: Admin gets administration governance, community roles do not', () => {
      const adminSections = getMoreNavSections({ primaryRole: 'ADMIN' });
      assert.ok(adminSections.some((s) => s.id === 'governance'));

      for (const role of CANONICAL_COMMUNITY_ROLES) {
        const sections = getMoreNavSections({ primaryRole: role });
        assert.equal(
          sections.some((s) => s.id === 'governance'),
          false,
          `Role ${role} should not see governance section`
        );
      }
    });
  });

  describe('5. Messaging Identity Resolution with Canonical Roles', () => {
    it('MESSAGING 1: context uses canonical role and preserves discipline', () => {
      const professionalUser = {
        primaryRole: 'PROFESSIONAL',
        primaryDiscipline: 'Structural Engineering',
      };
      const context = getProfessionalContext(professionalUser);
      assert.equal(context, 'Professional • Structural Engineering');

      const recruiterUser = {
        primaryRole: 'RECRUITER',
        primaryDiscipline: 'Talent Acquisition',
      };
      const recruiterContext = getProfessionalContext(recruiterUser);
      assert.equal(recruiterContext, 'Recruiter • Talent Acquisition');

      // Legacy MENTOR normalizes to Professional
      const mentorUser = {
        primaryRole: 'MENTOR',
        primaryDiscipline: 'Bridge Design',
      };
      const mentorContext = getProfessionalContext(mentorUser);
      assert.equal(mentorContext, 'Professional • Bridge Design');

      // Legacy FOUNDER normalizes to Recruiter
      const founderUser = {
        primaryRole: 'FOUNDER',
        primaryDiscipline: 'Construction Tech',
      };
      const founderContext = getProfessionalContext(founderUser);
      assert.equal(founderContext, 'Recruiter • Construction Tech');
    });

    it('MESSAGING 2: custom job title/headline overrides generic role tag', () => {
      const founderWithTitle = {
        primaryRole: 'FOUNDER',
        currentRole: 'Managing Director & Founder',
        primaryDiscipline: 'Civil Infrastructure',
      };
      const context = getProfessionalContext(founderWithTitle);
      assert.equal(context, 'Managing Director & Founder');
    });
  });
});
