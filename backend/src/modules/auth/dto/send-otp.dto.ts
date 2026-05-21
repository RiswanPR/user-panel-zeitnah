import {
  IsEmail,
  IsNotEmpty,
} from 'class-validator';

import { Transform }
from 'class-transformer';

export class SendOtpDto {

  @IsNotEmpty()

  @IsEmail()

  @Transform(
    ({ value }) =>
      value.trim().toLowerCase(),
  )

  email!: string;

}