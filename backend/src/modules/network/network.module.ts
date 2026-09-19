import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { Connection, ConnectionSchema } from './schemas/connection.schema';
import {
  NetworkActivity,
  NetworkActivitySchema,
} from './schemas/network-activity.schema';
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
import { AwsModule } from '../../common/aws/aws.module';
import { NetworkController } from './network.controller';
import { NetworkService } from './network.service';
import { CommunityService } from './community.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Connection.name, schema: ConnectionSchema },
      { name: NetworkActivity.name, schema: NetworkActivitySchema },
      { name: Community.name, schema: CommunitySchema },
      { name: CommunityMembership.name, schema: CommunityMembershipSchema },
      { name: CommunityDiscussion.name, schema: CommunityDiscussionSchema },
      { name: CommunityReply.name, schema: CommunityReplySchema },
      { name: CommunityAnnouncement.name, schema: CommunityAnnouncementSchema },
      { name: CommunityResource.name, schema: CommunityResourceSchema },
      { name: CommunityReport.name, schema: CommunityReportSchema },
    ]),
    AwsModule,
  ],
  controllers: [NetworkController],
  providers: [NetworkService, CommunityService],
  exports: [NetworkService, CommunityService],
})
export class NetworkModule {}
