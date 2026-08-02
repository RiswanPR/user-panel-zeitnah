import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PinMessageDto {
  @ApiProperty({ example: 'msg_12345' })
  @IsString()
  @IsNotEmpty()
  messageId: string;
}
