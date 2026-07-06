import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsUrl,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import sanitizeHtml from 'sanitize-html';
import { PostType, PostAudience } from '../domain/post.model';

export class CreatePostMediaDto {
  @ApiProperty()
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string; // image, video, document

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  size?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mimeType?: string;
}

export class CreatePollOptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  text: string;
}

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  @Transform(({ value }) =>
    sanitizeHtml(value, {
      allowedTags: [
        'b',
        'i',
        'em',
        'strong',
        'a',
        'p',
        'br',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
      ],
      allowedAttributes: { a: ['href', 'target', 'rel'] },
    }),
  )
  content: string;

  @ApiProperty({ enum: PostType })
  @IsEnum(PostType)
  @IsNotEmpty()
  type: PostType;

  @ApiProperty({ enum: PostAudience })
  @IsEnum(PostAudience)
  @IsNotEmpty()
  audience: PostAudience;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courseId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiPropertyOptional({ type: [CreatePostMediaDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMediaDto)
  media?: CreatePostMediaDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pollQuestion?: string;

  @ApiPropertyOptional({ type: [CreatePollOptionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePollOptionDto)
  pollOptions?: CreatePollOptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  pollExpiresAt?: Date;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  mentions?: string[];
}

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? sanitizeHtml(value, {
          allowedTags: [
            'b',
            'i',
            'em',
            'strong',
            'a',
            'p',
            'br',
            'ul',
            'ol',
            'li',
            'h1',
            'h2',
            'h3',
          ],
          allowedAttributes: { a: ['href', 'target', 'rel'] },
        })
      : value,
  )
  content?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}

export class ReactionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string; // like, love, celebrate, insightful
}
