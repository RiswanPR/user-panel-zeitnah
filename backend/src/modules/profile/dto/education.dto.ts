import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class EducationDto {
  @IsString()
  @IsNotEmpty({ message: 'Institution name is required.' })
  @MaxLength(120, { message: 'Institution must not exceed 120 characters.' })
  institution!: string;

  @IsString()
  @IsNotEmpty({ message: 'Qualification or degree is required.' })
  @MaxLength(100, { message: 'Qualification must not exceed 100 characters.' })
  qualification!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Field of study must not exceed 100 characters.' })
  fieldOfStudy?: string;

  @IsDateString({}, { message: 'Valid start date is required.' })
  startDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date.' })
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  currentlyStudying?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters.' })
  description?: string;
}
