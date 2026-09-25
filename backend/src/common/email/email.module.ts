import { Global, Module } from '@nestjs/common';
import { ResendEmailProvider } from './resend-email.provider';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [ResendEmailProvider, EmailService],
  exports: [EmailService, ResendEmailProvider],
})
export class EmailModule {}
