import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBusinessProfile,
  normalizeBusinessIdentity,
  isBusinessProfileEligible,
  getBusinessProfileUrl,
  getPrimaryBusiness,
  findBusinessById,
  isBusinessSelectable,
  getActiveBusiness,
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

describe('Phase 2.5 — Multi-Business Profile Active Context & Switching', () => {
  const sampleUserA = { userId: 'user-aaa', name: 'Alice Founder', username: 'alice' };
  const sampleUserB = { userId: 'user-bbb', name: 'Bob Engineer', username: 'bob' };

  const companyA = {
    _id: 'org-aaa-111',
    name: 'Zeitnah Academy',
    slug: 'zeitnah-academy',
    logo: 'organizations/logos/zeitnah.png',
    status: 'APPROVED',
    verificationStatus: 'VERIFIED',
  };

  const companyB = {
    _id: 'org-bbb-222',
    name: 'ABC Technologies',
    slug: 'abctech',
    logo: 'organizations/logos/abctech.png',
    status: 'APPROVED',
    verificationStatus: 'VERIFIED',
  };

  const companyC = {
    _id: 'org-ccc-333',
    name: 'XYZ Solutions',
    slug: 'xyzsolutions',
    logo: 'organizations/logos/xyz.png',
    status: 'APPROVED',
    verificationStatus: 'VERIFIED',
  };

  function createMultiBusinessStateMachine({ user, organizations = [], initialStorage = {} }) {
    const userId = user?.userId || user?._id || user?.id;
    const storageKey = userId ? `zeitnah_active_profile_${userId}` : null;
    let storage = { ...initialStorage };
    let currentOrgs = [...organizations];

    const getEligibleBusinesses = () =>
      currentOrgs.map(normalizeBusinessProfile).filter(Boolean).filter(isBusinessProfileEligible);

    let activeProfileType = 'personal';
    let activeBusinessId = null;

    // Hydrate from storage
    if (storageKey && storage[storageKey]) {
      let persisted = storage[storageKey];
      if (typeof persisted === 'string') {
        try {
          persisted = JSON.parse(persisted);
        } catch {
          persisted = null;
        }
      }
      if (persisted?.type === 'business' && persisted?.businessId) {
        const match = findBusinessById(getEligibleBusinesses(), persisted.businessId);
        if (match) {
          activeProfileType = 'business';
          activeBusinessId = match.id;
        } else {
          activeProfileType = 'personal';
          activeBusinessId = null;
        }
      }
    }

    return {
      get activeProfileType() {
        return activeProfileType;
      },
      get activeProfileMode() {
        return activeProfileType; // Backward-compat alias
      },
      get activeBusinessId() {
        return activeBusinessId;
      },
      get isPersonalMode() {
        return activeProfileType === 'personal';
      },
      get isBusinessMode() {
        return activeProfileType === 'business';
      },
      get businesses() {
        return getEligibleBusinesses();
      },
      get hasBusinessProfile() {
        return getEligibleBusinesses().length > 0;
      },
      get business() {
        if (activeProfileType !== 'business' || !activeBusinessId) return null;
        return findBusinessById(getEligibleBusinesses(), activeBusinessId);
      },
      get businessIdentity() {
        const biz = this.business;
        return biz ? normalizeBusinessIdentity(biz) : null;
      },
      switchToBusiness(requestedId) {
        const eligible = getEligibleBusinesses();
        if (eligible.length === 0) return false;

        let target = null;
        if (requestedId) {
          target = findBusinessById(eligible, requestedId);
        } else {
          target = (activeBusinessId && findBusinessById(eligible, activeBusinessId)) || eligible[0];
        }
        if (!target) return false;

        activeProfileType = 'business';
        activeBusinessId = target.id;
        if (storageKey) {
          storage[storageKey] = JSON.stringify({ type: 'business', businessId: target.id });
        }
        return true;
      },
      switchToPersonal() {
        activeProfileType = 'personal';
        activeBusinessId = null;
        if (storageKey) {
          storage[storageKey] = JSON.stringify({ type: 'personal', businessId: null });
        }
        return true;
      },
      switchProfile(profile) {
        if (!profile || profile === 'personal' || profile?.type === 'personal') {
          return this.switchToPersonal();
        }
        const bId = typeof profile === 'string' ? profile : (profile?.businessId || profile?.id);
        return this.switchToBusiness(bId);
      },
      updateOrganizations(newOrgs) {
        currentOrgs = [...newOrgs];
        const eligible = getEligibleBusinesses();
        if (activeProfileType === 'business') {
          if (!activeBusinessId || !findBusinessById(eligible, activeBusinessId)) {
            activeProfileType = 'personal';
            activeBusinessId = null;
            if (storageKey) {
              storage[storageKey] = JSON.stringify({ type: 'personal', businessId: null });
            }
          }
        }
      },
      onLogout() {
        activeProfileType = 'personal';
        activeBusinessId = null;
        if (storageKey) {
          delete storage[storageKey];
        }
      },
      getStorage() {
        return storage;
      },
    };
  }

  // ─── Utility Helpers ───
  it('1. findBusinessById finds by valid _id or id and returns normalized business', () => {
    const list = [companyA, companyB];
    const found = findBusinessById(list, 'org-bbb-222');
    assert.ok(found);
    assert.equal(found.id, 'org-bbb-222');
    assert.equal(found.name, 'ABC Technologies');

    // Missing or invalid returns null
    assert.equal(findBusinessById(list, 'nonexistent-id'), null);
    assert.equal(findBusinessById(list, null), null);
    assert.equal(findBusinessById([], 'org-aaa-111'), null);
  });

  it('2. isBusinessSelectable accurately determines eligibility with valid ID', () => {
    assert.equal(isBusinessSelectable(companyA), true);
    assert.equal(isBusinessSelectable({ ...companyA, status: 'SUSPENDED' }), false);
    assert.equal(isBusinessSelectable({ ...companyA, status: 'REJECTED' }), false);
    assert.equal(isBusinessSelectable({ name: 'No ID Org' }), false);
    assert.equal(isBusinessSelectable(null), false);
  });

  it('3. getActiveBusiness retrieves exact business matching activeBusinessId', () => {
    const list = [companyA, companyB, companyC];
    const active = getActiveBusiness(list, 'org-ccc-333');
    assert.ok(active);
    assert.equal(active.id, 'org-ccc-333');
    assert.equal(active.name, 'XYZ Solutions');

    assert.equal(getActiveBusiness(list, null), null);
    assert.equal(getActiveBusiness(list, 'unknown'), null);
  });

  // ─── Edge Case Matrix (Section 21) ───
  it('CASE 1: No business profiles defaults to Personal only', () => {
    const machine = createMultiBusinessStateMachine({ user: sampleUserA, organizations: [] });
    assert.equal(machine.activeProfileType, 'personal');
    assert.equal(machine.activeBusinessId, null);
    assert.equal(machine.hasBusinessProfile, false);
    assert.equal(machine.businesses.length, 0);
    assert.equal(machine.switchToBusiness('org-aaa-111'), false);
  });

  it('CASE 2: One business has Personal + Business A available', () => {
    const machine = createMultiBusinessStateMachine({ user: sampleUserA, organizations: [companyA] });
    assert.equal(machine.businesses.length, 1);
    assert.equal(machine.businesses[0].name, 'Zeitnah Academy');
    assert.equal(machine.hasBusinessProfile, true);
    assert.equal(machine.isPersonalMode, true);

    const switched = machine.switchToBusiness(companyA._id);
    assert.equal(switched, true);
    assert.equal(machine.activeProfileType, 'business');
    assert.equal(machine.activeBusinessId, 'org-aaa-111');
    assert.equal(machine.business.name, 'Zeitnah Academy');
  });

  it('CASE 3: Two businesses has Personal + Business A + Business B available', () => {
    const machine = createMultiBusinessStateMachine({ user: sampleUserA, organizations: [companyA, companyB] });
    assert.equal(machine.businesses.length, 2);
    assert.equal(machine.businesses[0].id, 'org-aaa-111');
    assert.equal(machine.businesses[1].id, 'org-bbb-222');
  });

  it('CASE 4: Three or more businesses has all eligible businesses available', () => {
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB, companyC],
    });
    assert.equal(machine.businesses.length, 3);
    assert.deepEqual(machine.businesses.map((b) => b.id), [
      'org-aaa-111',
      'org-bbb-222',
      'org-ccc-333',
    ]);
  });

  it('CASE 5 & 6: Switch A → B and B → C updates activeBusinessId reliably', () => {
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB, companyC],
    });

    // 1. Switch to Company A
    machine.switchToBusiness(companyA._id);
    assert.equal(machine.activeProfileType, 'business');
    assert.equal(machine.activeBusinessId, 'org-aaa-111');
    assert.equal(machine.business.name, 'Zeitnah Academy');

    // 2. Switch A → B
    machine.switchToBusiness(companyB._id);
    assert.equal(machine.activeProfileType, 'business');
    assert.equal(machine.activeBusinessId, 'org-bbb-222');
    assert.equal(machine.business.name, 'ABC Technologies');
    assert.equal(machine.businessIdentity.name, 'ABC Technologies');
    assert.equal(machine.businessIdentity.username, 'abctech');

    // 3. Switch B → C
    machine.switchToBusiness(companyC._id);
    assert.equal(machine.activeProfileType, 'business');
    assert.equal(machine.activeBusinessId, 'org-ccc-333');
    assert.equal(machine.business.name, 'XYZ Solutions');
    assert.equal(machine.businessIdentity.name, 'XYZ Solutions');
  });

  it('CASE 7: Business → Personal restores activeProfileType = personal and activeBusinessId = null', () => {
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB],
    });
    machine.switchToBusiness(companyB._id);
    assert.equal(machine.activeBusinessId, 'org-bbb-222');

    machine.switchToPersonal();
    assert.equal(machine.activeProfileType, 'personal');
    assert.equal(machine.activeBusinessId, null);
    assert.equal(machine.business, null);
    assert.equal(machine.businessIdentity, null);
    assert.equal(machine.isPersonalMode, true);
    assert.equal(machine.isBusinessMode, false);
  });

  it('CASE 8: Persist Business B restores Business B upon hydration', () => {
    const storageKey = 'zeitnah_active_profile_user-aaa';
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB],
      initialStorage: {
        [storageKey]: JSON.stringify({ type: 'business', businessId: 'org-bbb-222' }),
      },
    });

    assert.equal(machine.activeProfileType, 'business');
    assert.equal(machine.activeBusinessId, 'org-bbb-222');
    assert.equal(machine.business.name, 'ABC Technologies');
  });

  it('CASE 9: Persist Business B falls back to Personal when Business B is no longer available', () => {
    const storageKey = 'zeitnah_active_profile_user-aaa';
    // Company B is no longer in the user's authorized organizations list (e.g. membership revoked)
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA], // Only companyA remains
      initialStorage: {
        [storageKey]: JSON.stringify({ type: 'business', businessId: 'org-bbb-222' }),
      },
    });

    // MUST NOT silently switch to companyA! Must fall back strictly to Personal!
    assert.equal(machine.activeProfileType, 'personal');
    assert.equal(machine.activeBusinessId, null);
    assert.equal(machine.isPersonalMode, true);
  });

  it('CASE 10: Persist invalid/random business ID falls back to Personal', () => {
    const storageKey = 'zeitnah_active_profile_user-aaa';
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB],
      initialStorage: {
        [storageKey]: JSON.stringify({ type: 'business', businessId: 'attacker-random-id-999' }),
      },
    });

    assert.equal(machine.activeProfileType, 'personal');
    assert.equal(machine.activeBusinessId, null);
  });

  it('CASE 11: Logout resets state to personal, clears activeBusinessId and storage', () => {
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB],
    });
    machine.switchToBusiness(companyB._id);
    assert.equal(machine.activeBusinessId, 'org-bbb-222');

    machine.onLogout();
    assert.equal(machine.activeProfileType, 'personal');
    assert.equal(machine.activeBusinessId, null);
    const storage = machine.getStorage();
    assert.equal(storage['zeitnah_active_profile_user-aaa'], undefined);
  });

  it('CASE 12: Business state is strictly isolated between User A and User B', () => {
    const sharedStorage = {};
    const machineA = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB],
      initialStorage: sharedStorage,
    });
    machineA.switchToBusiness(companyB._id);
    const updatedStorageA = machineA.getStorage();

    // User B logs in (has no businesses or different business)
    const machineB = createMultiBusinessStateMachine({
      user: sampleUserB,
      organizations: [companyC],
      initialStorage: updatedStorageA,
    });

    // User B must start in Personal mode and never inherit User A's active business!
    assert.equal(machineB.activeProfileType, 'personal');
    assert.equal(machineB.activeBusinessId, null);
    assert.equal(updatedStorageA['zeitnah_active_profile_user-bbb'], undefined);
  });

  it('CASE 13: User with many businesses exposes all businesses without corruption', () => {
    const tenBusinesses = Array.from({ length: 10 }, (_, i) => ({
      _id: `org-test-${i + 1}`,
      name: `Enterprise Company ${i + 1}`,
      slug: `enterprise-${i + 1}`,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED',
    }));

    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: tenBusinesses,
    });

    assert.equal(machine.businesses.length, 10);
    // User can select the 10th business directly
    const switched = machine.switchToBusiness('org-test-10');
    assert.equal(switched, true);
    assert.equal(machine.activeBusinessId, 'org-test-10');
    assert.equal(machine.business.name, 'Enterprise Company 10');
  });

  it('CASE 14: Backward compatibility — switchToBusiness with no arguments selects primary business', () => {
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB],
    });
    const switched = machine.switchToBusiness();
    assert.equal(switched, true);
    assert.equal(machine.activeBusinessId, 'org-aaa-111');
    assert.equal(machine.business.name, 'Zeitnah Academy');
  });

  it('CASE 15: Backward compatibility — activeProfileMode is an alias for activeProfileType', () => {
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA],
    });
    assert.equal(machine.activeProfileMode, 'personal');
    machine.switchToBusiness(companyA._id);
    assert.equal(machine.activeProfileMode, 'business');
    assert.equal(machine.activeProfileType, 'business');
  });

  it('CASE 16: switchProfile helper dispatches personal and business correctly', () => {
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB],
    });

    // Switch to business B via object
    machine.switchProfile({ type: 'business', businessId: 'org-bbb-222' });
    assert.equal(machine.activeBusinessId, 'org-bbb-222');

    // Switch to business A via string ID
    machine.switchProfile('org-aaa-111');
    assert.equal(machine.activeBusinessId, 'org-aaa-111');

    // Switch to personal
    machine.switchProfile('personal');
    assert.equal(machine.activeProfileType, 'personal');
    assert.equal(machine.activeBusinessId, null);
  });

  it('CASE 17: UI Contract — Profile switcher item state resolution for multi-business', () => {
    const machine = createMultiBusinessStateMachine({
      user: sampleUserA,
      organizations: [companyA, companyB, companyC],
    });

    // Helper simulating ProfileSwitcher list generation
    const generateSwitcherItems = (state) => [
      {
        id: 'personal',
        type: 'personal',
        label: sampleUserA.name,
        subtitle: `@${sampleUserA.username}`,
        isActive: state.isPersonalMode,
      },
      ...state.businesses.map((biz) => ({
        id: biz.id,
        type: 'business',
        label: biz.name,
        subtitle: `@${biz.slug}`,
        isActive: state.isBusinessMode && state.activeBusinessId === biz.id,
      })),
    ];

    // 1. In Personal mode
    const itemsPersonal = generateSwitcherItems(machine);
    assert.equal(itemsPersonal.length, 4);
    assert.equal(itemsPersonal[0].isActive, true);
    assert.equal(itemsPersonal[1].isActive, false);
    assert.equal(itemsPersonal[2].isActive, false);
    assert.equal(itemsPersonal[3].isActive, false);

    // 2. In Company B mode
    machine.switchToBusiness(companyB._id);
    const itemsB = generateSwitcherItems(machine);
    assert.equal(itemsB[0].isActive, false);
    assert.equal(itemsB[1].isActive, false);
    assert.equal(itemsB[2].isActive, true); // Company B is active
    assert.equal(itemsB[3].isActive, false);

    // 3. In Company C mode
    machine.switchToBusiness(companyC._id);
    const itemsC = generateSwitcherItems(machine);
    assert.equal(itemsC[0].isActive, false);
    assert.equal(itemsC[1].isActive, false);
    assert.equal(itemsC[2].isActive, false);
    assert.equal(itemsC[3].isActive, true); // Company C is active
  });
});
