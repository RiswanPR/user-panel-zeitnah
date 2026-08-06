import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class AddEducationDto {
  @ApiProperty({ example: 'NIT Calicut' })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({ example: 'Bachelor of Technology' })
  @IsString()
  @IsNotEmpty()
  degree: string;

  @ApiPropertyOptional({ example: 'Computer Science & Engineering' })
  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @ApiProperty({ example: '2021-08-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({ example: '2025-05-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '8.8 CGPA' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ example: 'President of Coding Club' })
  @IsOptional()
  @IsString()
  activities?: string;
}

export class UpdateEducationDto extends PartialType(AddEducationDto) {}
