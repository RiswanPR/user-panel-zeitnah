import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FollowUserDto {
  @ApiPropertyOptional({ example: 'Optional follow context or note' })
  @IsOptional()
  @IsString()
  note?: string;
}
