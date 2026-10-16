import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
} from 'class-validator';

export const SUPPORT_CATEGORIES = [
  'ACCOUNT_LOGIN',
  'ACCOUNT_RECOVERY',
  'COURSE_ACCESS',
  'VIDEO_PLAYBACK',
  'PAYMENTS_ENROLLMENT',
  'PROFILE_SETTINGS',
  'NOTIFICATIONS',
  'TECHNICAL_ISSUE',
  'ACCOUNT_DELETION',
  'OTHER',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @IsIn(SUPPORT_CATEGORIES, {
    message: 'Category must be one of the recognized support topics.',
  })
  category: SupportCategory;

  @IsString()
  @MinLength(3, { message: 'Subject must be at least 3 characters.' })
  @MaxLength(150, { message: 'Subject cannot exceed 150 characters.' })
  subject: string;

  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters.' })
  @MaxLength(3000, { message: 'Message cannot exceed 3000 characters.' })
  message: string;

  // Spam prevention honeypot (must remain empty for human submissions)
  @IsOptional()
  @IsString()
  websiteUrl?: string;
}
