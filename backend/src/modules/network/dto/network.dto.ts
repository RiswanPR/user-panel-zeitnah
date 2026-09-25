import { IsString, IsOptional } from 'class-validator';

export class SendConnectionRequestDto {
  @IsString()
  recipientId: string;
}

export class QueryPeopleDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  discipline?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  skill?: string;

  @IsOptional()
  @IsString()
  software?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  minExperience?: number;

  @IsOptional()
  maxExperience?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
