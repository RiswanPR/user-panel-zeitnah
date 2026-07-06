import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CommunityEvent,
  CommunityEventDocument,
  EventRsvp,
  EventRsvpDocument,
} from '../schemas/event.schema';

@Injectable()
export class CommunityEventService {
  private readonly logger = new Logger(CommunityEventService.name);

  constructor(
    @InjectModel(CommunityEvent.name)
    private eventModel: Model<CommunityEventDocument>,
    @InjectModel(EventRsvp.name) private rsvpModel: Model<EventRsvpDocument>,
  ) {}

  async createEvent(
    data: Partial<CommunityEvent>,
  ): Promise<CommunityEventDocument> {
    const event = new this.eventModel(data);
    return event.save();
  }

  async getUpcomingEvents(
    limit: number = 10,
  ): Promise<CommunityEventDocument[]> {
    return this.eventModel
      .aggregate([
        { $match: { startTime: { $gte: new Date() }, isDeleted: false } },
        { $sort: { startTime: 1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'community_event_rsvps',
            localField: '_id',
            foreignField: 'eventId',
            as: 'rsvps',
          },
        },
      ])
      .exec();
  }

  async rsvp(
    eventId: string,
    userId: string,
    status: string,
  ): Promise<EventRsvpDocument> {
    let rsvp = await this.rsvpModel.findOne({ eventId, userId });
    if (rsvp) {
      rsvp.status = status;
    } else {
      rsvp = new this.rsvpModel({ eventId, userId, status });
    }
    return rsvp.save();
  }
}
