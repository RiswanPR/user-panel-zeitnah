import { IsString, IsOptional } from 'class-validator';

export class QueryOpportunitiesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  workMode?: string;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  skill?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class QueryOrganizationsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
