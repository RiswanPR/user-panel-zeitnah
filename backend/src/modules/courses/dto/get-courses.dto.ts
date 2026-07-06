import { IsOptional, IsString } from 'class-validator';

export class GetCoursesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
