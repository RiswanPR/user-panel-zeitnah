import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import {
  VerificationCategory,
  VerificationStatus,
} from '../schemas/verification-request.schema';

export class CreateVerificationRequestDto {
  @IsEnum(VerificationCategory)
  category!: VerificationCategory;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  evidenceFiles?: Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    fileKey: string;
    url?: string;
    uploadedAt?: Date;
  }>;
}

export class ReviewVerificationRequestDto {
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  validUntil?: string | Date;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  affiliation?: string;
}
