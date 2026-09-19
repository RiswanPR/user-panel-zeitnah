import { RelationshipState } from './connection-actions.dto';

export interface PublicCourseItem {
  courseId: string;
  name: string;
  progressPercent: number;
  completed: boolean;
  totalClasses?: number;
  completedClasses?: number;
  thumbnail?: string;
  lastActiveAt?: string;
}

export interface PublicAchievementItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  icon?: string;
  earnedAt?: string;
}

export interface PublicActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
}

export interface PublicNetworkProfile {
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    backgroundImage?: string;
    headline?: string;
    bio?: string;
    location?: string;
    isVerified?: boolean;
    joinedAt?: string;
  };
  identity?: {
    course?: string;
    level?: number;
    rank?: string;
    interests: string[];
    institution?: string;
  };
  learning?: {
    stats: {
      enrolledCoursesCount: number;
      completedCoursesCount: number;
      streak: number;
      totalPoints: number;
    };
    courses: PublicCourseItem[];
  };
  achievements?: PublicAchievementItem[];
  activity?: PublicActivityItem[];
  relationship: {
    state: RelationshipState;
    connectionId?: string;
  };
  isPrivate: boolean;
}
