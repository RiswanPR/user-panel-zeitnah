import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Organization,
  OrganizationSchema,
} from './schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipSchema,
} from './schemas/organization-membership.schema';
import {
  OrganizationFollow,
  OrganizationFollowSchema,
} from './schemas/organization-follow.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AwsModule } from '../../common/aws/aws.module';
import {
  Opportunity,
  OpportunitySchema,
} from '../opportunities/schemas/opportunity.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AwsModule,
    AuditLogsModule,
    forwardRef(() => NotificationsModule),
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      {
        name: OrganizationMembership.name,
        schema: OrganizationMembershipSchema,
      },
      {
        name: OrganizationFollow.name,
        schema: OrganizationFollowSchema,
      },
      { name: User.name, schema: UserSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
    ]),
  ],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
