import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string; // For replies

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  mentions?: string[];
}

export class UpdateCommentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
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
