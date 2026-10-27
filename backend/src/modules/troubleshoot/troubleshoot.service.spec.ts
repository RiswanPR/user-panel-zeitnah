import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TroubleshootService } from './troubleshoot.service';
import { TroubleshootReport } from './schemas/error-report.schema';
import { EmailService } from '../../common/email/email.service';

describe('TroubleshootService', () => {
  let service: TroubleshootService;
  let mockErrorReportModel: any;
  let mockEmailService: any;

  beforeEach(async () => {
    mockErrorReportModel = {
      create: jest.fn().mockImplementation((doc) =>
        Promise.resolve({
          ...doc,
          _id: 'report-id-789',
          createdAt: new Date(),
        }),
      ),
    };

    mockEmailService = {
      sendEmail: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'troubleshoot-msg-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TroubleshootService,
        {
          provide: getModelToken(TroubleshootReport.name),
          useValue: mockErrorReportModel,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<TroubleshootService>(TroubleshootService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should persist troubleshoot report and dispatch email via EmailService when enabled', async () => {
    process.env.ENABLE_OPERATIONAL_ALERT_EMAILS = 'true';
    process.env.ALERT_EMAIL = 'ops@zeitnah.com';

    const dto = {
      title: 'Video player DRM crash on Safari',
      description: 'Player crashed after switching lesson',
      severity: 'critical' as const,
      source: 'web_player',
      pageUrl: 'https://zeitnahacademy.com/courses/c1/learn',
      consoleErrors: [
        { type: 'error', message: 'DRM license rejected', timestamp: '10:00:00' },
      ],
      networkErrors: [
        { method: 'POST', url: '/api/vdo/otp', status: 500, message: 'Server error' },
      ],
      unhandledErrors: [],
      browserInfo: {
        browser: 'Safari',
        os: 'macOS',
        screenSize: '1920x1080',
      },
    };

    const result = await service.submitReport('507f1f77bcf86cd799439011', 'student@zeitnah.com', dto as any);

    expect(result).toBeDefined();
    expect(mockErrorReportModel.create).toHaveBeenCalledTimes(1);

    // Wait for async non-blocking sendEmailAlert
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    const emailPayload = mockEmailService.sendEmail.mock.calls[0][0];

    expect(emailPayload.to).toEqual(['ops@zeitnah.com']);
    expect(emailPayload.subject).toContain('[CRITICAL]');
    expect(emailPayload.subject).toContain('Video player DRM crash on Safari');
    expect(emailPayload.html).toContain('Video player DRM crash on Safari');
    expect(emailPayload.text).toBeDefined();
    expect(emailPayload.text).toContain('[CRITICAL] Troubleshoot Incident Report');
    expect(emailPayload.text).toContain('Title: Video player DRM crash on Safari');
    expect(emailPayload.text).toContain('User: student@zeitnah.com');
  });

  it('should suppress email alert when ENABLE_OPERATIONAL_ALERT_EMAILS is not true', async () => {
    process.env.ENABLE_OPERATIONAL_ALERT_EMAILS = 'false';

    const dto = {
      title: 'Minor UI glitch',
      severity: 'low' as const,
    };

    await service.submitReport('507f1f77bcf86cd799439011', 'student@zeitnah.com', dto as any);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });
});
