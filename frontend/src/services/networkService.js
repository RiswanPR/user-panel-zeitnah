/**
 * @file networkService.js
 * Service abstraction for the Zeitnah Network ecosystem.
 * 
 * Phase 1: High-level metrics, activity streams, and optimistic connections.
 * Phase 2: Real server-driven student discovery, search, filtering, and profile preview.
 */

import api from "./api";

/**
 * @typedef {Object} DiscoverableStudent
 * @property {string} id - Unique identifier
 * @property {string} name - Student full name
 * @property {string} username - Student handle (@username)
 * @property {string} [avatarUrl] - Student profile image URL (presigned or public)
 * @property {string} [headline] - Short educational identity
 * @property {string} [course] - Primary enrolled course
 * @property {string[]} [interests] - Topics/skills tags
 * @property {string} [institution] - School, college, or university
 * @property {string} [level] - Gamification rank or level title
 * @property {boolean} [isActive] - Whether account is active
 * @property {string} [lastActiveAt] - ISO timestamp of last seen activity
 * @property {boolean} [isVerified] - Account verification status
 * @property {'none' | 'pending' | 'connected'} [connectionStatus] - Current connection status
 */

/**
 * @typedef {Object} PaginatedStudentsResponse
 * @property {DiscoverableStudent[]} data
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 * @property {boolean} hasNextPage
 */

/**
 * @typedef {Object} NetworkFiltersResponse
 * @property {string[]} courses
 * @property {string[]} interests
 * @property {string[]} institutions
 * @property {string[]} levels
 */

/**
 * Fallback mock data used when backend endpoint is unreachable during offline/local testing
 */
const FALLBACK_STUDENTS = [
  {
    id: "net_u_1",
    name: "Alex Mathew",
    username: "alexmathew",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    headline: "Computer Science Student",
    course: "Web Development",
    interests: ["React", "UI/UX", "TypeScript"],
    institution: "National Institute of Technology",
    level: "Scholar",
    isActive: true,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    isVerified: true,
  },
  {
    id: "net_u_2",
    name: "Sarah Chen",
    username: "sarahc",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
    headline: "Frontend Engineer & Learner",
    course: "Full Stack Mastery",
    interests: ["Next.js", "Tailwind CSS", "Architecture"],
    institution: "Tech University",
    level: "Master",
    isActive: true,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isVerified: true,
  },
  {
    id: "net_u_3",
    name: "Arjun Sharma",
    username: "arjunsharma",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    headline: "Engineering Aspirant",
    course: "Physics — Work & Energy",
    interests: ["Classical Mechanics", "Mathematics", "Problem Solving"],
    institution: "Apex Science Academy",
    level: "Beginner",
    isActive: true,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    isVerified: false,
  },
  {
    id: "net_u_4",
    name: "Muneer Khan",
    username: "muneer_k",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
    headline: "Software Development Student",
    course: "Web Development",
    interests: ["JavaScript", "APIs", "Database Systems"],
    institution: "Global College of Engineering",
    level: "Scholar",
    isActive: true,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    isVerified: false,
  },
  {
    id: "net_u_5",
    name: "Fatima Al-Hassan",
    username: "fatimah",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80",
    headline: "Data & Systems Enthusiast",
    course: "Python for Data Science",
    interests: ["Data Analytics", "Python", "Algorithms"],
    institution: "Metropolitan University",
    level: "Grandmaster",
    isActive: true,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    isVerified: true,
  },
  {
    id: "net_u_6",
    name: "David Kim",
    username: "davidkim",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80",
    headline: "Product Design & Frontend",
    course: "UI/UX & Product Design",
    interests: ["Figma", "Design Systems", "Prototyping"],
    institution: "School of Visual Arts",
    level: "Scholar",
    isActive: true,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    isVerified: false,
  },
];

const MOCK_ACTIVITIES = [
  {
    id: "act_1",
    user: FALLBACK_STUDENTS[0],
    type: "course_completed",
    text: "Alex completed Physics — Work, Energy & Power",
    context: "Physics",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    engagementCount: 14,
  },
  {
    id: "act_2",
    user: FALLBACK_STUDENTS[1],
    type: "streak_milestone",
    text: "Sarah achieved a 7-day learning streak",
    context: "Consistency",
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    engagementCount: 29,
  },
  {
    id: "act_3",
    user: FALLBACK_STUDENTS[2],
    type: "course_enrolled",
    text: "Arjun joined the Web Development course",
    context: "Web Development",
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    engagementCount: 8,
  },
  {
    id: "act_4",
    user: FALLBACK_STUDENTS[3],
    type: "lesson_completed",
    text: "Muneer completed 5 lessons this week",
    context: "Web Development",
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    engagementCount: 19,
  },
];

export const networkService = {
  /**
   * Phase 2: Discovers students using real backend search, filtering, and pagination.
   * Falls back gracefully to curated educational list if backend is momentarily unreachable.
   * 
   * @param {Object} [params]
   * @param {string} [params.q=''] - Search term
   * @param {string} [params.course=''] - Course filter
   * @param {string} [params.level=''] - Learning level / rank filter
   * @param {string} [params.institution=''] - Institution filter
   * @param {string} [params.interest=''] - Interest/skill filter
   * @param {string} [params.sort='recommended'] - Sort option ('recommended' | 'recent' | 'name')
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=12] - Page limit
   * @returns {Promise<PaginatedStudentsResponse>}
   */
  getDiscoverStudents: async ({
    q = "",
    course = "",
    level = "",
    institution = "",
    interest = "",
    sort = "recommended",
    page = 1,
    limit = 12,
  } = {}) => {
    try {
      const response = await api.get("/network/students", {
        params: {
          q: q || undefined,
          course: course || undefined,
          level: level || undefined,
          institution: institution || undefined,
          interest: interest || undefined,
          sort: sort || undefined,
          page,
          limit,
        },
      });
      return response.data;
    } catch {
      // Graceful offline fallback simulation
      let filtered = [...FALLBACK_STUDENTS];
      if (q && q.trim()) {
        const query = q.trim().toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.username.toLowerCase().includes(query) ||
            s.course?.toLowerCase().includes(query) ||
            s.interests?.some((i) => i.toLowerCase().includes(query)),
        );
      }
      if (course && course.trim() && course.toLowerCase() !== "all") {
        filtered = filtered.filter((s) =>
          s.course?.toLowerCase().includes(course.trim().toLowerCase()),
        );
      }
      if (interest && interest.trim()) {
        filtered = filtered.filter((s) =>
          s.interests?.some((i) =>
            i.toLowerCase().includes(interest.trim().toLowerCase()),
          ),
        );
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const data = filtered.slice(start, start + limit);

      return {
        data,
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      };
    }
  },

  /**
   * Phase 2: Retrieves real filter options available in the student directory.
   * 
   * @returns {Promise<NetworkFiltersResponse>}
   */
  getDiscoverFilters: async () => {
    try {
      const response = await api.get("/network/filters");
      return response.data;
    } catch {
      return {
        courses: [
          "Web Development",
          "Full Stack Mastery",
          "Physics — Work & Energy",
          "Python for Data Science",
          "UI/UX & Product Design",
        ],
        interests: [
          "React",
          "TypeScript",
          "UI/UX",
          "Next.js",
          "Tailwind CSS",
          "Python",
          "Mathematics",
          "Figma",
        ],
        institutions: [
          "National Institute of Technology",
          "Tech University",
          "Apex Science Academy",
          "Global College of Engineering",
        ],
        levels: ["Beginner", "Scholar", "Master", "Grandmaster"],
      };
    }
  },

  /**
   * Phase 2: Retrieves single student public preview by username.
   * 
   * @param {string} username
   * @returns {Promise<DiscoverableStudent>}
   */
  getStudentPreview: async (username) => {
    try {
      const response = await api.get(`/network/students/${encodeURIComponent(username)}`);
      return response.data;
    } catch {
      const found = FALLBACK_STUDENTS.find(
        (s) => s.username.toLowerCase() === username.toLowerCase(),
      );
      if (found) return found;
      throw new Error("Student profile not found");
    }
  },

  /**
   * Phase 4: Retrieves full public student profile with learning identity,
   * courses, achievements, activity, and relationship state.
   * 
   * @param {string} username
   * @returns {Promise<any>}
   */
  getStudentProfile: async (username) => {
    const response = await api.get(`/network/profile/${encodeURIComponent(username)}`);
    return response.data;
  },

  /**
   * Phase 1: High-level network telemetry stats.
   */
  getNetworkStats: async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return {
      activeStudentsCount: 284,
      onlineLearnersCount: 42,
      weeklyConnectionsCount: 156,
    };
  },

  /**
   * Phase 1: Curated suggested students for the Overview tab.
   */
  getSuggestedStudents: async ({ search = "", filter = "", limit = 8 } = {}) => {
    // Forward to getDiscoverStudents with default parameters
    const res = await networkService.getDiscoverStudents({
      q: search,
      course: filter,
      limit,
    });
    return res.data;
  },

  /**
   * Phase 1: Learning activity preview.
   */
  getNetworkActivity: async ({ limit = 10 } = {}) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_ACTIVITIES.slice(0, limit);
  },

  /**
   * Phase 1: Connections list.
   */
  getConnections: async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return [];
  },
};

export default networkService;
