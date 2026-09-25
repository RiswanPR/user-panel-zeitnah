import {
  BookOpen,
  User,
  Compass,
  Briefcase,
  Building2,
  TrendingUp,
} from "lucide-react";

/**
 * Role-aware navigation builder.
 * Phase 5 active navigation:
 * - Student / Educator / Professional / Mentor: Profile, Jobs, Career Intelligence
 * - Recruiter / Founder: Profile, Jobs, Manage Business
 */
export const getNavItems = (userRole) => {
  const normalized = (userRole || "STUDENT").toUpperCase();
  const isBusinessRole =
    normalized === "RECRUITER" || normalized === "FOUNDER" || normalized === "ADMIN";

  const items = [
    {
      name: "Courses",
      path: "/courses",
      icon: BookOpen,
    },
    {
      name: "Network & Spaces",
      path: "/network",
      icon: Compass,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: User,
    },
    {
      name: "Jobs",
      path: "/jobs",
      icon: Briefcase,
    },
    {
      name: "Career Intelligence",
      path: "/career-intelligence",
      icon: TrendingUp,
    },
  ];

  if (isBusinessRole) {
    items.push({
      name: "Manage Business",
      path: "/manage-business",
      icon: Building2,
      roles: ["RECRUITER", "FOUNDER", "ADMIN"],
    });
  }

  return items;
};

export const navItems = getNavItems("STUDENT");
