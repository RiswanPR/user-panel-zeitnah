import {
  IsEmail,
  IsString,
} from 'class-validator';

export class RegisterSendOtpDto {

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

}