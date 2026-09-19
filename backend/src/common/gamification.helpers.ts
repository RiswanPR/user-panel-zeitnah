export const LEVEL_THRESHOLDS = [
  { level: 7, points: 4000 },
  { level: 6, points: 2000 },
  { level: 5, points: 1000 },
  { level: 4, points: 500 },
  { level: 3, points: 250 },
  { level: 2, points: 100 },
  { level: 1, points: 0 },
];

export const PROFILE_COMPLETION_REWARDS = [
  { milestone: 100, points: 50 },
  { milestone: 75, points: 30 },
  { milestone: 50, points: 20 },
];

export const PROFILE_MILESTONES = {
  PROFILE_PHOTO_COMPLETED: { id: 'PROFILE_PHOTO_COMPLETED', points: 15, label: 'Profile Photo Added' },
  PROFILE_BACKGROUND_COMPLETED: { id: 'PROFILE_BACKGROUND_COMPLETED', points: 10, label: 'Background Image Added' },
  PROFILE_HEADLINE_COMPLETED: { id: 'PROFILE_HEADLINE_COMPLETED', points: 10, label: 'Headline Added' },
  PROFILE_ROLE_COMPLETED: { id: 'PROFILE_ROLE_COMPLETED', points: 5, label: 'Current Role Added' },
  PROFILE_LOCATION_COMPLETED: { id: 'PROFILE_LOCATION_COMPLETED', points: 5, label: 'Location Added' },
  PROFILE_INDUSTRY_COMPLETED: { id: 'PROFILE_INDUSTRY_COMPLETED', points: 5, label: 'Industry Added' },
  PROFILE_ABOUT_COMPLETED: { id: 'PROFILE_ABOUT_COMPLETED', points: 15, label: 'About Story Added' },
  PROFILE_EXPERIENCE_COMPLETED: { id: 'PROFILE_EXPERIENCE_COMPLETED', points: 20, label: 'First Experience Added' },
  PROFILE_EDUCATION_COMPLETED: { id: 'PROFILE_EDUCATION_COMPLETED', points: 20, label: 'First Education Added' },
  PROFILE_CERTIFICATION_COMPLETED: { id: 'PROFILE_CERTIFICATION_COMPLETED', points: 15, label: 'First Certification Added' },
  PROFILE_SKILLS_COMPLETED: { id: 'PROFILE_SKILLS_COMPLETED', points: 15, label: 'Skills Milestone (3+ Skills)' },
  PUBLIC_PROFILE_SETUP_COMPLETED: { id: 'PUBLIC_PROFILE_SETUP_COMPLETED', points: 30, label: 'Public Profile Setup' },
  PUBLIC_PROFILE_PUBLISHED: { id: 'PUBLIC_PROFILE_PUBLISHED', points: 20, label: 'Public Profile Published' },
  PROFILE_COMPLETION_50: { id: 'PROFILE_COMPLETION_50', points: 15, label: '50% Profile Completion' },
  PROFILE_COMPLETION_75: { id: 'PROFILE_COMPLETION_75', points: 20, label: '75% Profile Completion' },
  PROFILE_COMPLETION_100: { id: 'PROFILE_COMPLETION_100', points: 50, label: '100% Profile Completion' },
} as const;

export function calculateLevel(points = 0) {
  return LEVEL_THRESHOLDS.find((item) => points >= item.points)?.level || 1;
}

export function calculateRank(points = 0) {
  if (points >= 10000) {
    return 'Grand Master';
  }

  if (points >= 3000) {
    return 'Master';
  }

  if (points >= 1000) {
    return 'Expert';
  }

  if (points >= 500) {
    return 'Advanced Learner';
  }

  if (points >= 100) {
    return 'Learner';
  }

  return 'Beginner';
}

export function calculateAuthoritativeProfileCompletion(user: any) {
  const hasName = Boolean(user?.name && user.name.trim().length > 0);
  const hasPhoto = Boolean(user?.avatar && user.avatar.trim().length > 0);
  const hasHeadline = Boolean(user?.headline && user.headline.trim().length > 0);
  const hasRoleOrLocationOrIndustry = Boolean(
    (user?.currentRole && user.currentRole.trim().length > 0) ||
    (user?.location && user.location.trim().length > 0) ||
    (user?.industry && user.industry.trim().length > 0)
  );
  const hasAbout = Boolean(user?.bio && user.bio.trim().length >= 20);
  const hasSkills = Array.isArray(user?.skills) && user.skills.length >= 3;
  const hasEducation = Array.isArray(user?.education) && user.education.length > 0;
  const hasExperienceOrCertOrPortfolio = Boolean(
    (Array.isArray(user?.experience) && user.experience.length > 0) ||
    (Array.isArray(user?.certifications) && user.certifications.length > 0) ||
    (user?.backgroundImage && Array.isArray(user?.skills) && user.skills.length >= 5)
  );

  let score = 0;
  if (hasName) score += 10;
  if (hasPhoto) score += 15;
  if (hasHeadline) score += 10;
  if (hasRoleOrLocationOrIndustry) score += 10;
  if (hasAbout) score += 15;
  if (hasSkills) score += 15;
  if (hasEducation) score += 15;
  if (hasExperienceOrCertOrPortfolio) score += 10;

  const completionPercent = Math.min(100, Math.max(0, score));

  const rewardedMilestones = Array.isArray(user?.gamification?.rewardedMilestones)
    ? user.gamification.rewardedMilestones
    : [];

  const completedMilestones = [...rewardedMilestones];

  let potentialXp = 0;
  let earnedProfileXp = 0;
  const remainingMilestones: Array<{
    id: string;
    title: string;
    description: string;
    xp: number;
    category: string;
    targetSection: string;
    actionLabel: string;
  }> = [];

  const milestoneCatalog = [
    {
      id: 'PROFILE_PHOTO_COMPLETED',
      title: 'Add a profile photo',
      description: 'Make your identity recognizable',
      xp: PROFILE_MILESTONES.PROFILE_PHOTO_COMPLETED.points,
      category: 'IDENTITY',
      targetSection: 'introduction',
      actionLabel: 'Add Photo',
      done: hasPhoto,
    },
    {
      id: 'PROFILE_HEADLINE_COMPLETED',
      title: 'Add your headline',
      description: 'Define who you are in one crisp sentence',
      xp: PROFILE_MILESTONES.PROFILE_HEADLINE_COMPLETED.points,
      category: 'INTRODUCTION',
      targetSection: 'introduction',
      actionLabel: 'Add Headline',
      done: hasHeadline,
    },
    {
      id: 'PROFILE_ABOUT_COMPLETED',
      title: 'Write your About',
      description: 'Tell people what you are learning, building, or working toward',
      xp: PROFILE_MILESTONES.PROFILE_ABOUT_COMPLETED.points,
      category: 'ABOUT',
      targetSection: 'about',
      actionLabel: 'Add About',
      done: hasAbout,
    },
    {
      id: 'PROFILE_SKILLS_COMPLETED',
      title: 'Add 3+ skills',
      description: 'Showcase technologies and competencies you are developing',
      xp: PROFILE_MILESTONES.PROFILE_SKILLS_COMPLETED.points,
      category: 'SKILLS',
      targetSection: 'skills',
      actionLabel: 'Add Skills',
      done: hasSkills,
    },
    {
      id: 'PROFILE_EDUCATION_COMPLETED',
      title: 'Add your education',
      description: 'Show your learning journey and studies',
      xp: PROFILE_MILESTONES.PROFILE_EDUCATION_COMPLETED.points,
      category: 'EDUCATION',
      targetSection: 'education',
      actionLabel: 'Add Education',
      done: hasEducation,
    },
    {
      id: 'PROFILE_BACKGROUND_COMPLETED',
      title: 'Add a cover image',
      description: 'Personalize your profile header banner',
      xp: PROFILE_MILESTONES.PROFILE_BACKGROUND_COMPLETED.points,
      category: 'IDENTITY',
      targetSection: 'introduction',
      actionLabel: 'Add Cover',
      done: Boolean(user?.backgroundImage),
    },
    {
      id: 'PROFILE_ROLE_COMPLETED',
      title: 'Add your current role',
      description: 'Student, Developer, Designer, or Enthusiast',
      xp: PROFILE_MILESTONES.PROFILE_ROLE_COMPLETED.points,
      category: 'INTRODUCTION',
      targetSection: 'introduction',
      actionLabel: 'Add Role',
      done: Boolean(user?.currentRole),
    },
    {
      id: 'PROFILE_LOCATION_COMPLETED',
      title: 'Add your location',
      description: 'Share your city or region',
      xp: PROFILE_MILESTONES.PROFILE_LOCATION_COMPLETED.points,
      category: 'INTRODUCTION',
      targetSection: 'introduction',
      actionLabel: 'Add Location',
      done: Boolean(user?.location),
    },
    {
      id: 'PROFILE_INDUSTRY_COMPLETED',
      title: 'Add industry focus',
      description: 'Select your field of interest or study',
      xp: PROFILE_MILESTONES.PROFILE_INDUSTRY_COMPLETED.points,
      category: 'INTRODUCTION',
      targetSection: 'introduction',
      actionLabel: 'Add Industry',
      done: Boolean(user?.industry),
    },
    {
      id: 'PROFILE_EXPERIENCE_COMPLETED',
      title: 'Add experience or project',
      description: 'Work, internships, volunteering, leadership, or personal projects',
      xp: PROFILE_MILESTONES.PROFILE_EXPERIENCE_COMPLETED.points,
      category: 'EXPERIENCE',
      targetSection: 'experience',
      actionLabel: 'Add Experience',
      done: Array.isArray(user?.experience) && user.experience.length > 0,
    },
    {
      id: 'PROFILE_CERTIFICATION_COMPLETED',
      title: 'Add certification',
      description: 'Highlight your verified licenses or certificates',
      xp: PROFILE_MILESTONES.PROFILE_CERTIFICATION_COMPLETED.points,
      category: 'CERTIFICATIONS',
      targetSection: 'certifications',
      actionLabel: 'Add Certificate',
      done: Array.isArray(user?.certifications) && user.certifications.length > 0,
    },
    {
      id: 'PUBLIC_PROFILE_SETUP_COMPLETED',
      title: 'Set up Public Profile',
      description: 'Ensure photo, headline, about, and skills are ready',
      xp: PROFILE_MILESTONES.PUBLIC_PROFILE_SETUP_COMPLETED.points,
      category: 'PUBLIC_PROFILE',
      targetSection: 'public-profile',
      actionLabel: 'Setup Public Profile',
      done: Boolean(hasPhoto && hasHeadline && hasAbout && hasSkills && user?.username),
    },
    {
      id: 'PUBLIC_PROFILE_PUBLISHED',
      title: 'Publish Public Profile',
      description: 'Make your student profile live and shareable',
      xp: PROFILE_MILESTONES.PUBLIC_PROFILE_PUBLISHED.points,
      category: 'PUBLIC_PROFILE',
      targetSection: 'public-profile',
      actionLabel: 'Publish Profile',
      done: Boolean(user?.publicProfilePublished),
    },
    {
      id: 'PROFILE_COMPLETION_50',
      title: 'Reach 50% Profile Strength',
      description: 'Unlock the halfway milestone',
      xp: PROFILE_MILESTONES.PROFILE_COMPLETION_50.points,
      category: 'MILESTONE',
      targetSection: 'introduction',
      actionLabel: 'Continue Profile',
      done: completionPercent >= 50,
    },
    {
      id: 'PROFILE_COMPLETION_75',
      title: 'Reach 75% Profile Strength',
      description: 'Unlock the advanced profile milestone',
      xp: PROFILE_MILESTONES.PROFILE_COMPLETION_75.points,
      category: 'MILESTONE',
      targetSection: 'introduction',
      actionLabel: 'Continue Profile',
      done: completionPercent >= 75,
    },
    {
      id: 'PROFILE_COMPLETION_100',
      title: 'Reach 100% Profile Strength',
      description: 'Complete your full professional identity',
      xp: PROFILE_MILESTONES.PROFILE_COMPLETION_100.points,
      category: 'MILESTONE',
      targetSection: 'introduction',
      actionLabel: 'Complete Profile',
      done: completionPercent >= 100,
    },
  ];

  for (const item of milestoneCatalog) {
    if (rewardedMilestones.includes(item.id)) {
      earnedProfileXp += item.xp;
    } else {
      potentialXp += item.xp;
      remainingMilestones.push({
        id: item.id,
        title: item.title,
        description: item.description,
        xp: item.xp,
        category: item.category,
        targetSection: item.targetSection,
        actionLabel: item.actionLabel,
      });
    }
  }

  const nextBestActions = milestoneCatalog
    .filter((item) => !item.done && !rewardedMilestones.includes(item.id))
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      xp: item.xp,
      category: item.category,
      targetSection: item.targetSection,
      actionLabel: item.actionLabel,
    }));

  const publicProfileReady = Boolean(
    hasPhoto && hasHeadline && hasAbout && hasSkills && user?.username
  );

  return {
    completionPercent,
    completedMilestones,
    remainingMilestones,
    potentialXp,
    earnedProfileXp,
    publicProfileReady,
    publicProfilePublished: Boolean(user?.publicProfilePublished),
    nextBestActions,
  };
}

export function calculateProfileCompletion(user: any) {
  return calculateAuthoritativeProfileCompletion(user).completionPercent;
}

export function evaluateProfileMilestones(user: any) {
  const gamification = ensureGamification(user);
  if (!Array.isArray(gamification.rewardedMilestones)) {
    gamification.rewardedMilestones = [];
  }

  const completion = calculateAuthoritativeProfileCompletion(user);
  const newlyAwarded: Array<{ id: string; points: number; label: string }> = [];

  const checks: Array<{ id: keyof typeof PROFILE_MILESTONES; condition: boolean }> = [
    {
      id: 'PROFILE_PHOTO_COMPLETED',
      condition: Boolean(user.avatar && user.avatar.trim().length > 0),
    },
    {
      id: 'PROFILE_BACKGROUND_COMPLETED',
      condition: Boolean(user.backgroundImage && user.backgroundImage.trim().length > 0),
    },
    {
      id: 'PROFILE_HEADLINE_COMPLETED',
      condition: Boolean(user.headline && user.headline.trim().length > 0),
    },
    {
      id: 'PROFILE_ROLE_COMPLETED',
      condition: Boolean(user.currentRole && user.currentRole.trim().length > 0),
    },
    {
      id: 'PROFILE_LOCATION_COMPLETED',
      condition: Boolean(user.location && user.location.trim().length > 0),
    },
    {
      id: 'PROFILE_INDUSTRY_COMPLETED',
      condition: Boolean(user.industry && user.industry.trim().length > 0),
    },
    {
      id: 'PROFILE_ABOUT_COMPLETED',
      condition: Boolean(user.bio && user.bio.trim().length >= 10),
    },
    {
      id: 'PROFILE_EXPERIENCE_COMPLETED',
      condition: Array.isArray(user.experience) && user.experience.length > 0,
    },
    {
      id: 'PROFILE_EDUCATION_COMPLETED',
      condition: Array.isArray(user.education) && user.education.length > 0,
    },
    {
      id: 'PROFILE_CERTIFICATION_COMPLETED',
      condition: Array.isArray(user.certifications) && user.certifications.length > 0,
    },
    {
      id: 'PROFILE_SKILLS_COMPLETED',
      condition: Array.isArray(user.skills) && user.skills.length >= 3,
    },
    {
      id: 'PUBLIC_PROFILE_SETUP_COMPLETED',
      condition: completion.publicProfileReady,
    },
    {
      id: 'PUBLIC_PROFILE_PUBLISHED',
      condition: Boolean(user.publicProfilePublished),
    },
    {
      id: 'PROFILE_COMPLETION_50',
      condition: completion.completionPercent >= 50,
    },
    {
      id: 'PROFILE_COMPLETION_75',
      condition: completion.completionPercent >= 75,
    },
    {
      id: 'PROFILE_COMPLETION_100',
      condition: completion.completionPercent >= 100,
    },
  ];

  for (const check of checks) {
    if (check.condition && !gamification.rewardedMilestones.includes(check.id)) {
      gamification.rewardedMilestones.push(check.id);
      const milestoneDef = PROFILE_MILESTONES[check.id];
      awardPoints(
        user,
        milestoneDef.points,
        milestoneDef.label,
        'profile_milestone',
        { milestone: check.id },
      );
      newlyAwarded.push({
        id: check.id,
        points: milestoneDef.points,
        label: milestoneDef.label,
      });

      // Maintain backward compatibility with profileCompletionRewards
      if (check.id === 'PROFILE_COMPLETION_50' && !gamification.profileCompletionRewards.includes(50)) {
        gamification.profileCompletionRewards.push(50);
      } else if (check.id === 'PROFILE_COMPLETION_75' && !gamification.profileCompletionRewards.includes(75)) {
        gamification.profileCompletionRewards.push(75);
      } else if (check.id === 'PROFILE_COMPLETION_100' && !gamification.profileCompletionRewards.includes(100)) {
        gamification.profileCompletionRewards.push(100);
      }
    }
  }

  gamification.profileCompletion = completion.completionPercent;

  return {
    newlyAwarded,
    completion,
  };
}

export function calculateStreak(activityDates: string[] = []) {
  if (!activityDates.length) {
    return 0;
  }

  const uniqueDates = Array.from(new Set(activityDates))
    .filter(Boolean)
    .sort()
    .reverse();

  let streak = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(`${uniqueDates[index - 1]}T00:00:00.000Z`);
    const current = new Date(`${uniqueDates[index]}T00:00:00.000Z`);
    const diffDays = Math.round(
      (previous.getTime() - current.getTime()) / 86400000,
    );

    if (diffDays !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export function calculatePoints(minutesWatched: number) {
  const minutes = Number(minutesWatched);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 0;
  }

  return Math.floor(minutes);
}

export function getNextLevelProgress(points = 0) {
  const ascending = [...LEVEL_THRESHOLDS].sort((a, b) => a.points - b.points);
  const current = [...ascending]
    .reverse()
    .find((item) => points >= item.points);
  const next = ascending.find((item) => item.points > points);

  if (!next) {
    return {
      currentLevel: current?.level || 7,
      nextLevel: null,
      currentThreshold: current?.points || 4000,
      nextThreshold: null,
      pointsToNextLevel: 0,
      progressPercent: 100,
    };
  }

  const currentThreshold = current?.points || 0;
  const progressPercent = Math.round(
    ((points - currentThreshold) / (next.points - currentThreshold)) * 100,
  );

  return {
    currentLevel: current?.level || 1,
    nextLevel: next.level,
    currentThreshold,
    nextThreshold: next.points,
    pointsToNextLevel: next.points - points,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
  };
}

export function ensureGamification(user: any) {
  if (!user.gamification) {
    user.gamification = {};
  }

  user.gamification.totalPoints = Number(user.gamification.totalPoints) || 0;
  user.gamification.level =
    Number(user.gamification.level) ||
    calculateLevel(user.gamification.totalPoints);
  user.gamification.rank =
    user.gamification.rank || calculateRank(user.gamification.totalPoints);
  user.gamification.completedCourses =
    Number(user.gamification.completedCourses) || 0;
  user.gamification.completedClasses =
    Number(user.gamification.completedClasses) || 0;
  user.gamification.totalWatchMinutes =
    Number(user.gamification.totalWatchMinutes) || 0;
  user.gamification.profileCompletion =
    Number(user.gamification.profileCompletion) || 0;
  user.gamification.achievements = Array.isArray(user.gamification.achievements)
    ? user.gamification.achievements
    : [];
  user.gamification.rewardedClassIds = Array.isArray(
    user.gamification.rewardedClassIds,
  )
    ? user.gamification.rewardedClassIds
    : [];
  user.gamification.rewardedCourseIds = Array.isArray(
    user.gamification.rewardedCourseIds,
  )
    ? user.gamification.rewardedCourseIds
    : [];
  user.gamification.profileCompletionRewards = Array.isArray(
    user.gamification.profileCompletionRewards,
  )
    ? user.gamification.profileCompletionRewards
    : [];
  user.gamification.activityDates = Array.isArray(
    user.gamification.activityDates,
  )
    ? user.gamification.activityDates
    : [];
  user.gamification.recentActivities = Array.isArray(
    user.gamification.recentActivities,
  )
    ? user.gamification.recentActivities
    : [];

  return user.gamification;
}

export function awardPoints(
  user: any,
  points: number,
  label: string,
  type: string,
  metadata: Record<string, any> = {},
) {
  const gamification = ensureGamification(user);
  const value = Math.max(0, Math.round(Number(points) || 0));

  if (value <= 0) {
    return null;
  }

  gamification.totalPoints += value;
  gamification.recentActivities.unshift({
    type,
    label,
    points: value,
    metadata,
    createdAt: new Date(),
  });
  gamification.recentActivities = gamification.recentActivities.slice(0, 20);
  gamification.level = calculateLevel(gamification.totalPoints);
  gamification.rank = calculateRank(gamification.totalPoints);

  return {
    type,
    label,
    points: value,
  };
}

export function syncGamificationStats(user: any) {
  const gamification = ensureGamification(user);
  const courses = Array.isArray(user.course) ? user.course : [];
  const allActivityDates = new Set<string>(gamification.activityDates || []);

  let completedCourses = 0;
  let completedClasses = 0;
  let totalWatchSeconds = 0;

  courses.forEach((course: any) => {
    const learningProgress = course.learningProgress || {};
    const classProgress = Array.isArray(course.classProgress)
      ? course.classProgress
      : [];

    completedClasses += classProgress.filter((item: any) =>
      Boolean(item.completed),
    ).length;
    totalWatchSeconds += classProgress.reduce(
      (sum: number, item: any) => sum + (Number(item.watchedSeconds) || 0),
      0,
    );

    if (
      Number(learningProgress.totalClasses) > 0 &&
      Number(learningProgress.completedClasses) >=
        Number(learningProgress.totalClasses)
    ) {
      completedCourses += 1;
    }

    (course.activityDates || []).forEach((date: string) => {
      if (date) {
        allActivityDates.add(date);
      }
    });
  });

  gamification.completedCourses = completedCourses;
  gamification.completedClasses = completedClasses;
  gamification.totalWatchMinutes = Math.floor(totalWatchSeconds / 60);
  gamification.profileCompletion = calculateProfileCompletion(user);
  gamification.activityDates = Array.from(allActivityDates).sort();
  gamification.level = calculateLevel(gamification.totalPoints);
  gamification.rank = calculateRank(gamification.totalPoints);

  const achievements = new Set<string>(gamification.achievements || []);
  const streak = calculateStreak(gamification.activityDates);

  if (completedClasses >= 1) achievements.add('First Class Completed');
  if (completedCourses >= 1) achievements.add('First Course Completed');
  if (gamification.totalPoints >= 100) achievements.add('100 Points Earned');
  if (gamification.totalPoints >= 500) achievements.add('500 Points Earned');
  if (gamification.totalPoints >= 1000) achievements.add('1000 Points Earned');
  if (gamification.profileCompletion >= 100) {
    achievements.add('Profile 100% Complete');
  }
  if (streak >= 7) achievements.add('7 Day Streak');
  if (streak >= 30) achievements.add('30 Day Streak');

  gamification.achievements = Array.from(achievements);

  return gamification;
}
