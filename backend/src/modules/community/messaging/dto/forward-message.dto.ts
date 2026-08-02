import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ForwardMessageDto {
  @ApiProperty({ example: 'msg_12345' })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({ example: 'conv_target_6789' })
  @IsString()
  @IsNotEmpty()
  targetConversationId: string;
}
