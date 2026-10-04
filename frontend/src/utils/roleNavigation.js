import {
  BookOpen,
  Compass,
  Briefcase,
  Building2,
  TrendingUp,
  Layers,
  ShieldCheck,
  Trophy,
  Shield,
  Globe,
} from "lucide-react";

/**
 * CANONICAL ROLE ENGINE — ZEITNAH USER PANEL
 *
 * Rules:
 * 1. Exactly ONE canonical platform identity role: primaryRole.
 * 2. Allowed platform roles:
 *    - STUDENT
 *    - PROFESSIONAL
 *    - MENTOR
 *    - RECRUITER
 *    - FOUNDER
 *    - EDUCATOR
 *    (ADMIN is a separate system identity)
 * 3. COURSE ENROLLMENT IS NOT A ROLE.
 *    Course enrollment must NEVER influence role normalization or career navigation.
 * 4. primaryRole is always checked first and has absolute priority over legacy role.
 * 5. Safely handles strings, objects, null, undefined, and case variations.
 *
 * @param {object|string|null|undefined} user
 * @returns {string} Normalized canonical role in UPPERCASE
 */
export function normalizeUserRole(user) {
  if (!user) {
    return "STUDENT";
  }

  // Handle direct string input
  if (typeof user === "string") {
    const trimmed = user.trim().toUpperCase();
    if (trimmed === "TEACHER") return "EDUCATOR";
    return trimmed || "STUDENT";
  }

  // primaryRole is ALWAYS checked first and takes priority
  const rawRole = user.primaryRole || user.role;
  if (!rawRole || typeof rawRole !== "string") {
    return "STUDENT";
  }

  const trimmed = rawRole.trim().toUpperCase();
  // Safe backward compatibility: legacy 'teacher' maps to canonical 'EDUCATOR'
  if (trimmed === "TEACHER") {
    return "EDUCATOR";
  }

  return trimmed || "STUDENT";
}

/**
 * Checks whether the given user has a Recruiter or Founder business role.
 *
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function isRecruiterOrFounder(user) {
  const role = normalizeUserRole(user);
  return role === "RECRUITER" || role === "FOUNDER";
}

/**
 * Checks whether the given user is an Administrator.
 *
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function isAdmin(user) {
  return normalizeUserRole(user) === "ADMIN";
}

/**
 * Authoritative selector for primary career navigation item.
 *
 * Requirements:
 * - RECRUITER / FOUNDER -> "MANAGE BUSINESS" (/manage-business)
 * - STUDENT / EDUCATOR / PROFESSIONAL / MENTOR / ADMIN -> "JOBS" (/jobs)
 *
 * @param {object|null|undefined} user
 * @returns {object} Career navigation descriptor
 */
export function getPrimaryCareerNavigation(user) {
  if (isRecruiterOrFounder(user)) {
    return {
      key: "manage-business",
      path: "/manage-business",
      label: "Manage Business",
      mobileLabel: "Business",
      icon: Building2,
      isBusiness: true,
      desc: "Enterprise workspace & recruitment",
    };
  }

  return {
    key: "jobs",
    path: "/jobs",
    label: "Jobs",
    mobileLabel: "Jobs",
    icon: Briefcase,
    isBusiness: false,
    desc: "Infrastructure engineering jobs",
  };
}

/**
 * Generates the authoritative primary navigation links for top desktop and mobile navigation.
 * Note: Courses is unconditionally first.
 *
 * Normal user: [Courses, Network, Messages, Jobs]
 * Recruiter/Founder: [Courses, Network, Messages, Manage Business]
 *
 * @param {object|null|undefined} user
 * @param {object} [options]
 * @param {number} [options.unreadMessagesCount]
 * @returns {Array<object>}
 */
export function getPrimaryNavLinks(user, { unreadMessagesCount: _unreadMessagesCount = 0 } = {}) {
  const careerItem = getPrimaryCareerNavigation(user);

  return [
    {
      key: "courses",
      path: "/courses",
      label: "Courses",
      mobileLabel: "Courses",
      icon: BookOpen,
      badge: 0,
    },
    {
      key: "community",
      path: "/community",
      label: "Community",
      mobileLabel: "Community",
      icon: Globe,
      badge: 0,
      isCommunity: true,
    },
    {
      key: "network",
      path: "/network",
      label: "Network",
      mobileLabel: "Network",
      icon: Compass,
      badge: 0,
    },
    {
      ...careerItem,
      badge: 0,
    },
  ];
}

/**
 * Generates authoritative "More" command menu sections.
 *
 * Strict Duplication Rules:
 * 1. Do NOT duplicate primary links (no Jobs, no Courses, no Network, no Messages).
 * 2. Do NOT duplicate Manage Business if the user is Recruiter or Founder (already primary).
 * 3. Never show Manage Business to normal users.
 * 4. Only show Admin Governance to verified Admin users.
 *
 * @param {object|null|undefined} user
 * @returns {Array<{id: string, title: string, items: Array<object>}>}
 */
export function getMoreNavSections(user) {
  const adminUser = isAdmin(user);

  const sections = [
    {
      id: "career",
      title: "CAREER",
      items: [
        {
          key: "career-intelligence",
          path: "/career-intelligence",
          label: "Career Intelligence",
          icon: TrendingUp,
          desc: "Role roadmaps & skill pathway mapping",
        },
      ],
    },
    {
      id: "identity",
      title: "PROFESSIONAL IDENTITY",
      items: [
        {
          key: "portfolio",
          path: "/profile/portfolio",
          label: "Engineering Portfolio",
          icon: Layers,
          desc: "BIM models, verified project showcases",
        },
        {
          key: "verification",
          path: "/profile/verification",
          label: "Verification Center",
          icon: ShieldCheck,
          desc: "Degrees, credentials & trust badges",
        },
      ],
    },
    {
      id: "standing",
      title: "STANDING",
      items: [
        {
          key: "leaderboard",
          path: "/leaderboard",
          label: "Global Leaderboard",
          icon: Trophy,
          desc: "Platform rank & competitive standings",
        },
      ],
    },
  ];

  if (adminUser) {
    sections.push({
      id: "governance",
      title: "ADMINISTRATION",
      items: [
        {
          key: "admin-businesses",
          path: "/admin/businesses",
          label: "Admin Governance",
          icon: Shield,
          desc: "Organization review & compliance audits",
        },
      ],
    });
  }

  return sections;
}

/**
 * CANONICAL PROFILE ROUTING HELPER
 * Resolves the authoritative public profile URL identifier for any user, student,
 * connection, or request item across the platform.
 *
 * Rules:
 * 1. Prefer username if non-empty string (stripped of leading '@').
 * 2. Unpack nested identity wrappers (peer, requester, recipient, user).
 * 3. Never confuse internal relationship/connection IDs with user identity IDs.
 * 4. Fall back to user document ID (_id or id) only when genuine user ID.
 *
 * @param {object|string|null|undefined} userOrItem
 * @returns {string} Clean profile identifier
 */
export function getProfileIdentifier(userOrItem) {
  if (!userOrItem) return "";

  if (typeof userOrItem === "string") {
    return userOrItem.trim().replace(/^@/, "");
  }

  // Unpack nested wrappers if present
  const target =
    userOrItem.peer ||
    userOrItem.requester ||
    userOrItem.recipient ||
    userOrItem.user ||
    userOrItem.student ||
    userOrItem.candidate ||
    userOrItem.person ||
    userOrItem.requesterId ||
    userOrItem.recipientId ||
    userOrItem;

  if (typeof target === "string") {
    return target.trim().replace(/^@/, "");
  }

  // 1. Prefer clean username
  const rawUsername = target.username || userOrItem.username;
  if (typeof rawUsername === "string" && rawUsername.trim().length > 0) {
    return rawUsername.trim().replace(/^@/, "");
  }

  // 2. Direct user ID from nested object
  if (userOrItem.peer) {
    const peerId = userOrItem.peer.id || userOrItem.peer._id || userOrItem.peer.userId;
    if (peerId) return String(peerId);
  }
  if (userOrItem.requester) {
    const reqId = userOrItem.requester.id || userOrItem.requester._id || userOrItem.requester.userId;
    if (reqId) return String(reqId);
  }
  if (userOrItem.recipient) {
    const recId = userOrItem.recipient.id || userOrItem.recipient._id || userOrItem.recipient.userId;
    if (recId) return String(recId);
  }

  // 3. User ID field on target
  if (target.userId) {
    return String(target.userId);
  }

  // 4. Avoid connectionId confusion:
  // If target has connectionId matching target.id or target._id, this is a relationship document
  const connId = target.connectionId || userOrItem.connectionId;
  const rawTargetId = target._id || target.id;
  if (connId && rawTargetId && String(connId) === String(rawTargetId)) {
    // Relationship doc ID detected. Check for secondary peer/target user ID
    if (target.targetUserId) return String(target.targetUserId);
    if (target.peerId) return String(target.peerId);
    if (userOrItem.targetUserId) return String(userOrItem.targetUserId);
    return "";
  }

  return rawTargetId ? String(rawTargetId) : "";
}

/**
 * Generates the authoritative canonical public profile route URL.
 * Canonical path: /u/:username (with /u/:userId fallback)
 *
 * @param {object|string|null|undefined} userOrItem
 * @returns {string} Canonical URL (e.g. "/u/johndoe")
 */
export function getCanonicalProfileUrl(userOrItem) {
  const identifier = getProfileIdentifier(userOrItem);
  if (!identifier) return "/network";
  return `/u/${encodeURIComponent(identifier)}`;
}
