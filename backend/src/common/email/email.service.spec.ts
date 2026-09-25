/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { EmailService } from './email.service';
import { ResendEmailProvider } from './resend-email.provider';
import { EmailProvider } from './email-provider.interface';

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
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-12345');
    expect(mockResendProvider.sendEmail).toHaveBeenCalledTimes(1);
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
      to: 'user@example.com',
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
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      }),
    ).rejects.toThrow(BadRequestException);

    try {
      await emailService.sendEmail({
        to: 'user@example.com',
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
});
