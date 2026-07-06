import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import {
  Group,
  GroupDocument,
  GroupMember,
  GroupMemberDocument,
  Announcement,
  AnnouncementDocument,
} from '../schemas/group.schema';

@Injectable()
export class CommunityGroupRepository extends BaseRepository<GroupDocument> {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(GroupMember.name)
    private memberModel: Model<GroupMemberDocument>,
    @InjectModel(Announcement.name)
    private announcementModel: Model<AnnouncementDocument>,
  ) {
    super(groupModel);
  }

  async addMember(
    groupId: string,
    userId: string,
    role: string = 'member',
  ): Promise<void> {
    const exists = await this.memberModel.findOne({ groupId, userId });
    if (!exists) {
      await new this.memberModel({ groupId, userId, role }).save();
    }
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.memberModel.deleteOne({ groupId, userId }).exec();
  }

  async createAnnouncement(
    data: Partial<Announcement>,
  ): Promise<AnnouncementDocument> {
    return await new this.announcementModel(data).save();
  }

  async findAnnouncements(query: any): Promise<AnnouncementDocument[]> {
    return this.announcementModel.find(query).sort({ createdAt: -1 }).exec();
  }
}
