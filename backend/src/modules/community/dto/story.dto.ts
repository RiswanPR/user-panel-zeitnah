import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsUrl,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoryType } from '../domain/story.model';

export class CreateStoryDto {
  @ApiProperty({ enum: StoryType })
  @IsEnum(StoryType)
  @IsNotEmpty()
  type: StoryType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(300)
  text?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courseTag?: string;

  // Media details if it's an image or video
  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mediaType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  mediaDuration?: number;
}

export class StoryReplyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}
