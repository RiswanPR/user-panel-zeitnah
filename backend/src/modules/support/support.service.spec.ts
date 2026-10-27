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

  it('should escape HTML injection payloads in support notification email and preserve multiline breaks', async () => {
    process.env.SUPPORT_NOTIFICATION_EMAILS = 'ops@zeitnah.com';

    const maliciousDto = {
      name: '<script>alert("name-xss")</script>',
      email: 'hacker"onmouseover="alert(1)@evil.com',
      category: 'PAYMENTS_ENROLLMENT' as const,
      subject: 'Urgent: <img src=x onerror=alert("subject-xss") /> & special "chars"',
      message: 'Line 1: Hello<script>alert("msg-xss")</script>\nLine 2: Next paragraph\r\nLine 3: Final notes & info',
    };

    await service.createTicket(maliciousDto);

    // Wait a tick for non-blocking notification dispatch
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    const emailPayload = mockEmailService.sendEmail.mock.calls[0][0];

    // Assert that raw malicious tags are neutralized
    expect(emailPayload.html).not.toContain('<script>');
    expect(emailPayload.html).not.toContain('<img src=x');
    expect(emailPayload.html).toContain('&lt;script&gt;alert(&quot;name-xss&quot;)&lt;/script&gt;');
    expect(emailPayload.html).toContain('&lt;img src=x onerror=alert(&quot;subject-xss&quot;) /&gt;');
    expect(emailPayload.html).toContain('special &quot;chars&quot;');

    // Assert that line breaks in message become <br />
    expect(emailPayload.html).toContain('Line 1: Hello&lt;script&gt;alert(&quot;msg-xss&quot;)&lt;/script&gt;<br />Line 2: Next paragraph<br />Line 3: Final notes &amp; info');

    // Assert that plain text is provided with raw newlines and legible content
    expect(emailPayload.text).toBeDefined();
    expect(emailPayload.text).toContain('From: <script>alert("name-xss")</script>');
    expect(emailPayload.text).toContain('Line 1: Hello<script>alert("msg-xss")</script>\nLine 2: Next paragraph\r\nLine 3: Final notes & info');
  });
});
