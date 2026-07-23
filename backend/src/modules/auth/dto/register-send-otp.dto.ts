import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterSendOtpDto {
  @IsString()
  name!: string;

  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
