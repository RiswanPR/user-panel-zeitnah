import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  Recommendation,
  RecommendationSchema,
} from './schemas/recommendation.schema';
import { AwsModule } from '../../common/aws/aws.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsernameModule } from './services/username.module';
import { MatchingModule } from '../matching/matching.module';
import { CareerIntelligenceModule } from '../career-intelligence/career-intelligence.module';

@Module({
  imports: [
    forwardRef(() => MatchingModule),
    forwardRef(() => CareerIntelligenceModule),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Recommendation.name,
        schema: RecommendationSchema,
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
