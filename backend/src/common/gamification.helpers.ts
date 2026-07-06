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

export function calculateProfileCompletion(user: any) {
  const fields = [
    user?.name,
    user?.email,
    user?.avatar,
    user?.bio,
    Array.isArray(user?.skills) && user.skills.length > 0,
  ];

  const completedFields = fields.filter((field) => {
    if (typeof field === 'string') {
      return field.trim().length > 0;
    }

    return Boolean(field);
  }).length;

  return Math.round((completedFields / fields.length) * 100);
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
