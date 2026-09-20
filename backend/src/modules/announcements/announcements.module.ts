import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlatformAnnouncement,
  PlatformAnnouncementSchema,
} from './platform-announcement.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformAnnouncement.name, schema: PlatformAnnouncementSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
