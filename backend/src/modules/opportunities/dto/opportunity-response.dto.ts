import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeclineOpportunityDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
