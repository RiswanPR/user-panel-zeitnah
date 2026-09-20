import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './schemas/notification-preference.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
    }),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule {}

