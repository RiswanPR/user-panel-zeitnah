import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SupportService } from './support.service';
import { SupportTicket } from './schemas/support-ticket.schema';
import { EmailService } from '../../common/email/email.service';

describe('SupportService', () => {
  let service: SupportService;
  let mockModel: any;
  let mockEmailService: any;

  beforeEach(async () => {
    mockModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          ...dto,
          _id: 'mock-ticket-id-123',
          createdAt: new Date(),
        }),
      ),
    };

    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        {
          provide: getModelToken(SupportTicket.name),
          useValue: mockModel,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully create a support ticket with a unique ticket number', async () => {
    const dto = {
      name: 'John Doe',
      email: 'john@example.com',
      category: 'VIDEO_PLAYBACK' as const,
      subject: 'Video playback stuttering',
      message: 'The class video is buffering continuously on Chrome.',
    };

    const result = await service.createTicket(dto);

    expect(result.success).toBe(true);
    expect(result.ticketNumber).toMatch(/^ZN-SUP-[A-Z0-9]+-\d{4}$/);
    expect(result.category).toBe('VIDEO_PLAYBACK');
    expect(mockModel.create).toHaveBeenCalledTimes(1);
    expect(mockModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
        category: 'VIDEO_PLAYBACK',
        status: 'OPEN',
      }),
    );
  });

  it('should silently discard honeypot spam without persisting to database', async () => {
    const spamDto = {
      name: 'Bot Spammer',
      email: 'bot@spam.com',
      category: 'OTHER' as const,
      subject: 'Buy cheap watches',
      message: 'Click this link right now.',
      websiteUrl: 'http://spam-link.com',
    };

    const result = await service.createTicket(spamDto);

    expect(result.success).toBe(true);
    expect(mockModel.create).not.toHaveBeenCalled();
  });
});
