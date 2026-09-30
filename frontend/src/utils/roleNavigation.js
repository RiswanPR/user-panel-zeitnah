import {
  BookOpen,
  Compass,
  MessageSquare,
  Briefcase,
  Building2,
  TrendingUp,
  Layers,
  ShieldCheck,
  Trophy,
  Shield,
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
 * @param {object} options
 * @param {number} options.unreadMessagesCount
 * @returns {Array<object>}
 */
export function getPrimaryNavLinks(user, { unreadMessagesCount = 0 } = {}) {
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
      key: "network",
      path: "/network",
      label: "Network",
      mobileLabel: "Network",
      icon: Compass,
      badge: 0,
    },
    {
      key: "messages",
      path: "/messages",
      label: "Messages",
      mobileLabel: "Messages",
      icon: MessageSquare,
      badge: Number.isFinite(unreadMessagesCount) ? Math.max(0, unreadMessagesCount) : 0,
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
      id: "community",
      title: "COMMUNITY & STANDING",
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
