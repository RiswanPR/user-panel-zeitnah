import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class AddExperienceDto {
  @ApiProperty({ example: 'Google' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty({ example: 'Software Engineer Intern' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional({ example: 'Bangalore, India' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Internship', default: 'Full-time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiProperty({ example: '2025-05-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({ example: '2025-08-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ example: 'Worked on high throughput microservices' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['Go', 'Kubernetes', 'gRPC'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsUsed?: string[];
}

export class UpdateExperienceDto extends PartialType(AddExperienceDto) {}
