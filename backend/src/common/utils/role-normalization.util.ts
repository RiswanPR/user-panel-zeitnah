/**
 * ZEITNAH CANONICAL ROLE TAXONOMY & NORMALIZATION ENGINE
 *
 * Authoritative Canonical Community Roles:
 * - STUDENT: Studying civil, structural, BIM, architecture, or infrastructure disciplines.
 * - PROFESSIONAL: Practicing infrastructure engineering or AEC professional.
 * - RECRUITER: Hiring talent for infrastructure, AEC, EPC, and engineering firms.
 * - EDUCATOR: Faculty, institutional trainer, or academic leader (Admin-assigned only).
 *
 * System Privilege Roles:
 * - ADMIN: System administration and platform governance (Separate system identity).
 *
 * Legacy Ingestion Mappings:
 * - FOUNDER / founder -> RECRUITER
 * - MENTOR / mentor -> PROFESSIONAL
 * - TEACHER / teacher -> EDUCATOR
 */

export const CANONICAL_COMMUNITY_ROLES = [
  'STUDENT',
  'PROFESSIONAL',
  'RECRUITER',
  'EDUCATOR',
] as const;

export type CanonicalCommunityRole =
  (typeof CANONICAL_COMMUNITY_ROLES)[number];

export const SYSTEM_ADMIN_ROLE = 'ADMIN' as const;

export type PlatformRole = CanonicalCommunityRole | typeof SYSTEM_ADMIN_ROLE;

/**
 * Normalizes any role input (including case variations, whitespace, and legacy aliases)
 * to its authoritative canonical community identity role or system admin identity.
 *
 * @param raw - The incoming role string or value.
 * @returns CanonicalCommunityRole | 'ADMIN' | undefined
 */
export function normalizeCanonicalPrimaryRole(
  raw?: unknown,
): PlatformRole | undefined {
  if (typeof raw !== 'string') return undefined;
  const clean = raw.trim().toUpperCase();
  if (!clean) return undefined;

  switch (clean) {
    case 'STUDENT':
      return 'STUDENT';

    case 'PROFESSIONAL':
    case 'MENTOR':
      return 'PROFESSIONAL';

    case 'RECRUITER':
    case 'FOUNDER':
      return 'RECRUITER';

    case 'EDUCATOR':
    case 'TEACHER':
      return 'EDUCATOR';

    case 'ADMIN':
    case 'SUPERUSER':
      return 'ADMIN';

    default:
      return undefined;
  }
}

/**
 * Normalizes input role with a safe fallback (defaults to 'STUDENT').
 * The fallback itself is normalized so legacy LMS role strings (e.g. 'teacher', 'recruiter')
 * are safely converted.
 */
export function normalizeCanonicalPrimaryRoleWithFallback(
  raw?: unknown,
  fallback: string = 'STUDENT',
): PlatformRole {
  const normalized = normalizeCanonicalPrimaryRole(raw);
  if (normalized) return normalized;
  const normalizedFallback = normalizeCanonicalPrimaryRole(fallback);
  return (normalizedFallback as PlatformRole) || 'STUDENT';
}

/**
 * Returns true if the given role is one of the four authoritative community roles.
 */
export function isCanonicalCommunityRole(
  role: unknown,
): role is CanonicalCommunityRole {
  return (
    typeof role === 'string' &&
    CANONICAL_COMMUNITY_ROLES.includes(role as CanonicalCommunityRole)
  );
}
