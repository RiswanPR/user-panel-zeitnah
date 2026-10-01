import {
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsNotReservedEmailDomain } from '../../../common/utils/email-validation.util';

export class CreateCourseEnquiryDto {
  @IsMongoId()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  courseName!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotReservedEmailDomain()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  message?: string;
}
