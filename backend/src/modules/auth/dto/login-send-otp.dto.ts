import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsNotReservedEmailDomain } from '../../../common/utils/email-validation.util';

export class LoginSendOtpDto {
  @IsNotEmpty()
  @IsEmail()
  @IsNotReservedEmailDomain()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
