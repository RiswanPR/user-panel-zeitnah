import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';

import { Transform } from 'class-transformer';

export class LoginVerifyOtpDto {
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp!: string;

  @IsNotEmpty()
  @IsString()
  deviceId!: string;

  @IsNotEmpty()
  @IsString()
  deviceType!: string;

  // BROWSER
  @IsNotEmpty()
  @IsString()
  browser!: string;

  // OPERATING SYSTEM
  @IsNotEmpty()
  @IsString()
  os!: string;

  // IP ADDRESS
  @IsOptional()
  @IsString()
  ip?: string;

  // LOCATION
  @IsOptional()
  @IsString()
  location?: string;

  // FORCE LOGIN
  @IsOptional()
  @IsBoolean()
  forceLogin?: boolean;
}
