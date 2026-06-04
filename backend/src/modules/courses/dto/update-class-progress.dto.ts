import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateClassProgressDto {

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentTimeSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPlayedSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCoveredSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

}
