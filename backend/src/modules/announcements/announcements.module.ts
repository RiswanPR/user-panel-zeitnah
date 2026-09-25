import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlatformAnnouncement,
  PlatformAnnouncementSchema,
} from './platform-announcement.schema';
import {
  Announcement,
  AnnouncementSchema,
} from './schemas/announcement.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  Notification,
  NotificationSchema,
} from '../notifications/notification.schema';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: PlatformAnnouncement.name, schema: PlatformAnnouncementSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService, MongooseModule],
})
export class AnnouncementsModule {}
