import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  Recommendation,
  RecommendationSchema,
} from './schemas/recommendation.schema';
import {
  VerificationRequest,
  VerificationRequestSchema,
} from './schemas/verification-request.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { AwsModule } from '../../common/aws/aws.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsernameModule } from './services/username.module';
import { MatchingModule } from '../matching/matching.module';
import { CareerIntelligenceModule } from '../career-intelligence/career-intelligence.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => MatchingModule),
    forwardRef(() => CareerIntelligenceModule),
    forwardRef(() => NotificationsModule),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Recommendation.name,
        schema: RecommendationSchema,
      },
      {
        name: VerificationRequest.name,
        schema: VerificationRequestSchema,
      },
      {
        name: Project.name,
        schema: ProjectSchema,
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
