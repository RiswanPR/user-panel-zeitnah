import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    example: 'usr_12345678',
    description: 'Target user ID for direct message',
  })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
