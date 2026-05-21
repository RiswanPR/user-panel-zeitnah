import {
  IsEmail,
  IsString,
  IsOptional,
} from 'class-validator';

export class RegisterVerifyOtpDto {

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  otp!: string;

  @IsString()
  deviceId!: string;

  @IsString()
  deviceType!: string;

  @IsOptional()
  forceLogin?: boolean;

}