import { IsEmail, IsNotEmpty } from 'class-validator';

import { Transform } from 'class-transformer';

export class LoginSendOtpDto {
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
