import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Opportunity, OpportunitySchema } from './schemas/opportunity.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipSchema,
} from '../organizations/schemas/organization-membership.schema';
import { SavedJob, SavedJobSchema } from './schemas/saved-job.schema';
import {
  JobApplication,
  JobApplicationSchema,
} from './schemas/job-application.schema';
import {
  EmployerOpportunity,
  EmployerOpportunitySchema,
} from './schemas/employer-opportunity.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MatchingModule } from '../matching/matching.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ModerationModule } from '../moderation/moderation.module';
import { OpportunitiesService } from './opportunities.service';
import { OpportunitiesController } from './opportunities.controller';

@Module({
  imports: [
    AuditLogsModule,
    forwardRef(() => MatchingModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ModerationModule),
    MongooseModule.forFeature([
      { name: Opportunity.name, schema: OpportunitySchema },
      { name: Organization.name, schema: OrganizationSchema },
      {
        name: OrganizationMembership.name,
        schema: OrganizationMembershipSchema,
      },
      { name: SavedJob.name, schema: SavedJobSchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: EmployerOpportunity.name, schema: EmployerOpportunitySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [OpportunitiesService],
  controllers: [OpportunitiesController],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
