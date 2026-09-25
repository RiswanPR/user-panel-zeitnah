import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CertificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Certificate name is required.' })
  @MaxLength(120, {
    message: 'Certificate name must not exceed 120 characters.',
  })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Issuing organization is required.' })
  @MaxLength(120, { message: 'Issuer must not exceed 120 characters.' })
  issuer!: string;

  @IsDateString({}, { message: 'Valid issue date is required.' })
  issueDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'Expiration date must be a valid date.' })
  expirationDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  credentialId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  credentialUrl?: string;
}
