import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
} from 'class-validator';
import { MessageType } from '../schemas/message.schema';

export class SendMessageDto {
  @ApiProperty({ example: 'conv_12345' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiPropertyOptional({
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiProperty({ example: 'Hello! Check out this project demo.' })
  @IsString()
  @MaxLength(5000, { message: 'Maximum text length is 5,000 characters' })
  content: string;

  @ApiPropertyOptional({ example: 'msg_98765' })
  @IsOptional()
  @IsString()
  replyTo?: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/image.png' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'Architecture_Diagram.png' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 1048576 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'typescript' })
  @IsOptional()
  @IsString()
  codeLanguage?: string;

  @ApiPropertyOptional({ example: { courseId: 'crs_123', title: 'NestJS Architecture' } })
  @IsOptional()
  @IsObject()
  sharedMetadata?: Record<string, any>;
}
