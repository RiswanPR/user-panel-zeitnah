import {
  BookOpen,
  User,
  Compass,
  Briefcase,
  Building2,
  TrendingUp,
  MessageSquare,
  Layers,
  Inbox,
} from "lucide-react";

/**
 * Role-aware navigation builder.
 * Phase 8 active navigation:
 * - Student / Educator / Professional / Mentor: Courses, Network & Spaces, Messages, Profile, Portfolio, Jobs, Opportunities, Career Intelligence
 * - Recruiter / Founder: Courses, Network & Spaces, Messages, Profile, Portfolio, Jobs, Opportunities, Manage Business
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
      name: "Messages",
      path: "/messages",
      icon: MessageSquare,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: User,
    },
    {
      name: "Portfolio",
      path: "/profile/portfolio",
      icon: Layers,
    },
    {
      name: "Jobs",
      path: "/jobs",
      icon: Briefcase,
    },
    {
      name: "Opportunities",
      path: "/opportunities/inbox",
      icon: Inbox,
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
