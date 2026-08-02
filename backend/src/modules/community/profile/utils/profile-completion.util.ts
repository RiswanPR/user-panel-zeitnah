import { ProfileCompletionBreakdown } from '../interfaces/profile.interface';

export function calculateProfileCompletion(data: {
  profile?: any;
  skillsCount?: number;
  projectsCount?: number;
  experiencesCount?: number;
  educationsCount?: number;
  certificatesCount?: number;
}): ProfileCompletionBreakdown {
  const {
    profile = {},
    skillsCount = 0,
    projectsCount = 0,
    experiencesCount = 0,
    educationsCount = 0,
    certificatesCount = 0,
  } = data;

  const weights = {
    avatar: 15,
    headlineBio: 15,
    collegeBranch: 10,
    resume: 15,
    skills: 15,
    projects: 15,
    experienceEducation: 15,
  };

  const completedSections: string[] = [];
  const missingSections: string[] = [];
  let score = 0;

  if (profile.profilePicture && profile.profilePicture.trim() !== '') {
    score += weights.avatar;
    completedSections.push('Profile Picture');
  } else {
    missingSections.push('Profile Picture');
  }

  if (profile.headline && profile.bio) {
    score += weights.headlineBio;
    completedSections.push('Headline & Bio');
  } else {
    missingSections.push('Headline & Bio');
  }

  if (profile.college && profile.branch) {
    score += weights.collegeBranch;
    completedSections.push('College & Branch');
  } else {
    missingSections.push('College & Branch');
  }

  if (profile.resumeUrl && profile.resumeUrl.trim() !== '') {
    score += weights.resume;
    completedSections.push('Resume');
  } else {
    missingSections.push('Resume');
  }

  if (skillsCount > 0 || (profile.skills && profile.skills.length > 0)) {
    score += weights.skills;
    completedSections.push('Skills');
  } else {
    missingSections.push('Skills');
  }

  if (projectsCount > 0) {
    score += weights.projects;
    completedSections.push('Projects');
  } else {
    missingSections.push('Projects');
  }

  if (experiencesCount > 0 || educationsCount > 0 || certificatesCount > 0) {
    score += weights.experienceEducation;
    completedSections.push('Experience, Education, or Certificates');
  } else {
    missingSections.push('Experience, Education, or Certificates');
  }

  return {
    percentage: Math.min(100, score),
    completedSections,
    missingSections,
  };
}
