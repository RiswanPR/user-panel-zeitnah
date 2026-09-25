export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  timeoutMs?: number;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(options: SendEmailOptions): Promise<EmailSendResult>;
}
