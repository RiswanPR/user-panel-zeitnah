import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  JobTalentMatch,
  JobTalentMatchSchema,
} from './schemas/job-talent-match.schema';
import {
  JobOpportunityInvite,
  JobOpportunityInviteSchema,
} from './schemas/job-opportunity-invite.schema';
import {
  UserJobRecommendation,
  UserJobRecommendationSchema,
} from './schemas/user-job-recommendation.schema';
import {
  Opportunity,
  OpportunitySchema,
} from '../opportunities/schemas/opportunity.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipSchema,
} from '../organizations/schemas/organization-membership.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  JobApplication,
  JobApplicationSchema,
} from '../opportunities/schemas/job-application.schema';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';

@Module({
  imports: [
    AuditLogsModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: JobTalentMatch.name, schema: JobTalentMatchSchema },
      { name: JobOpportunityInvite.name, schema: JobOpportunityInviteSchema },
      { name: UserJobRecommendation.name, schema: UserJobRecommendationSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
      { name: Organization.name, schema: OrganizationSchema },
      {
        name: OrganizationMembership.name,
        schema: OrganizationMembershipSchema,
      },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
    ]),
  ],
  providers: [MatchingService],
  controllers: [MatchingController],
  exports: [MatchingService],
})
export class MatchingModule {}
