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

export class AudioConfigDto {
  @ApiPropertyOptional({ enum: ['ORIGINAL_ONLY', 'MUSIC_ONLY', 'MIXED'] })
  @IsEnum(['ORIGINAL_ONLY', 'MUSIC_ONLY', 'MIXED'])
  @IsOptional()
  audioMode?: 'ORIGINAL_ONLY' | 'MUSIC_ONLY' | 'MIXED';

  @ApiPropertyOptional({ enum: ['ORIGINAL', 'MUSIC'] })
  @IsEnum(['ORIGINAL', 'MUSIC'])
  @IsOptional()
  sourceType?: 'ORIGINAL' | 'MUSIC';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  musicId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  musicTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  musicArtist?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  musicCoverUrl?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sourceStart?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sourceEnd?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  originalVolume?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  musicVolume?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  originalAudioName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  attributionText?: string;
}

export class EditorLayerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ enum: ['TEXT', 'STICKER', 'CAPTION'] })
  @IsEnum(['TEXT', 'STICKER', 'CAPTION'])
  type: 'TEXT' | 'STICKER' | 'CAPTION';

  @ApiProperty()
  @IsNumber()
  start: number;

  @ApiProperty()
  @IsNumber()
  end: number;

  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  scale?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  rotation?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  opacity?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(300)
  content?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fontFamily?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  fontSize?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fontWeight?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  textAlign?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  backgroundOpacity?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  shadow?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  stickerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  style?: string;
}

export class EditorConfigDto {
  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  version?: number;

  @ApiProperty({ type: () => [EditorLayerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditorLayerDto)
  layers: EditorLayerDto[];
}

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

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  posterUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  processedUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mediaId?: string;

  @ApiPropertyOptional({ type: () => AudioConfigDto })
  @ValidateNested()
  @Type(() => AudioConfigDto)
  @IsOptional()
  audioConfig?: AudioConfigDto;

  @ApiPropertyOptional({ type: () => EditorConfigDto })
  @ValidateNested()
  @Type(() => EditorConfigDto)
  @IsOptional()
  editorConfig?: EditorConfigDto;
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
  organizationId?: string;

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
  tags?: string[];

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
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

export class QuotePostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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
  content: string;

  @ApiPropertyOptional({ enum: PostAudience })
  @IsEnum(PostAudience)
  @IsOptional()
  audience?: PostAudience;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courseId?: string;
}
