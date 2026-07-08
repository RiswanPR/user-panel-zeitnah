import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ErrorReportsController } from './error-reports.controller';
import { ErrorReportsService } from './error-reports.service';
import { ErrorReport, ErrorReportSchema } from './schemas/error-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ErrorReport.name, schema: ErrorReportSchema }]),
  ],
  controllers: [ErrorReportsController],
  providers: [ErrorReportsService],
  exports: [ErrorReportsService],
})
export class ErrorReportsModule {}
