import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ReactMessageDto {
  @ApiProperty({ example: 'msg_12345' })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({ example: '👍' })
  @IsString()
  @IsNotEmpty()
  emoji: string;
}
