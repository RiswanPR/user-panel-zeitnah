import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  ValidateNested,
  Matches,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinksDto {
  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  @IsOptional()
  @IsUrl({}, { message: 'GitHub URL must be a valid web address' })
  github?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  @IsOptional()
  @IsUrl({}, { message: 'LinkedIn URL must be a valid web address' })
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://twitter.com/johndoe' })
  @IsOptional()
  @IsUrl({}, { message: 'Twitter URL must be a valid web address' })
  twitter?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.com' })
  @IsOptional()
  @IsUrl({}, { message: 'Website URL must be a valid web address' })
  website?: string;
}

export class CreateProfileDto {
  @ApiProperty({ example: 'john_doe', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Username can only contain alphanumeric characters, underscores, hyphens, and dots',
  })
  username: string;

  @ApiPropertyOptional({ example: 'Full Stack Engineer | React & NestJS' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({ example: 'Passionate about building scalable applications' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'NIT Calicut' })
  @IsOptional()
  @IsString()
  college?: string;

  @ApiPropertyOptional({ example: 'Computer Science and Engineering' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: '2025' })
  @IsOptional()
  @IsString()
  batchYear?: string;

  @ApiPropertyOptional({ type: SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}
