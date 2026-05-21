import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';

import { Transform }
from 'class-transformer';

export class LoginVerifyOtpDto {

  @IsNotEmpty()

  @IsEmail()

  @Transform(
    ({ value }) =>
      value.trim().toLowerCase(),
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

  @IsOptional()

  @IsBoolean()

  forceLogin?: boolean;

}