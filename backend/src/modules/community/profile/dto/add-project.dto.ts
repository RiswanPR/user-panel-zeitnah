import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
} from 'class-validator';

export class AddProjectDto {
  @ApiProperty({ example: 'Zeitnah Community Platform' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'A social learning network for students' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['React', 'NestJS', 'MongoDB'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'https://github.com/org/repo' })
  @IsOptional()
  @IsUrl({}, { message: 'GitHub URL must be a valid web address' })
  githubUrl?: string;

  @ApiPropertyOptional({ example: 'https://zeitnah.app' })
  @IsOptional()
  @IsUrl({}, { message: 'Live Demo URL must be a valid web address' })
  liveDemoUrl?: string;

  @ApiPropertyOptional({ example: ['https://s3.amazonaws.com/image.png'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

export class UpdateProjectDto extends PartialType(AddProjectDto) {}
