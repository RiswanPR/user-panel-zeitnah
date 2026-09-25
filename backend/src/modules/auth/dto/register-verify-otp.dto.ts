import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterVerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @IsNotEmpty()
  otp!: string;

  // DEVICE ID
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  // DEVICE TYPE
  @IsString()
  @IsNotEmpty()
  deviceType!: string;

  // BROWSER
  @IsString()
  @IsNotEmpty()
  browser!: string;

  // OPERATING SYSTEM
  @IsString()
  @IsNotEmpty()
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
