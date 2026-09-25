import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SectionsVisibilityDto {
  @IsOptional()
  @IsBoolean()
  about?: boolean;

  @IsOptional()
  @IsBoolean()
  skills?: boolean;

  @IsOptional()
  @IsBoolean()
  experience?: boolean;

  @IsOptional()
  @IsBoolean()
  projects?: boolean;

  @IsOptional()
  @IsBoolean()
  certifications?: boolean;

  @IsOptional()
  @IsBoolean()
  education?: boolean;

  @IsOptional()
  @IsBoolean()
  courses?: boolean;

  @IsOptional()
  @IsBoolean()
  contact?: boolean;
}

export enum ResumeVisibility {
  PRIVATE = 'PRIVATE',
  RECRUITERS = 'RECRUITERS',
  PUBLIC = 'PUBLIC',
}

export class UpdatePortfolioDto {
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsString()
  customHeadline?: string;

  @IsOptional()
  @IsString()
  customBio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featuredProjectIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featuredSkills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featuredSoftware?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlightedExperienceIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SectionsVisibilityDto)
  sectionsVisibility?: SectionsVisibilityDto;

  @IsOptional()
  @IsEnum(ResumeVisibility)
  resumeVisibility?: ResumeVisibility;
}
