import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class MarkReadDto {
  @ApiProperty({ example: 'conv_12345' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiPropertyOptional({ example: 'msg_98765' })
  @IsOptional()
  @IsString()
  messageId?: string;
}
