import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class ExperienceDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization is required.' })
  @MaxLength(100, { message: 'Organization must not exceed 100 characters.' })
  organization!: string;

  @IsString()
  @IsNotEmpty({ message: 'Role is required.' })
  @MaxLength(100, { message: 'Role must not exceed 100 characters.' })
  role!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employmentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsDateString({}, { message: 'Valid start date is required.' })
  startDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date.' })
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  currentlyActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters.' })
  description?: string;
}
