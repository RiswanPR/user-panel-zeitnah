import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadResumeDto {
  @ApiPropertyOptional({ example: 'John_Doe_Resume_2026.pdf' })
  @IsOptional()
  @IsString()
  title?: string;
}
