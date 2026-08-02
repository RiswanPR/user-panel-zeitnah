import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PresenceStatus } from '../schemas/user-presence.schema';

export class PresenceDto {
  @ApiProperty({ enum: PresenceStatus, example: PresenceStatus.ONLINE })
  @IsEnum(PresenceStatus)
  status: PresenceStatus;
}
