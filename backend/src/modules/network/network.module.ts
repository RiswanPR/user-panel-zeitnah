import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LearningSpace,
  LearningSpaceSchema,
} from './schemas/learning-space.schema';
import { Community, CommunitySchema } from './schemas/community.schema';
import {
  CommunityMembership,
  CommunityMembershipSchema,
} from './schemas/community-membership.schema';
import {
  CommunityDiscussion,
  CommunityDiscussionSchema,
} from './schemas/community-discussion.schema';
import {
  CommunityReply,
  CommunityReplySchema,
} from './schemas/community-reply.schema';
import {
  CommunityAnnouncement,
  CommunityAnnouncementSchema,
} from './schemas/community-announcement.schema';
import {
  CommunityResource,
  CommunityResourceSchema,
} from './schemas/community-resource.schema';
import {
  CommunityReport,
  CommunityReportSchema,
} from './schemas/community-report.schema';
import {
  NetworkConnection,
  NetworkConnectionSchema,
} from './schemas/connection.schema';
import {
  NetworkActivity,
  NetworkActivitySchema,
} from './schemas/activity.schema';
import {
  Organization,
  OrganizationSchema,
} from './schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipSchema,
} from './schemas/organization-membership.schema';
import { Opportunity, OpportunitySchema } from './schemas/opportunity.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import {
  Notification,
  NotificationSchema,
} from '../notifications/notification.schema';
import { LearningSpacesService } from './services/learning-spaces.service';
import { NetworkConnectionsService } from './services/network-connections.service';
import { OpportunitiesService } from './services/opportunities.service';
import { NetworkService } from './network.service';
import { LearningSpacesController } from './controllers/learning-spaces.controller';
import { NetworkConnectionsController } from './controllers/network-connections.controller';
import { OpportunitiesController } from './controllers/opportunities.controller';
import { NetworkController } from './network.controller';
import { AwsModule } from '../../common/aws/aws.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LearningSpace.name, schema: LearningSpaceSchema },
      { name: Community.name, schema: CommunitySchema },
      { name: CommunityMembership.name, schema: CommunityMembershipSchema },
      { name: CommunityDiscussion.name, schema: CommunityDiscussionSchema },
      { name: CommunityReply.name, schema: CommunityReplySchema },
      { name: CommunityAnnouncement.name, schema: CommunityAnnouncementSchema },
      { name: CommunityResource.name, schema: CommunityResourceSchema },
      { name: CommunityReport.name, schema: CommunityReportSchema },
      { name: NetworkConnection.name, schema: NetworkConnectionSchema },
      { name: NetworkActivity.name, schema: NetworkActivitySchema },
      { name: Organization.name, schema: OrganizationSchema },
      {
        name: OrganizationMembership.name,
        schema: OrganizationMembershipSchema,
      },
      { name: Opportunity.name, schema: OpportunitySchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    AwsModule,
    NotificationsModule,
  ],
  controllers: [
    LearningSpacesController,
    NetworkConnectionsController,
    OpportunitiesController,
    NetworkController,
  ],
  providers: [
    LearningSpacesService,
    NetworkConnectionsService,
    OpportunitiesService,
    NetworkService,
  ],
  exports: [
    LearningSpacesService,
    NetworkConnectionsService,
    OpportunitiesService,
    NetworkService,
    MongooseModule,
  ],
})
export class NetworkModule {}
