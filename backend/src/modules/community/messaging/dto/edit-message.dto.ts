import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class EditMessageDto {
  @ApiProperty({ example: 'Updated message content' })
  @IsString()
  @IsNotEmpty({ message: 'Empty messages are rejected' })
  @MaxLength(5000, { message: 'Maximum text length is 5,000 characters' })
  content: string;
}
