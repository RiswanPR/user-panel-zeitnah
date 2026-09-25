import {
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name must not exceed 100 characters.' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Headline must not exceed 120 characters.' })
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Current role must not exceed 100 characters.' })
  currentRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Location must not exceed 100 characters.' })
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Industry must not exceed 100 characters.' })
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'About must not exceed 1000 characters.' })
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25, { message: 'You can specify at most 25 skills.' })
  @IsString({ each: true, message: 'Each skill must be a string.' })
  @MaxLength(50, {
    each: true,
    message: 'Each skill must not exceed 50 characters.',
  })
  skills?: string[];

  @IsOptional()
  @IsString()
  primaryRole?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  professionalInterests?: string[];

  @IsOptional()
  discoverableToRecruiters?: boolean;

  @IsOptional()
  @IsString()
  profileVisibility?: string;

  @IsOptional()
  mentorship?: {
    topics?: string[];
    expertise?: string[];
    bio?: string;
    available?: boolean;
  };

  @IsOptional()
  recruiterContext?: {
    organizationId?: string;
    hiringInterests?: string[];
    opportunityTypes?: string[];
  };

  @IsOptional()
  educatorContext?: {
    subjects?: string[];
    expertise?: string[];
    institution?: string;
  };
}
