import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationSchema } from './notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './notification-preference.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  Announcement,
  AnnouncementSchema,
} from '../announcements/schemas/announcement.schema';
import {
  PlatformAnnouncement,
  PlatformAnnouncementSchema,
} from '../announcements/platform-announcement.schema';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: PlatformAnnouncement.name, schema: PlatformAnnouncementSchema },
    ]),
    forwardRef(() => AnnouncementsModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsGateway, NotificationsService, MongooseModule],
})
export class NotificationsModule {}
