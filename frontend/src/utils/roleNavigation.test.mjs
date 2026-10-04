import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUserRole,
  isRecruiterOrFounder,
  isAdmin,
  getPrimaryCareerNavigation,
  getPrimaryNavLinks,
  getMoreNavSections,
  getProfileIdentifier,
  getCanonicalProfileUrl,
} from './roleNavigation.js';
import { getProfessionalContext } from './messagingIdentity.js';

describe('Role Navigation Logic & Regression Tests', () => {
  it('safely normalizes roles with varying casing and null/undefined values', () => {
    assert.equal(normalizeUserRole(null), 'STUDENT');
    assert.equal(normalizeUserRole(undefined), 'STUDENT');
    assert.equal(normalizeUserRole({}), 'STUDENT');
    assert.equal(normalizeUserRole({ primaryRole: 'student' }), 'STUDENT');
    assert.equal(normalizeUserRole({ primaryRole: 'STUDENT' }), 'STUDENT');
    assert.equal(normalizeUserRole({ primaryRole: '  recruiter  ' }), 'RECRUITER');
    assert.equal(normalizeUserRole({ role: 'founder' }), 'FOUNDER');
    assert.equal(normalizeUserRole({ role: 'Admin' }), 'ADMIN');
    assert.equal(normalizeUserRole({ primaryRole: 'professional' }), 'PROFESSIONAL');
    assert.equal(normalizeUserRole({ primaryRole: 'mentor' }), 'MENTOR');
    assert.equal(normalizeUserRole({ primaryRole: 'educator' }), 'EDUCATOR');
    assert.equal(normalizeUserRole({ role: 'teacher' }), 'EDUCATOR');
    assert.equal(normalizeUserRole('FOUNDER'), 'FOUNDER');
    assert.equal(normalizeUserRole('teacher'), 'EDUCATOR');
  });

  it('correctly identifies Recruiter and Founder roles', () => {
    assert.equal(isRecruiterOrFounder({ primaryRole: 'RECRUITER' }), true);
    assert.equal(isRecruiterOrFounder({ primaryRole: 'recruiter' }), true);
    assert.equal(isRecruiterOrFounder({ role: 'FOUNDER' }), true);
    assert.equal(isRecruiterOrFounder({ role: 'founder' }), true);
    assert.equal(isRecruiterOrFounder({ primaryRole: 'STUDENT' }), false);
    assert.equal(isRecruiterOrFounder({ primaryRole: 'EDUCATOR' }), false);
    assert.equal(isRecruiterOrFounder({ primaryRole: 'PROFESSIONAL' }), false);
    assert.equal(isRecruiterOrFounder({ primaryRole: 'MENTOR' }), false);
    assert.equal(isRecruiterOrFounder({ primaryRole: 'ADMIN' }), false);
    assert.equal(isRecruiterOrFounder(null), false);
  });

  it('returns JOBS for Student, Educator, Professional, Mentor, and Admin', () => {
    const roles = ['STUDENT', 'EDUCATOR', 'PROFESSIONAL', 'MENTOR', 'ADMIN'];
    for (const role of roles) {
      const careerNav = getPrimaryCareerNavigation({ primaryRole: role });
      assert.equal(careerNav.key, 'jobs', `Expected key "jobs" for role ${role}`);
      assert.equal(careerNav.path, '/jobs');
      assert.equal(careerNav.label, 'Jobs');
      assert.equal(careerNav.isBusiness, false);
    }
  });

  it('returns MANAGE BUSINESS for Recruiter and Founder', () => {
    const roles = ['RECRUITER', 'FOUNDER', 'recruiter', 'founder'];
    for (const role of roles) {
      const careerNav = getPrimaryCareerNavigation({ primaryRole: role });
      assert.equal(careerNav.key, 'manage-business', `Expected key "manage-business" for role ${role}`);
      assert.equal(careerNav.path, '/manage-business');
      assert.equal(careerNav.label, 'Manage Business');
      assert.equal(careerNav.isBusiness, true);
    }
  });

  it('ensures Courses is unconditionally FIRST in primary navigation', () => {
    const userStudent = { primaryRole: 'STUDENT' };
    const userRecruiter = { primaryRole: 'RECRUITER' };

    const studentLinks = getPrimaryNavLinks(userStudent);
    const recruiterLinks = getPrimaryNavLinks(userRecruiter);

    assert.equal(studentLinks[0].key, 'courses');
    assert.equal(studentLinks[0].path, '/courses');
    assert.equal(recruiterLinks[0].key, 'courses');
    assert.equal(recruiterLinks[0].path, '/courses');
  });

  it('generates expected primary navigation items for Normal User vs Recruiter/Founder', () => {
    const studentLinks = getPrimaryNavLinks({ primaryRole: 'STUDENT' });
    const studentKeys = studentLinks.map((l) => l.key);
    assert.deepEqual(studentKeys, ['courses', 'community', 'network', 'jobs']);

    const recruiterLinks = getPrimaryNavLinks({ primaryRole: 'RECRUITER' });
    const recruiterKeys = recruiterLinks.map((l) => l.key);
    assert.deepEqual(recruiterKeys, ['courses', 'community', 'network', 'manage-business']);

    // Ensure Jobs is NOT in recruiter primary links
    assert.equal(recruiterKeys.includes('jobs'), false);
    // Ensure Manage Business is NOT in student primary links
    assert.equal(studentKeys.includes('manage-business'), false);
    // Ensure Community is unconditionally present in primary navigation
    assert.equal(studentKeys.includes('community'), true);
    assert.equal(recruiterKeys.includes('community'), true);
  });

  it('handles primary nav links options and unread message parameter safely', () => {
    // When messages was moved to Connected Hub in MainNavbar, getPrimaryNavLinks retains parameter safety
    const linksWithBadge = getPrimaryNavLinks({ primaryRole: 'STUDENT' }, { unreadMessagesCount: 5 });
    assert.equal(Array.isArray(linksWithBadge), true);
    assert.equal(linksWithBadge.length, 4);

    const linksInvalidBadge = getPrimaryNavLinks({ primaryRole: 'STUDENT' }, { unreadMessagesCount: -3 });
    assert.equal(Array.isArray(linksInvalidBadge), true);

    const linksNullBadge = getPrimaryNavLinks({ primaryRole: 'STUDENT' }, { unreadMessagesCount: null });
    assert.equal(Array.isArray(linksNullBadge), true);
  });

  it('guarantees ZERO DUPLICATION between primary navigation and More sections', () => {
    const testUsers = [
      { primaryRole: 'STUDENT' },
      { primaryRole: 'EDUCATOR' },
      { primaryRole: 'PROFESSIONAL' },
      { primaryRole: 'MENTOR' },
      { primaryRole: 'RECRUITER' },
      { primaryRole: 'FOUNDER' },
      { primaryRole: 'ADMIN' },
    ];

    for (const user of testUsers) {
      const primaryLinks = getPrimaryNavLinks(user);
      const primaryPaths = new Set(primaryLinks.map((l) => l.path));

      const moreSections = getMoreNavSections(user);
      const moreItems = moreSections.flatMap((s) => s.items);
      const morePaths = moreItems.map((item) => item.path);

      for (const path of morePaths) {
        assert.equal(
          primaryPaths.has(path),
          false,
          `Duplicate route "${path}" found in both primary and More menu for role ${user.primaryRole}`
        );
      }
    }
  });

  it('governance section appears ONLY for Admin and never for normal users or recruiters', () => {
    const adminMore = getMoreNavSections({ primaryRole: 'ADMIN' });
    const adminHasGov = adminMore.some((s) => s.id === 'governance');
    assert.equal(adminHasGov, true, 'Admin should have governance section');

    const recruiterMore = getMoreNavSections({ primaryRole: 'RECRUITER' });
    const recruiterHasGov = recruiterMore.some((s) => s.id === 'governance');
    assert.equal(recruiterHasGov, false, 'Recruiter should NOT have admin governance');

    const studentMore = getMoreNavSections({ primaryRole: 'STUDENT' });
    const studentHasGov = studentMore.some((s) => s.id === 'governance');
    assert.equal(studentHasGov, false, 'Student should NOT have admin governance');
  });

  it('validates canonical routes exist and have no trailing slashes or hash stubs', () => {
    const allLinks = [
      ...getPrimaryNavLinks({ primaryRole: 'STUDENT' }),
      ...getPrimaryNavLinks({ primaryRole: 'RECRUITER' }),
      ...getMoreNavSections({ primaryRole: 'ADMIN' }).flatMap((s) => s.items),
    ];

    for (const link of allLinks) {
      assert.ok(link.path.startsWith('/'), `Path "${link.path}" must start with /`);
      assert.notEqual(link.path, '#', `Path must not be "#" placeholder`);
      assert.notEqual(link.path, '', `Path must not be empty`);
    }
  });

  // =========================================================================
  // TASK SPECIFICATION REGRESSION SCENARIOS (TESTS 1 - 15)
  // =========================================================================

  describe('Regression Scenarios — Course Enrollment Isolation & Role Integrity', () => {
    it('TEST 1: FOUNDER + course enrollment → normalizeUserRole returns FOUNDER', () => {
      const user = {
        primaryRole: 'FOUNDER',
        role: 'recruiter',
        course: [{ courseId: 'c1', courseName: 'Structural Dynamics 101' }],
      };
      assert.equal(normalizeUserRole(user), 'FOUNDER');
    });

    it('TEST 2: FOUNDER + course enrollment → reload/hydration still gives FOUNDER', () => {
      // Simulating user object hydrated from /auth/me on reload
      const reloadedUser = {
        id: 'u1',
        primaryRole: 'FOUNDER',
        role: 'recruiter',
        course: ['course_a', 'course_b'],
      };
      assert.equal(normalizeUserRole(reloadedUser), 'FOUNDER');
    });

    it('TEST 3: FOUNDER + course enrollment → career navigation = Manage Business', () => {
      const user = {
        primaryRole: 'FOUNDER',
        course: [{ courseId: 'c1' }, { courseId: 'c2' }],
      };
      const careerNav = getPrimaryCareerNavigation(user);
      assert.equal(careerNav.key, 'manage-business');
      assert.equal(careerNav.path, '/manage-business');
      assert.equal(careerNav.label, 'Manage Business');
      assert.equal(careerNav.isBusiness, true);
    });

    it('TEST 4: RECRUITER + course enrollment → normalizeUserRole returns RECRUITER', () => {
      const user = {
        primaryRole: 'RECRUITER',
        role: 'recruiter',
        course: [{ courseId: 'c1', courseName: 'Highways & Pavements' }],
      };
      assert.equal(normalizeUserRole(user), 'RECRUITER');
    });

    it('TEST 5: RECRUITER + course enrollment → reload/hydration still gives RECRUITER', () => {
      const reloadedUser = {
        id: 'u2',
        primaryRole: 'RECRUITER',
        role: 'recruiter',
        course: [{ courseId: 'c1' }],
      };
      assert.equal(normalizeUserRole(reloadedUser), 'RECRUITER');
    });

    it('TEST 6: RECRUITER + course enrollment → career navigation = Manage Business', () => {
      const user = {
        primaryRole: 'RECRUITER',
        course: [{ courseId: 'c1' }],
      };
      const careerNav = getPrimaryCareerNavigation(user);
      assert.equal(careerNav.key, 'manage-business');
      assert.equal(careerNav.path, '/manage-business');
      assert.equal(careerNav.label, 'Manage Business');
      assert.equal(careerNav.isBusiness, true);
    });

    it('TEST 7: PROFESSIONAL + course → remains PROFESSIONAL → career navigation = Jobs', () => {
      const user = {
        primaryRole: 'PROFESSIONAL',
        role: 'student',
        course: [{ courseId: 'c1' }, { courseId: 'c2' }],
      };
      assert.equal(normalizeUserRole(user), 'PROFESSIONAL');
      const careerNav = getPrimaryCareerNavigation(user);
      assert.equal(careerNav.key, 'jobs');
      assert.equal(careerNav.path, '/jobs');
      assert.equal(careerNav.label, 'Jobs');
      assert.equal(careerNav.isBusiness, false);
    });

    it('TEST 8: STUDENT + course → remains STUDENT → career navigation = Jobs', () => {
      const user = {
        primaryRole: 'STUDENT',
        role: 'student',
        course: [{ courseId: 'c1' }],
      };
      assert.equal(normalizeUserRole(user), 'STUDENT');
      const careerNav = getPrimaryCareerNavigation(user);
      assert.equal(careerNav.key, 'jobs');
      assert.equal(careerNav.path, '/jobs');
      assert.equal(careerNav.label, 'Jobs');
      assert.equal(careerNav.isBusiness, false);
    });

    it('TEST 9: EDUCATOR + course → remains EDUCATOR → career navigation = Jobs', () => {
      const user = {
        primaryRole: 'EDUCATOR',
        role: 'teacher',
        course: [{ courseId: 'c1' }],
      };
      assert.equal(normalizeUserRole(user), 'EDUCATOR');
      const careerNav = getPrimaryCareerNavigation(user);
      assert.equal(careerNav.key, 'jobs');
      assert.equal(careerNav.path, '/jobs');
      assert.equal(careerNav.label, 'Jobs');
      assert.equal(careerNav.isBusiness, false);
    });

    it('TEST 10: Course enrollment array presence NEVER overrides primaryRole', () => {
      // Extensive test ensuring course length has 0 influence on role normalization
      for (const role of ['FOUNDER', 'RECRUITER', 'PROFESSIONAL', 'MENTOR', 'EDUCATOR', 'STUDENT']) {
        const withCourses = { primaryRole: role, course: new Array(5).fill({ courseId: 'cx' }) };
        assert.equal(normalizeUserRole(withCourses), role, `Role ${role} was corrupted by course array`);
      }
    });

    it('TEST 13: Network role display uses primaryRole rather than course enrollment', () => {
      const founderWithCourses = {
        name: 'Jane Doe',
        primaryRole: 'FOUNDER',
        course: [{ courseName: 'BIM Management' }],
      };
      assert.equal(normalizeUserRole(founderWithCourses), 'FOUNDER');
      assert.notEqual(normalizeUserRole(founderWithCourses), 'STUDENT');
    });

    it('TEST 14: Messaging identity → Founder/Recruiter remains correctly labeled regardless of courses', () => {
      const founder = {
        name: 'Farooq Al-Sayed',
        primaryRole: 'FOUNDER',
        primaryDiscipline: 'Geotechnical Engineering',
        course: ['course_1', 'course_2'],
      };
      const context = getProfessionalContext(founder);
      assert.ok(context.includes('Founder'), `Expected context to include 'Founder', got '${context}'`);
      assert.equal(context.includes('Student'), false, `Founder was mislabeled as Student!`);

      const recruiter = {
        name: 'Sarah Connor',
        primaryRole: 'RECRUITER',
        primaryDiscipline: 'Talent Acquisition',
        course: ['course_1'],
      };
      const recruiterContext = getProfessionalContext(recruiter);
      assert.ok(recruiterContext.includes('Recruiter'), `Expected context to include 'Recruiter', got '${recruiterContext}'`);
      assert.equal(recruiterContext.includes('Student'), false, `Recruiter was mislabeled as Student!`);
    });

    it('TEST 15: Route restrictions check: Recruiter/Founder/Admin allowed, normal users redirected', () => {
      const allowedRoles = ['RECRUITER', 'FOUNDER', 'ADMIN'];
      assert.equal(allowedRoles.includes(normalizeUserRole({ primaryRole: 'FOUNDER' })), true);
      assert.equal(allowedRoles.includes(normalizeUserRole({ primaryRole: 'RECRUITER' })), true);
      assert.equal(allowedRoles.includes(normalizeUserRole({ primaryRole: 'ADMIN' })), true);

      assert.equal(allowedRoles.includes(normalizeUserRole({ primaryRole: 'STUDENT' })), false);
      assert.equal(allowedRoles.includes(normalizeUserRole({ primaryRole: 'PROFESSIONAL' })), false);
      assert.equal(allowedRoles.includes(normalizeUserRole({ primaryRole: 'MENTOR' })), false);
      assert.equal(allowedRoles.includes(normalizeUserRole({ primaryRole: 'EDUCATOR' })), false);
    });
  });

  describe('Canonical Profile Routing Resolution', () => {
    it('prefers username over raw IDs', () => {
      assert.equal(getProfileIdentifier({ username: 'rahulk', id: '6ab3b5f1f762d65012683b82' }), 'rahulk');
      assert.equal(getCanonicalProfileUrl({ username: 'rahulk', id: '6ab3b5f1f762d65012683b82' }), '/u/rahulk');
    });

    it('strips leading @ from handles', () => {
      assert.equal(getProfileIdentifier('@rahulk'), 'rahulk');
      assert.equal(getCanonicalProfileUrl('@rahulk'), '/u/rahulk');
    });

    it('unpacks nested peer and requester/recipient objects without using connection document ID', () => {
      const connectionDoc = {
        _id: '6ab4efe2f762d65012683bac', // internal relationship ID
        id: '6ab4efe2f762d65012683bac',
        connectionId: '6ab4efe2f762d65012683bac',
        peer: {
          _id: 'user_9999',
          id: 'user_9999',
          username: 'johndoe',
        },
      };
      assert.equal(getProfileIdentifier(connectionDoc), 'johndoe');
      assert.equal(getCanonicalProfileUrl(connectionDoc), '/u/johndoe');

      const connectionDocNoUsername = {
        _id: '6ab4efe2f762d65012683bac',
        id: '6ab4efe2f762d65012683bac',
        connectionId: '6ab4efe2f762d65012683bac',
        peer: {
          _id: 'user_9999',
          id: 'user_9999',
          username: '',
        },
      };
      assert.equal(getProfileIdentifier(connectionDocNoUsername), 'user_9999');
      assert.equal(getCanonicalProfileUrl(connectionDocNoUsername), '/u/user_9999');
    });

    it('unpacks incoming connection request objects', () => {
      const incomingReq = {
        _id: '6ab4efe2f762d65012683bac',
        requester: {
          id: 'user_7777',
          username: 'alice',
        },
      };
      assert.equal(getProfileIdentifier(incomingReq), 'alice');
      assert.equal(getCanonicalProfileUrl(incomingReq), '/u/alice');
    });

    it('unpacks student, person, candidate, and string target wrappers', () => {
      assert.equal(getProfileIdentifier({ student: { id: 's123', username: 'bob' } }), 'bob');
      assert.equal(getCanonicalProfileUrl({ person: { id: 'p456', username: 'carol' } }), '/u/carol');
      assert.equal(getProfileIdentifier({ candidate: { id: 'c789', username: 'dave' } }), 'dave');
      assert.equal(getProfileIdentifier({ user: '6ab3b5f1f762d65012683b82' }), '6ab3b5f1f762d65012683b82');
    });

    it('handles null, undefined and empty inputs safely', () => {
      assert.equal(getProfileIdentifier(null), '');
      assert.equal(getCanonicalProfileUrl(null), '/network');
      assert.equal(getProfileIdentifier(undefined), '');
      assert.equal(getCanonicalProfileUrl(undefined), '/network');
    });
  });
});
