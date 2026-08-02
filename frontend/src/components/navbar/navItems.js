import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  MessageSquare,
  Award,
  User,
} from "lucide-react";

export const navItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Courses",
    path: "/courses",
    icon: BookOpen,
  },
  {
    name: "My Learning",
    path: "/my-learning",
    icon: GraduationCap,
  },
  {
    name: "Community",
    path: "/community",
    icon: Users,
  },
  {
    name: "Messages",
    path: "/community/messages",
    icon: MessageSquare,
  },
  {
    name: "My Points",
    path: "/my-points",
    icon: Award,
  },
  {
    name: "Profile",
    path: "/profile",
    icon: User,
  },
];
