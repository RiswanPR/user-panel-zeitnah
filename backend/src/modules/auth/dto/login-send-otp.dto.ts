import {
  IsEmail,
  IsNotEmpty,
} from 'class-validator';

import { Transform }
from 'class-transformer';

export class LoginSendOtpDto {

  @IsNotEmpty()

  @IsEmail()

  @Transform(
    ({ value }) =>
      value.trim().toLowerCase(),
  )

  email!: string;

}