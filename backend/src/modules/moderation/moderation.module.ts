import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Block, BlockSchema } from './schemas/block.schema';
import { Report, ReportSchema } from './schemas/report.schema';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Block.name, schema: BlockSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  providers: [ModerationService],
  controllers: [ModerationController],
  exports: [ModerationService],
})
export class ModerationModule {}
