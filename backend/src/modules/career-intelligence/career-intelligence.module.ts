import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CareerInsight,
  CareerInsightSchema,
} from './schemas/career-insight.schema';
import {
  InfrastructureMarketSnapshot,
  InfrastructureMarketSnapshotSchema,
} from './schemas/market-snapshot.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Opportunity, OpportunitySchema } from '../opportunities/schemas/opportunity.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CareerIntelligenceService } from './career-intelligence.service';
import { CareerIntelligenceController } from './career-intelligence.controller';

@Module({
  imports: [
    AuditLogsModule,
    MongooseModule.forFeature([
      { name: CareerInsight.name, schema: CareerInsightSchema },
      { name: InfrastructureMarketSnapshot.name, schema: InfrastructureMarketSnapshotSchema },
      { name: User.name, schema: UserSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  providers: [CareerIntelligenceService],
  controllers: [CareerIntelligenceController],
  exports: [CareerIntelligenceService],
})
export class CareerIntelligenceModule {}
