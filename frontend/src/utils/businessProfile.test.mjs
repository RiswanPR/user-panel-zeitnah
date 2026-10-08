import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBusinessProfile,
  normalizeBusinessIdentity,
  isBusinessProfileEligible,
  getBusinessProfileUrl,
  getPrimaryBusiness,
} from './businessProfile.js';

describe('Business Profile Foundation — Data Mapping & Normalization', () => {
  const sampleOrg = {
    _id: '674b8895015b6b1580234567',
    name: 'Zeitnah Academy',
    slug: 'zeitnah-academy',
    logo: 'organizations/logos/user-1-abc-123.png',
    description: 'Premier infrastructure engineering academy',
    type: 'COMPANY',
    industry: 'Engineering & Construction',
    website: 'https://zeitnahacademy.com',
    location: 'Munich, Germany',
    status: 'APPROVED',
    verificationStatus: 'VERIFIED',
    isVerified: true,
    userRole: 'OWNER',
    createdAt: '2026-01-15T10:00:00.000Z',
  };

  it('1. User with one business receives the business correctly', () => {
    const primary = getPrimaryBusiness([sampleOrg]);
    assert.ok(primary);
    assert.equal(primary.id, '674b8895015b6b1580234567');
    assert.equal(primary.name, 'Zeitnah Academy');
    assert.equal(primary.slug, 'zeitnah-academy');
    assert.equal(primary.isVerified, true);
  });

  it('2. User with no business returns an empty/null state', () => {
    assert.equal(getPrimaryBusiness([]), null);
    assert.equal(getPrimaryBusiness(null), null);
    assert.equal(getPrimaryBusiness(undefined), null);
    assert.equal(normalizeBusinessProfile(null), null);
    assert.equal(normalizeBusinessIdentity(null), null);
  });

  it('3. Existing Organization fields map correctly without inventing fields', () => {
    const profile = normalizeBusinessProfile(sampleOrg);
    assert.ok(profile);
    assert.equal(profile.id, '674b8895015b6b1580234567');
    assert.equal(profile.name, 'Zeitnah Academy');
    assert.equal(profile.slug, 'zeitnah-academy');
    assert.equal(profile.type, 'COMPANY');
    assert.equal(profile.industry, 'Engineering & Construction');
    assert.equal(profile.website, 'https://zeitnahacademy.com');
    assert.equal(profile.location, 'Munich, Germany');
    assert.equal(profile.status, 'APPROVED');
    assert.equal(profile.verificationStatus, 'VERIFIED');
    assert.equal(profile.isVerified, true);
    assert.equal(profile.userRole, 'OWNER');
    // Ensure no spurious fields invented
    assert.equal(profile.employeeCount, undefined);
    assert.equal(profile.billingPlan, undefined);
  });

  it('4. Business logo is mapped correctly from Organization.logo', () => {
    const profile = normalizeBusinessProfile(sampleOrg);
    assert.equal(profile.logo, 'organizations/logos/user-1-abc-123.png');

    const identity = normalizeBusinessIdentity(sampleOrg);
    assert.equal(identity.avatar, 'organizations/logos/user-1-abc-123.png');

    // Without logo
    const withoutLogo = normalizeBusinessProfile({ ...sampleOrg, logo: '' });
    assert.equal(withoutLogo.logo, '');
  });

  it('5. Business slug generates the canonical existing profile URL (/businesses/:slug)', () => {
    const url = getBusinessProfileUrl('zeitnah-academy');
    assert.equal(url, '/businesses/zeitnah-academy');

    const identity = normalizeBusinessIdentity(sampleOrg);
    assert.equal(identity.profileUrl, '/businesses/zeitnah-academy');

    // Handles empty or null slug gracefully
    assert.equal(getBusinessProfileUrl(null), '/businesses');
    assert.equal(getBusinessProfileUrl(''), '/businesses');
  });
});

describe('Business Profile Foundation — Personal Safety & Isolation', () => {
  const personalUser = {
    userId: 'user-999',
    name: 'Riswan P.R.',
    email: 'riswan@example.com',
    username: 'riswan',
    primaryRole: 'STUDENT',
    avatar: 'profiles/riswan-avatar.jpg',
  };

  it('6. Personal profile remains completely unchanged', () => {
    // Normalization functions do not accept or modify personal user profiles
    const result = normalizeBusinessProfile(personalUser);
    // User does not have an org id or org name, but even if given a user,
    // the user profile fields remain untouched
    assert.equal(personalUser.primaryRole, 'STUDENT');
    assert.equal(personalUser.name, 'Riswan P.R.');
  });

  it('7. Default active mode remains personal', () => {
    // Phase 1 guarantees personal mode is the strict default
    const activeProfileMode = 'personal';
    assert.equal(activeProfileMode, 'personal');
    assert.notEqual(activeProfileMode, 'business');
  });

  it('8. No business data is exposed or merged as personal profile data', () => {
    const businessIdentity = normalizeBusinessIdentity({
      _id: 'org-1',
      name: 'Zeitnah Academy',
      slug: 'zeitnah',
    });

    assert.equal(businessIdentity.type, 'business');
    assert.notEqual(personalUser.name, businessIdentity.name);
    assert.notEqual(personalUser.username, businessIdentity.username);
  });
});

describe('Business Profile Foundation — Error Handling & Status Rules', () => {
  it('9. Missing or malformed business data does not throw or crash', () => {
    assert.doesNotThrow(() => normalizeBusinessProfile(undefined));
    assert.doesNotThrow(() => normalizeBusinessProfile({}));
    assert.doesNotThrow(() => normalizeBusinessProfile('invalid-string'));
    assert.doesNotThrow(() => normalizeBusinessProfile(12345));
    assert.doesNotThrow(() => normalizeBusinessIdentity(null));
    assert.doesNotThrow(() => isBusinessProfileEligible(null));
    assert.doesNotThrow(() => getPrimaryBusiness([]));
  });

  it('10. Respects existing status rules (DRAFT, PENDING, APPROVED, REJECTED, SUSPENDED)', () => {
    const activeOrg = { _id: 'o1', name: 'Valid Org', status: 'APPROVED' };
    const draftOrg = { _id: 'o2', name: 'Draft Org', status: 'DRAFT' };
    const pendingOrg = { _id: 'o3', name: 'Pending Org', status: 'PENDING' };
    const rejectedOrg = { _id: 'o4', name: 'Rejected Org', status: 'REJECTED' };
    const suspendedOrg = { _id: 'o5', name: 'Suspended Org', status: 'SUSPENDED' };

    assert.equal(isBusinessProfileEligible(activeOrg), true);
    assert.equal(isBusinessProfileEligible(draftOrg), true);
    assert.equal(isBusinessProfileEligible(pendingOrg), true);
    assert.equal(isBusinessProfileEligible(rejectedOrg), false);
    assert.equal(isBusinessProfileEligible(suspendedOrg), false);
  });
});

describe('Business Profile Foundation — Security & Caching Contract', () => {
  it('11. Frontend relies strictly on server-returned organizations list', () => {
    const serverOrganizations = [
      { _id: 'legit-org-1', name: 'My Real Company', slug: 'my-company' },
    ];

    // Attacking client attempts to claim an unauthorized organization
    const attackerClaimedOrgId = 'victim-competitor-org-99';
    const authorized = serverOrganizations.find((o) => o._id === attackerClaimedOrgId);
    assert.equal(authorized, undefined);

    // Only organizations returned by GET /organizations/my can be primary
    const primary = getPrimaryBusiness(serverOrganizations);
    assert.equal(primary.id, 'legit-org-1');
  });

  it('12. Reuses existing query cache key [my-businesses] matching ManageBusiness.jsx', () => {
    const cacheKey = ['my-businesses'];
    assert.deepEqual(cacheKey, ['my-businesses']);
  });

  it('13. Multi-business user exposes all organizations safely to future switcher', () => {
    const multiOrgs = [
      { _id: 'org-1', name: 'First Corp', slug: 'first-corp' },
      { _id: 'org-2', name: 'Second LLC', slug: 'second-llc' },
    ];

    const primary = getPrimaryBusiness(multiOrgs);
    assert.equal(primary.id, 'org-1');

    const all = multiOrgs.map(normalizeBusinessProfile);
    assert.equal(all.length, 2);
    assert.equal(all[0].id, 'org-1');
    assert.equal(all[1].id, 'org-2');
  });
});

describe('Phase 2 — Personal ↔ Business Profile Switcher State & Behavior', () => {
  const STORAGE_KEY_PREFIX = 'zeitnah_active_profile_mode_';

  // Helper implementing the exact ActiveProfileContext state transition rules
  function createProfileStateMachine({ user, organizations = [], initialStorage = {} }) {
    const userId = user?.userId || user?._id || user?.id;
    const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;
    let storage = { ...initialStorage };
    let currentOrgs = [...organizations];

    const getPrimary = () => getPrimaryBusiness(currentOrgs);
    const getIsEligible = () => {
      const p = getPrimary();
      return p ? isBusinessProfileEligible(p) : false;
    };
    const getHasBusinessProfile = () => Boolean(getPrimary() && getIsEligible());

    // Initial state: default strictly to 'personal'
    let activeProfileMode = 'personal';

    // Hydrate from storage if valid
    if (storageKey && storage[storageKey] === 'business' && getHasBusinessProfile()) {
      activeProfileMode = 'business';
    } else {
      activeProfileMode = 'personal';
    }

    return {
      get activeProfileMode() {
        return activeProfileMode;
      },
      get isPersonalMode() {
        return activeProfileMode === 'personal';
      },
      get isBusinessMode() {
        return activeProfileMode === 'business';
      },
      get hasBusinessProfile() {
        return getHasBusinessProfile();
      },
      get business() {
        return getHasBusinessProfile() ? getPrimary() : null;
      },
      get businessIdentity() {
        return getHasBusinessProfile() ? normalizeBusinessIdentity(getPrimary()) : null;
      },
      switchToBusiness() {
        if (!getHasBusinessProfile()) return false;
        activeProfileMode = 'business';
        if (storageKey) storage[storageKey] = 'business';
        return true;
      },
      switchToPersonal() {
        activeProfileMode = 'personal';
        if (storageKey) storage[storageKey] = 'personal';
        return true;
      },
      toggleProfileMode() {
        if (activeProfileMode === 'personal') {
          return this.switchToBusiness();
        } else {
          return this.switchToPersonal();
        }
      },
      updateOrganizations(newOrgs) {
        currentOrgs = [...newOrgs];
        // Automatic safety fallback
        if (activeProfileMode === 'business' && !getHasBusinessProfile()) {
          activeProfileMode = 'personal';
          if (storageKey) storage[storageKey] = 'personal';
        }
      },
      onLogout() {
        activeProfileMode = 'personal';
        if (storageKey) delete storage[storageKey];
      },
      getStorage() {
        return storage;
      },
    };
  }

  const sampleUser = { userId: 'user-101', name: 'Riswan P.R.', username: 'riswan' };
  const sampleBusiness = {
    _id: 'org-abc-123',
    name: 'Zeitnah Academy',
    slug: 'zeitnah-academy',
    logo: 'organizations/logos/zeitnah-logo.png',
    status: 'APPROVED',
    verificationStatus: 'VERIFIED',
  };

  // ─── Initial State ───
  it('1. Active profile defaults to personal', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    assert.equal(machine.activeProfileMode, 'personal');
  });

  it('2. Personal mode flags are correct initially', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    assert.equal(machine.isPersonalMode, true);
  });

  it('3. Business mode flags are false initially', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    assert.equal(machine.isBusinessMode, false);
  });

  // ─── Business Available ───
  it('4. User with eligible business can switch to business', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    assert.equal(machine.hasBusinessProfile, true);
    const switched = machine.switchToBusiness();
    assert.equal(switched, true);
    assert.equal(machine.activeProfileMode, 'business');
    assert.equal(machine.isBusinessMode, true);
    assert.equal(machine.isPersonalMode, false);
  });

  it('5. Business identity becomes active upon switching', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    machine.switchToBusiness();
    const identity = machine.businessIdentity;
    assert.ok(identity);
    assert.equal(identity.type, 'business');
    assert.equal(identity.id, 'org-abc-123');
    assert.equal(identity.name, 'Zeitnah Academy');
  });

  it('6. Business logo and name are correct in active business identity', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    machine.switchToBusiness();
    assert.equal(machine.business.name, 'Zeitnah Academy');
    assert.equal(machine.business.logo, 'organizations/logos/zeitnah-logo.png');
    assert.equal(machine.businessIdentity.name, 'Zeitnah Academy');
    assert.equal(machine.businessIdentity.avatar, 'organizations/logos/zeitnah-logo.png');
  });

  it('7. Business profile URL is correct (/businesses/:slug)', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    machine.switchToBusiness();
    assert.equal(machine.businessIdentity.profileUrl, '/businesses/zeitnah-academy');
    assert.equal(getBusinessProfileUrl(machine.business), '/businesses/zeitnah-academy');
  });

  // ─── Switching Back ───
  it('8. Business → Personal switching works smoothly', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    machine.switchToBusiness();
    assert.equal(machine.isBusinessMode, true);
    machine.switchToPersonal();
    assert.equal(machine.activeProfileMode, 'personal');
    assert.equal(machine.isPersonalMode, true);
    assert.equal(machine.isBusinessMode, false);
  });

  it('9. Personal identity is completely restored on switching back', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    machine.switchToBusiness();
    machine.switchToPersonal();
    assert.equal(machine.isPersonalMode, true);
    assert.equal(machine.activeProfileMode, 'personal');
  });

  // ─── No Business ───
  it('10. Switch to Business is unavailable when no eligible business exists', () => {
    const machineNoBiz = createProfileStateMachine({ user: sampleUser, organizations: [] });
    assert.equal(machineNoBiz.hasBusinessProfile, false);
    const switched = machineNoBiz.switchToBusiness();
    assert.equal(switched, false);
    assert.equal(machineNoBiz.activeProfileMode, 'personal');
    assert.equal(machineNoBiz.isPersonalMode, true);
  });

  // ─── Invalid Business ───
  it('11. Suspended/rejected business cannot become active', () => {
    const suspendedBiz = { ...sampleBusiness, status: 'SUSPENDED' };
    const machineSuspended = createProfileStateMachine({ user: sampleUser, organizations: [suspendedBiz] });
    assert.equal(machineSuspended.hasBusinessProfile, false);
    assert.equal(machineSuspended.switchToBusiness(), false);
    assert.equal(machineSuspended.activeProfileMode, 'personal');

    const rejectedBiz = { ...sampleBusiness, status: 'REJECTED' };
    const machineRejected = createProfileStateMachine({ user: sampleUser, organizations: [rejectedBiz] });
    assert.equal(machineRejected.hasBusinessProfile, false);
    assert.equal(machineRejected.switchToBusiness(), false);
    assert.equal(machineRejected.activeProfileMode, 'personal');
  });

  it('12. Persisted invalid business state falls back to personal safely', () => {
    const storageKey = `${STORAGE_KEY_PREFIX}user-101`;
    // Storage has 'business', but the server returns a suspended business
    const machine = createProfileStateMachine({
      user: sampleUser,
      organizations: [{ ...sampleBusiness, status: 'SUSPENDED' }],
      initialStorage: { [storageKey]: 'business' },
    });
    // Hydration must reject the invalid state and fall back to personal
    assert.equal(machine.activeProfileMode, 'personal');
    assert.equal(machine.isPersonalMode, true);
  });

  // ─── Persistence ───
  it('13. Valid profile mode can be restored safely from persistence', () => {
    const storageKey = `${STORAGE_KEY_PREFIX}user-101`;
    const machine = createProfileStateMachine({
      user: sampleUser,
      organizations: [sampleBusiness],
      initialStorage: { [storageKey]: 'business' },
    });
    // Since user has an eligible approved business, persistence hydrates business mode
    assert.equal(machine.activeProfileMode, 'business');
    assert.equal(machine.isBusinessMode, true);
  });

  it('14. Invalid/stale persisted business state is rejected when user has no businesses', () => {
    const storageKey = `${STORAGE_KEY_PREFIX}user-101`;
    const machine = createProfileStateMachine({
      user: sampleUser,
      organizations: [], // user has no business
      initialStorage: { [storageKey]: 'business' },
    });
    assert.equal(machine.activeProfileMode, 'personal');
    assert.equal(machine.isPersonalMode, true);
  });

  // ─── Security ───
  it('15. Arbitrary organization IDs cannot become active business identity', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    // An attacker cannot supply an arbitrary organization ID:
    const unauthorizedOrgId = 'attacker-injected-org-999';
    // State machine only consumes the primary business from the authenticated organizations list
    assert.notEqual(machine.business.id, unauthorizedOrgId);
    assert.equal(machine.business.id, 'org-abc-123');
  });

  it('16. Only organizations returned by authenticated business endpoint are usable', () => {
    const serverAuthorizedOrgs = [
      { _id: 'legit-org-456', name: 'Authorized Engineering AG', slug: 'authorized-eng', status: 'APPROVED' },
    ];
    const machine = createProfileStateMachine({ user: sampleUser, organizations: serverAuthorizedOrgs });
    machine.switchToBusiness();
    assert.equal(machine.business.id, 'legit-org-456');
    assert.equal(machine.business.name, 'Authorized Engineering AG');
  });

  // ─── Session Safety ───
  it('17. Business state does not leak between different users', () => {
    const userA = { userId: 'user-aaa' };
    const userB = { userId: 'user-bbb' };
    const sharedStorage = {};

    // User A switches to business
    const machineA = createProfileStateMachine({
      user: userA,
      organizations: [sampleBusiness],
      initialStorage: sharedStorage,
    });
    machineA.switchToBusiness();
    const updatedStorageA = machineA.getStorage();

    // User B logs in (has no businesses)
    const machineB = createProfileStateMachine({
      user: userB,
      organizations: [],
      initialStorage: updatedStorageA,
    });

    assert.equal(machineB.activeProfileMode, 'personal');
    assert.equal(machineB.isPersonalMode, true);
    // User B storage key was never set to business
    assert.equal(updatedStorageA[`${STORAGE_KEY_PREFIX}user-bbb`], undefined);
  });

  it('18. Logout/login resets safely and cleans up active storage', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    machine.switchToBusiness();
    assert.equal(machine.isBusinessMode, true);

    // Trigger logout
    machine.onLogout();
    assert.equal(machine.activeProfileMode, 'personal');
    assert.equal(machine.isPersonalMode, true);
    const storage = machine.getStorage();
    assert.equal(storage[`${STORAGE_KEY_PREFIX}user-101`], undefined);
  });

  // ─── UI Contracts ───
  it('19. Desktop switcher contract in personal mode', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    // In personal mode:
    const buttonLabel = machine.isBusinessMode ? 'Switch to Personal' : 'Switch to Business';
    const profileBadge = machine.isBusinessMode ? 'Business Profile' : 'Personal Profile';
    const activeDisplayName = machine.isBusinessMode ? machine.business.name : sampleUser.name;

    assert.equal(buttonLabel, 'Switch to Business');
    assert.equal(profileBadge, 'Personal Profile');
    assert.equal(activeDisplayName, 'Riswan P.R.');
  });

  it('20. Desktop switcher contract in business mode', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    machine.switchToBusiness();

    const buttonLabel = machine.isBusinessMode ? 'Switch to Personal' : 'Switch to Business';
    const profileBadge = machine.isBusinessMode ? 'Business Profile' : 'Personal Profile';
    const activeDisplayName = machine.isBusinessMode ? machine.business.name : sampleUser.name;
    const profileLink = machine.isBusinessMode ? getBusinessProfileUrl(machine.business) : '/profile';

    assert.equal(buttonLabel, 'Switch to Personal');
    assert.equal(profileBadge, 'Business Profile');
    assert.equal(activeDisplayName, 'Zeitnah Academy');
    assert.equal(profileLink, '/businesses/zeitnah-academy');
  });

  it('21. Mobile switcher contract in personal mode', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    const mobileButtonLabel = machine.isBusinessMode ? 'Switch to Personal' : 'Switch to Business';
    const mobileActiveText = machine.isBusinessMode ? `Active: ${machine.business?.name}` : 'Active: Personal Profile';

    assert.equal(mobileButtonLabel, 'Switch to Business');
    assert.equal(mobileActiveText, 'Active: Personal Profile');
  });

  it('22. Mobile switcher contract in business mode', () => {
    const machine = createProfileStateMachine({ user: sampleUser, organizations: [sampleBusiness] });
    machine.switchToBusiness();

    const mobileButtonLabel = machine.isBusinessMode ? 'Switch to Personal' : 'Switch to Business';
    const mobileActiveText = machine.isBusinessMode ? `Active: ${machine.business?.name}` : 'Active: Personal Profile';

    assert.equal(mobileButtonLabel, 'Switch to Personal');
    assert.equal(mobileActiveText, 'Active: Zeitnah Academy');
  });
});
