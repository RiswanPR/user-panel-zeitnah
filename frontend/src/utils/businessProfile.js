/**
 * businessProfile.js — Business Profile Foundation & Normalization
 *
 * ZEITNAH USER PANEL — PHASE 1
 *
 * Rules:
 * 1. Reuses existing Organization fields without inventing new data schemas.
 * 2. Normalizes backend Organization entities for frontend consumption and future Community integration.
 * 3. Gracefully handles zero businesses, single business, and multiple businesses.
 * 4. Strictly isolates Personal Profile identity from Business Profile identity.
 */

/**
 * Validates and normalizes an Organization entity into a standardized Business Profile object.
 *
 * @param {object|null|undefined} organization - Raw organization document from /api/organizations/my
 * @returns {object|null} Normalized business profile or null if invalid
 */
export function normalizeBusinessProfile(organization) {
  if (!organization || typeof organization !== 'object') {
    return null;
  }

  const rawId = organization._id || organization.id;
  if (!rawId) {
    return null;
  }

  const id = String(rawId);
  const name = typeof organization.name === 'string' ? organization.name.trim() : 'Organization';
  const slug = typeof organization.slug === 'string' ? organization.slug.trim().toLowerCase() : '';
  const logo = typeof organization.logo === 'string' ? organization.logo.trim() : '';
  const description = typeof organization.description === 'string' ? organization.description.trim() : '';
  const type = typeof organization.type === 'string' ? organization.type.toUpperCase() : 'COMPANY';
  const industry = typeof organization.industry === 'string' ? organization.industry.trim() : '';
  const website = typeof organization.website === 'string' ? organization.website.trim() : '';
  const location = typeof organization.location === 'string' ? organization.location.trim() : '';
  const status = typeof organization.status === 'string' ? organization.status.toUpperCase() : 'PENDING';
  const verificationStatus =
    typeof organization.verificationStatus === 'string'
      ? organization.verificationStatus.toUpperCase()
      : 'PENDING';

  const isVerified = Boolean(
    organization.isVerified ||
      status === 'APPROVED' ||
      verificationStatus === 'VERIFIED'
  );

  return {
    id,
    name,
    slug,
    logo,
    description,
    type,
    industry,
    website,
    location,
    status,
    verificationStatus,
    isVerified,
    userRole: organization.userRole || 'MEMBER',
    createdAt: organization.createdAt || null,
  };
}

/**
 * Normalizes an Organization into an authoritative Business Identity object
 * prepared for future Community, Composer, and Feed phases.
 *
 * @param {object|null|undefined} organization
 * @returns {object|null}
 */
export function normalizeBusinessIdentity(organization) {
  const profile = normalizeBusinessProfile(organization);
  if (!profile) {
    return null;
  }

  return {
    type: 'business',
    id: profile.id,
    name: profile.name,
    username: profile.slug,
    avatar: profile.logo,
    profileUrl: profile.slug ? `/businesses/${encodeURIComponent(profile.slug)}` : '/businesses',
    isVerified: profile.isVerified,
    industry: profile.industry,
    status: profile.status,
  };
}

/**
 * Determines whether the given Organization entity is eligible for Business Profile representation.
 * Respects existing Organization status values (DRAFT, PENDING, APPROVED, REJECTED, SUSPENDED).
 *
 * @param {object|null|undefined} organization
 * @returns {boolean}
 */
export function isBusinessProfileEligible(organization) {
  const profile = normalizeBusinessProfile(organization);
  if (!profile) return false;

  // Suspended or rejected businesses cannot act as active business profiles
  if (profile.status === 'SUSPENDED' || profile.status === 'REJECTED') {
    return false;
  }

  return true;
}

/**
 * Constructs the canonical public profile route URL for a business slug or business object.
 *
 * @param {string|object|null|undefined} target - Slug string or business profile object
 * @returns {string}
 */
export function getBusinessProfileUrl(target) {
  if (!target) {
    return '/businesses';
  }
  const rawSlug = typeof target === 'string' ? target : target?.slug;
  if (!rawSlug || typeof rawSlug !== 'string') {
    return '/businesses';
  }
  const clean = rawSlug.trim().toLowerCase();
  return clean ? `/businesses/${encodeURIComponent(clean)}` : '/businesses';
}

/**
 * Safely resolves the primary business profile from a list of user organizations.
 *
 * @param {Array<object>|null|undefined} organizations
 * @returns {object|null}
 */
export function getPrimaryBusiness(organizations) {
  if (!Array.isArray(organizations) || organizations.length === 0) {
    return null;
  }

  // Find the first valid organization
  for (const org of organizations) {
    const normalized = normalizeBusinessProfile(org);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}
