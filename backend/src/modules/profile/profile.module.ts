import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  CommunityProfile,
  CommunityProfileSchema,
} from '../community/profile/schemas/community-profile.schema';
import { AwsModule } from '../../common/aws/aws.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsernameModule } from './services/username.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: CommunityProfile.name,
        schema: CommunityProfileSchema,
      },
    ]),
    AwsModule,
    AuditLogsModule,
    UsernameModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
