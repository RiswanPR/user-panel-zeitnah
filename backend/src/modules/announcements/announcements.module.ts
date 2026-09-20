import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import {
  PlatformAnnouncement,
  PlatformAnnouncementSchema,
} from './schemas/announcement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PlatformAnnouncement.name,
        schema: PlatformAnnouncementSchema,
      },
    ]),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
