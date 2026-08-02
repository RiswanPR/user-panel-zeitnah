import { CommunityProfile } from '../schemas/community-profile.schema';
import { Skill } from '../schemas/skill.schema';
import { Project } from '../schemas/project.schema';
import { Experience } from '../schemas/experience.schema';
import { Education } from '../schemas/education.schema';
import { Certificate } from '../schemas/certificate.schema';

export interface FullCommunityProfile {
  profile: CommunityProfile;
  skills: Skill[];
  projects: Project[];
  experiences: Experience[];
  educations: Education[];
  certificates: Certificate[];
  isFollowing?: boolean;
}

export interface ProfileCompletionBreakdown {
  percentage: number;
  completedSections: string[];
  missingSections: string[];
}
