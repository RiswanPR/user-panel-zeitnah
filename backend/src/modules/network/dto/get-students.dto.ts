import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetStudentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  course?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  institution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  interest?: string;

  @IsOptional()
  @IsString()
  @IsIn(['recommended', 'recent', 'name'])
  sort?: 'recommended' | 'recent' | 'name' = 'recommended';
}
