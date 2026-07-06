import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommunityGroupRepository } from '../repositories/community-group.repository';
import { CreateGroupDto, CreateAnnouncementDto } from '../dto/group.dto';
import { GroupDocument, AnnouncementDocument } from '../schemas/group.schema';

@Injectable()
export class CommunityGroupService {
  constructor(private readonly groupRepository: CommunityGroupRepository) {}

  async createGroup(
    userId: string,
    data: CreateGroupDto,
  ): Promise<GroupDocument> {
    const group = await this.groupRepository.create({
      ...data,
      creatorId: userId,
    });

    // Automatically make the creator the owner
    await this.groupRepository.addMember(group._id, userId, 'owner');

    return group;
  }

  async joinGroup(
    groupId: string,
    userId: string,
    role: string = 'member',
  ): Promise<void> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    await this.groupRepository.addMember(groupId, userId, role);
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    await this.groupRepository.removeMember(groupId, userId);
  }

  async createAnnouncement(
    userId: string,
    data: CreateAnnouncementDto,
  ): Promise<AnnouncementDocument> {
    // In a full implementation, check if userId has admin/moderator role in the group/course
    return this.groupRepository.createAnnouncement({
      ...data,
      authorId: userId,
    });
  }

  async getAnnouncements(
    courseId?: string,
    groupId?: string,
  ): Promise<AnnouncementDocument[]> {
    const query: any = {};
    if (courseId) query.courseId = courseId;
    if (groupId) query.groupId = groupId;

    return this.groupRepository.findAnnouncements(query);
  }
}
