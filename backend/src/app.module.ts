import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AwsModule } from './common/aws/aws.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommunityModule } from './modules/community/community.module';
import { TroubleshootModule } from './modules/troubleshoot/troubleshoot.module';

@Module({
  imports: [
    // ENV CONFIG
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

    // MONGODB
    MongooseModule.forRoot(process.env.MONGO_URL),

    // CORE MODULES
    AuthModule,
    AuditLogsModule,
    ProfileModule,
    CoursesModule,
    AwsModule,
    NotificationsModule,

    // COMMUNITY
    CommunityModule,

    // TROUBLESHOOT ERROR REPORTING
    TroubleshootModule,

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
