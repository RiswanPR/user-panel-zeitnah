import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CommunityProfile,
  CommunityProfileSchema,
} from './schemas/community-profile.schema';
import { Skill, SkillSchema } from './schemas/skill.schema';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Experience, ExperienceSchema } from './schemas/experience.schema';
import { Education, EducationSchema } from './schemas/education.schema';
import { Certificate, CertificateSchema } from './schemas/certificate.schema';
import { Follower, FollowerSchema } from './schemas/follower.schema';
import { ProfileView, ProfileViewSchema } from './schemas/profile-view.schema';
import { CommunityProfileService } from './community-profile.service';
import { CommunityProfileController } from './community-profile.controller';
import { ProfileOwnershipGuard } from './guards/profile-ownership.guard';
import { AwsModule } from '../../../common/aws/aws.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommunityProfile.name, schema: CommunityProfileSchema },
      { name: Skill.name, schema: SkillSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Experience.name, schema: ExperienceSchema },
      { name: Education.name, schema: EducationSchema },
      { name: Certificate.name, schema: CertificateSchema },
      { name: Follower.name, schema: FollowerSchema },
      { name: ProfileView.name, schema: ProfileViewSchema },
    ]),
    AwsModule,
  ],
  controllers: [CommunityProfileController],
  providers: [CommunityProfileService, ProfileOwnershipGuard],
  exports: [CommunityProfileService],
})
export class CommunityProfileModule {}
