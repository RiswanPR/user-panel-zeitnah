import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MessagingService } from './messaging/messaging.service';
import { MessagesGateway } from './messaging/messages.gateway';
import { ModerationService } from './moderation/moderation.service';
import { NotificationsService } from './notifications/notifications.service';
import {
  Conversation,
  ConversationType,
} from './messaging/schemas/conversation.schema';
import { Message } from './messaging/schemas/message.schema';
import { User } from './auth/schemas/user.schema';
import { NetworkConnection } from './network/schemas/connection.schema';

describe('Messaging Identity & Name Resolution Quality Suite (A-J)', () => {
  let messagingService: MessagingService;
  let mockMessagesGateway: any;

  const currentUserId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();
  const thirdUserId = new Types.ObjectId().toString();
  const fourthUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockMessagesGateway = {
      isUserOnline: jest
        .fn()
        .mockImplementation((id: string) => id === otherUserId),
      notifyNewMessage: jest.fn(),
      notifyConversationUpdated: jest.fn(),
      notifyReadReceipt: jest.fn(),
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getModelToken(Conversation.name),
          useValue: {},
        },
        {
          provide: getModelToken(Message.name),
          useValue: {},
        },
        {
          provide: getModelToken(User.name),
          useValue: {},
        },
        {
          provide: getModelToken(NetworkConnection.name),
          useValue: {},
        },
        {
          provide: ModerationService,
          useValue: {},
        },
        {
          provide: MessagesGateway,
          useValue: mockMessagesGateway,
        },
        {
          provide: NotificationsService,
          useValue: {},
        },
      ],
    }).compile();

    messagingService = module.get<MessagingService>(MessagingService);
  });

  // A. Resolves other participant correctly
  it('A. resolves other participant correctly regardless of ordering in participants array', () => {
    // Current user is second
    const convOrder1: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      participants: [
        {
          _id: new Types.ObjectId(otherUserId),
          name: 'Sarah Ali',
          username: 'sarahali',
        },
        {
          _id: new Types.ObjectId(currentUserId),
          name: 'Logged In User',
          username: 'current',
        },
      ],
      members: [],
    };
    const res1 = messagingService.formatConversation(convOrder1, currentUserId);
    expect(res1.partner).toBeDefined();
    expect(res1.partner.id).toBe(otherUserId);
    expect(res1.name).toBe('Sarah Ali');

    // Current user is first
    const convOrder2: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      participants: [
        {
          _id: new Types.ObjectId(currentUserId),
          name: 'Logged In User',
          username: 'current',
        },
        {
          _id: new Types.ObjectId(otherUserId),
          name: 'Sarah Ali',
          username: 'sarahali',
        },
      ],
      members: [],
    };
    const res2 = messagingService.formatConversation(convOrder2, currentUserId);
    expect(res2.partner).toBeDefined();
    expect(res2.partner.id).toBe(otherUserId);
    expect(res2.name).toBe('Sarah Ali');
  });

  // B. Renders direct participant name
  it('B. renders direct participant full display name', () => {
    const conv: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      participants: [
        {
          _id: new Types.ObjectId(otherUserId),
          name: 'Ahmed Rahman',
          username: 'ahmedrahman',
          currentRole: 'Senior Civil Engineer',
        },
        { _id: new Types.ObjectId(currentUserId), name: 'Current User' },
      ],
      members: [],
    };
    const res = messagingService.formatConversation(conv, currentUserId);
    expect(res.name).toBe('Ahmed Rahman');
    expect(res.title).toBe('Ahmed Rahman');
    expect(res.partner.name).toBe('Ahmed Rahman');
    expect(res.partner.currentRole).toBe('Senior Civil Engineer');
  });

  // C. Renders username when available and name is missing
  it('C. renders @username when name is missing or blank', () => {
    const conv: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      participants: [
        {
          _id: new Types.ObjectId(otherUserId),
          name: '',
          username: 'ahmedrahman',
        },
        { _id: new Types.ObjectId(currentUserId), name: 'Current User' },
      ],
      members: [],
    };
    const res = messagingService.formatConversation(conv, currentUserId);
    expect(res.name).toBe('@ahmedrahman');
    expect(res.partner.username).toBe('ahmedrahman');
  });

  // D. Renders avatar
  it('D. renders avatar correctly on partner and conversation', () => {
    const conv: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      avatar: '',
      participants: [
        {
          _id: new Types.ObjectId(otherUserId),
          name: 'Ahmed Rahman',
          avatar: '/uploads/avatars/ahmed.jpg',
        },
        { _id: new Types.ObjectId(currentUserId), name: 'Current User' },
      ],
      members: [],
    };
    const res = messagingService.formatConversation(conv, currentUserId);
    expect(res.avatar).toBe('/uploads/avatars/ahmed.jpg');
    expect(res.avatarUrl).toBe('/uploads/avatars/ahmed.jpg');
    expect(res.partner.avatar).toBe('/uploads/avatars/ahmed.jpg');
  });

  // E. Falls back safely if name and username are missing
  it('E. falls back safely to "Zeitnah Member" (NEVER "User") if name and username are missing', () => {
    const conv: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      participants: [
        { _id: new Types.ObjectId(otherUserId), name: '', username: '' },
        { _id: new Types.ObjectId(currentUserId), name: 'Current User' },
      ],
      members: [],
    };
    const res = messagingService.formatConversation(conv, currentUserId);
    expect(res.name).toBe('Zeitnah Member');
    expect(res.name).not.toBe('User');
    expect(res.name).not.toBe('Unknown User');
  });

  // F. Group name rendering with explicit name
  it('F. renders group conversation with explicit group name', () => {
    const conv: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.GROUP,
      name: 'Infrastructure Engineers',
      avatar: '/uploads/groups/infra.jpg',
      participants: [
        { _id: new Types.ObjectId(currentUserId), name: 'Current User' },
        { _id: new Types.ObjectId(otherUserId), name: 'Ahmed Rahman' },
        { _id: new Types.ObjectId(thirdUserId), name: 'Sarah Ali' },
      ],
      members: [],
    };
    const res = messagingService.formatConversation(conv, currentUserId);
    expect(res.name).toBe('Infrastructure Engineers');
    expect(res.title).toBe('Infrastructure Engineers');
    expect(res.memberCount).toBe(3);
  });

  // G. Group fallback rendering (deterministic "Name1, Name2 + N others")
  it('G. creates deterministic group title fallback (e.g. "Ahmed, Sarah + 1 others") instead of generic "Group"', () => {
    const conv: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.GROUP,
      name: '', // Empty group name
      participants: [
        { _id: new Types.ObjectId(currentUserId), name: 'Current User' },
        { _id: new Types.ObjectId(otherUserId), name: 'Ahmed Rahman' },
        { _id: new Types.ObjectId(thirdUserId), name: 'Sarah Ali' },
        { _id: new Types.ObjectId(fourthUserId), name: 'Kavita Nair' },
      ],
      members: [],
    };
    const res = messagingService.formatConversation(conv, currentUserId);
    expect(res.name).toBe('Ahmed Rahman, Sarah Ali + 1 others');
    expect(res.name).not.toBe('Group');
    expect(res.memberCount).toBe(4);
  });

  // H. Current user is never treated as recipient
  it('H. current user is NEVER treated as the direct chat recipient/partner', () => {
    const conv: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      participants: [
        {
          _id: new Types.ObjectId(currentUserId),
          name: 'My Own Account',
          username: 'me',
        },
        {
          _id: new Types.ObjectId(otherUserId),
          name: 'Other Colleague',
          username: 'colleague',
        },
      ],
      members: [],
    };
    const res = messagingService.formatConversation(conv, currentUserId);
    expect(res.partner.id).not.toBe(currentUserId);
    expect(res.partner.id).toBe(otherUserId);
    expect(res.partner.name).toBe('Other Colleague');
    expect(res.name).toBe('Other Colleague');
    expect(res.name).not.toBe('My Own Account');
  });

  // I. Privacy projection remains enforced (e.g. online presence)
  it('I. respects participant privacySettings for online presence', () => {
    // Partner has presence privacy disabled
    const convHiddenPresence: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      participants: [
        {
          _id: new Types.ObjectId(otherUserId),
          name: 'Private Colleague',
          privacySettings: { onlinePresence: false },
        },
        { _id: new Types.ObjectId(currentUserId), name: 'Current User' },
      ],
      members: [],
    };
    const resHidden = messagingService.formatConversation(
      convHiddenPresence,
      currentUserId,
    );
    expect(resHidden.isPartnerOnline).toBe(false);

    // Partner has presence enabled
    const convAllowedPresence: any = {
      _id: new Types.ObjectId(),
      type: ConversationType.DIRECT,
      participants: [
        {
          _id: new Types.ObjectId(otherUserId),
          name: 'Public Colleague',
          privacySettings: { onlinePresence: true },
        },
        { _id: new Types.ObjectId(currentUserId), name: 'Current User' },
      ],
      members: [],
    };
    const resAllowed = messagingService.formatConversation(
      convAllowedPresence,
      currentUserId,
    );
    expect(resAllowed.isPartnerOnline).toBe(true);
  });

  // J. No sensitive participant fields leaked
  it('J. never leaks sensitive fields (passwords, OTPs, tokens, devices) in sanitized participants', () => {
    const dirtyUser = {
      _id: new Types.ObjectId(otherUserId),
      name: 'Ahmed Rahman',
      username: 'ahmedrahman',
      avatar: '/avatars/ahmed.jpg',
      password: 'argon2_hashed_secret_password',
      otp: '123456',
      otpExpiry: new Date(),
      devices: [{ refreshToken: 'secret_jwt_refresh' }],
      resetPasswordToken: 'reset_token_secret',
      email: 'ahmed@zeitnah.com',
    };

    const sanitized = messagingService.sanitizeParticipant(dirtyUser, true);
    expect(sanitized).toBeDefined();
    expect((sanitized as any).password).toBeUndefined();
    expect((sanitized as any).otp).toBeUndefined();
    expect((sanitized as any).otpExpiry).toBeUndefined();
    expect((sanitized as any).devices).toBeUndefined();
    expect((sanitized as any).resetPasswordToken).toBeUndefined();
    expect((sanitized as any).email).toBeUndefined();
    expect(sanitized?.name).toBe('Ahmed Rahman');
    expect(sanitized?.username).toBe('ahmedrahman');
    expect(sanitized?.online).toBe(true);
  });
});
