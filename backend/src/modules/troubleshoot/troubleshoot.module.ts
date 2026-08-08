import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TroubleshootController } from './troubleshoot.controller';
import { TroubleshootService } from './troubleshoot.service';
import {
  TroubleshootReport,
  TroubleshootReportSchema,
} from './schemas/error-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TroubleshootReport.name,
        schema: TroubleshootReportSchema,
      },
    ]),
  ],
  controllers: [TroubleshootController],
  providers: [TroubleshootService],
  exports: [TroubleshootService],
})
export class TroubleshootModule {}
