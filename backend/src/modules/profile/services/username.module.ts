import { Module } from '@nestjs/common';
import { UsernameService } from './username.service';

@Module({
  providers: [UsernameService],
  exports: [UsernameService],
})
export class UsernameModule {}
