import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightsSummaryService } from './insights-summary.service';

import { CallInsight } from '../db/entities/call-insight.entity';
import { CallRecording } from '../db/entities/call-recording.entity';
import { InsightSummary } from '../db/entities/insight-summary.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallInsight, CallRecording, InsightSummary]),
  ],
  controllers: [InsightsController],
  providers: [InsightsService, InsightsSummaryService],
})
export class InsightsModule {}
