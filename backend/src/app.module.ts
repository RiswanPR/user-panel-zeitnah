import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CoursesModule } from './modules/courses/courses.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AwsModule } from './common/aws/aws.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { NetworkModule } from './modules/network/network.module';
import { SkillsModule } from './modules/skills/skills.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { TroubleshootModule } from './modules/troubleshoot/troubleshoot.module';
import { ErrorReportsModule } from './modules/error-reports/error-reports.module';
import { WellKnownModule } from './modules/well-known/well-known.module';
import { EmailModule } from './common/email/email.module';

@Module({
  imports: [
    // ENV CONFIG
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

    // MONGODB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL') || process.env.MONGO_URL,
      }),
      inject: [ConfigService],
    }),

    // CORE MODULES
    AuthModule,
    AuditLogsModule,
    ErrorReportsModule,
    ProfileModule,
    CoursesModule,
    LeaderboardModule,
    AwsModule,
    NotificationsModule,
    AnnouncementsModule,
    NetworkModule,

    // NETWORK 3.0 ECOSYSTEM MODULES
    SkillsModule,
    ProjectsModule,
    OrganizationsModule,
    OpportunitiesModule,
    ModerationModule,

    // TROUBLESHOOT ERROR REPORTING
    TroubleshootModule,

    // WELL-KNOWN DEEP LINK DECLARATIONS
    WellKnownModule,

    // RESILIENT EMAIL SERVICE
    EmailModule,

    // RATE LIMITING
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 1000,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
