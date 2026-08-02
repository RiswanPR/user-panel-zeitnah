import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUrl,
} from 'class-validator';

export class AddCertificateDto {
  @ApiProperty({ example: 'AWS Certified Solutions Architect' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Amazon Web Services' })
  @IsString()
  @IsNotEmpty()
  issuingOrganization: string;

  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  @IsNotEmpty()
  issueDate: string;

  @ApiPropertyOptional({ example: '2028-01-15' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ example: 'AWS-12345678' })
  @IsOptional()
  @IsString()
  credentialId?: string;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/verify/12345678' })
  @IsOptional()
  @IsUrl({}, { message: 'Credential URL must be a valid web address' })
  credentialUrl?: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/cert.png' })
  @IsOptional()
  @IsString()
  certificateImage?: string;
}

export class UpdateCertificateDto extends PartialType(AddCertificateDto) {}
