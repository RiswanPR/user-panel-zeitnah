import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TypingDto {
  @ApiProperty({ example: 'conv_12345' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
