import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TroubleshootController } from './troubleshoot.controller';
import { TroubleshootService } from './troubleshoot.service';
import {
  ErrorReport,
  ErrorReportSchema,
} from './schemas/error-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ErrorReport.name,
        schema: ErrorReportSchema,
      },
    ]),
  ],
  controllers: [TroubleshootController],
  providers: [TroubleshootService],
  exports: [TroubleshootService],
})
export class TroubleshootModule {}
