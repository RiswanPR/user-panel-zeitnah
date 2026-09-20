import { IsOptional, IsObject } from 'class-validator';

export class UpdateChannelPreferenceDto {
  @IsOptional()
  inApp?: boolean;

  @IsOptional()
  email?: boolean;

  @IsOptional()
  push?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsObject()
  social?: UpdateChannelPreferenceDto;

  @IsOptional()
  @IsObject()
  learning?: UpdateChannelPreferenceDto;

  @IsOptional()
  @IsObject()
  course?: UpdateChannelPreferenceDto;

  @IsOptional()
  @IsObject()
  achievement?: UpdateChannelPreferenceDto;

  @IsOptional()
  @IsObject()
  community?: UpdateChannelPreferenceDto;

  @IsOptional()
  @IsObject()
  organization?: UpdateChannelPreferenceDto;

  @IsOptional()
  @IsObject()
  opportunity?: UpdateChannelPreferenceDto;

  @IsOptional()
  @IsObject()
  announcement?: UpdateChannelPreferenceDto;

  // Note: Security preferences cannot disable inApp or email
  @IsOptional()
  @IsObject()
  security?: {
    push?: boolean;
  };
}
