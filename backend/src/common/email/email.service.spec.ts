/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { EmailService } from './email.service';
import { ResendEmailProvider } from './resend-email.provider';
import { EmailProvider } from './email-provider.interface';
import { isReservedDocumentationDomain } from '../utils/email-validation.util';
import { resend } from '../../config/resend.config';

describe('Email Delivery Resilience & Fallback', () => {
  let emailService: EmailService;
  let mockResendProvider: jest.Mocked<ResendEmailProvider>;

  beforeEach(() => {
    mockResendProvider = {
      name: 'Resend',
      sendEmail: jest.fn(),
    } as any;

    emailService = new EmailService(mockResendProvider);
  });

  it('delivers email via primary provider on success', async () => {
    mockResendProvider.sendEmail.mockResolvedValueOnce({
      success: true,
      messageId: 'msg-12345',
      provider: 'Resend',
    });

    const result = await emailService.sendEmail({
      to: 'student@zeitnah.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-12345');
    expect(mockResendProvider.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestException if recipient is missing or empty', async () => {
    await expect(
      emailService.sendEmail({
        to: '',
        subject: 'No recipient',
        html: '<p>Test</p>',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      emailService.sendEmail({
        to: [],
        subject: 'Empty array',
        html: '<p>Test</p>',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to secondary provider if primary fails', async () => {
    mockResendProvider.sendEmail.mockResolvedValueOnce({
      success: false,
      provider: 'Resend',
      error: 'Resend rate limited',
    });

    const mockFallbackProvider: EmailProvider = {
      name: 'MockFallback',
      sendEmail: jest.fn().mockResolvedValueOnce({
        success: true,
        messageId: 'fallback-msg-999',
        provider: 'MockFallback',
      }),
    };

    emailService.registerFallbackProvider(mockFallbackProvider);

    const result = await emailService.sendEmail({
      to: 'student@zeitnah.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('MockFallback');
    expect(mockResendProvider.sendEmail).toHaveBeenCalledTimes(1);
    expect(mockFallbackProvider.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('throws user-safe BadRequestException when all providers fail without leaking secrets', async () => {
    mockResendProvider.sendEmail.mockResolvedValue({
      success: false,
      provider: 'Resend',
      error:
        'Connection timeout to api.resend.com/emails with key re_12345secret',
    });

    await expect(
      emailService.sendEmail({
        to: 'student@zeitnah.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      }),
    ).rejects.toThrow(BadRequestException);

    try {
      await emailService.sendEmail({
        to: 'student@zeitnah.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });
    } catch (err: any) {
      expect(err.message).not.toContain('re_12345secret');
      expect(err.message).not.toContain('api.resend.com');
      expect(err.message).toContain('Unable to send verification email');
    }
  });

  it('correctly masks email addresses in ResendEmailProvider to prevent sensitive data logging', () => {
    const provider = new ResendEmailProvider();
    const maskMethod = (provider as any).maskEmail.bind(provider);

    expect(maskMethod('student@example.com')).toBe('s***t@example.com');
    expect(maskMethod('al@test.org')).toBe('a***@test.org');
    expect(maskMethod(['a@b.com', 'user@domain.com'])).toBe(
      'a***@b.com, u***r@domain.com',
    );
    expect(maskMethod('invalid')).toBe('***');
  });

  describe('ResendEmailProvider — Domain Safety & Non-transient bypass', () => {
    let provider: ResendEmailProvider;

    beforeEach(() => {
      provider = new ResendEmailProvider();
    });

    it('identifies RFC 2606 reserved domains correctly', () => {
      expect(isReservedDocumentationDomain('test@example.com')).toBe(true);
      expect(isReservedDocumentationDomain('user@example.org')).toBe(true);
      expect(isReservedDocumentationDomain('dev@example.net')).toBe(true);
      expect(isReservedDocumentationDomain('student@sub.example.edu')).toBe(false);
      expect(isReservedDocumentationDomain('student@service.test')).toBe(true);
      expect(isReservedDocumentationDomain('student@zeitnah.com')).toBe(false);
      expect(isReservedDocumentationDomain('user@gmail.com')).toBe(false);
    });

    it('simulates delivery in test mode without calling real Resend API for example.com', async () => {
      const sendSpy = jest.spyOn(resend.emails, 'send');

      const result = await provider.sendEmail({
        to: 'student@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toContain('Simulated');
      expect(sendSpy).not.toHaveBeenCalled();
      sendSpy.mockRestore();
    });

    it('rejects reserved domains immediately in production without calling Resend API', async () => {
      const originalEnv = process.env.NODE_ENV;
      const sendSpy = jest.spyOn(resend.emails, 'send');

      try {
        (process.env as any).NODE_ENV = 'production';

        const result = await provider.sendEmail({
          to: 'student@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('RFC 2606');
        expect(sendSpy).not.toHaveBeenCalled();
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        sendSpy.mockRestore();
      }
    });

    it('does not retry permanent errors (e.g. invalid to or unverified domain)', async () => {
      const sendSpy = jest.spyOn(resend.emails, 'send').mockRejectedValue({
        message: 'Invalid `to` field. Please use our testing email address instead of domains like `example.com`.',
      });

      const result = await provider.sendEmail({
        to: 'realuser@verifieddomain.org',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      // Because it is a permanent error, it breaks immediately after attempt 1
      expect(sendSpy).toHaveBeenCalledTimes(1);
      sendSpy.mockRestore();
    });
  });
});
