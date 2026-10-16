import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ProfessionalCatalogueService } from './services/professional-catalogue.service';
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

import {
  CatalogueDepartment,
  CatalogueDepartmentSchema,
} from './schemas/catalogue-department.schema';
import {
  CatalogueTitle,
  CatalogueTitleSchema,
} from './schemas/catalogue-title.schema';
import { CatalogueRepository } from './repositories/catalogue.repository';

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
      {
        name: CatalogueDepartment.name,
        schema: CatalogueDepartmentSchema,
      },
      {
        name: CatalogueTitle.name,
        schema: CatalogueTitleSchema,
      },
    ]),
    AwsModule,
    AuditLogsModule,
    UsernameModule,
  ],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    ProfessionalCatalogueService,
    CatalogueRepository,
  ],
  exports: [
    ProfileService,
    ProfessionalCatalogueService,
    CatalogueRepository,
  ],
})
export class ProfileModule {}
