import {
  Body,
  Controller,
  Query,
  Post,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsSummaryService } from './insights-summary.service';

class InsightsRequestDto {
  transcript!: string;
}

@Controller('uiapi/insights')
export class InsightsController {
  constructor(
    private readonly svc: InsightsService,
    private readonly svcSummary: InsightsSummaryService,
  ) {}

  @Post('call')
  async getCallInsights(@Body() body: InsightsRequestDto) {
    if (!body?.transcript || body.transcript.trim().length < 20) {
      throw new BadRequestException(
        'Please provide a transcript (at least ~20 characters).',
      );
    }
    return this.svc.extractInsightsV2(body.transcript);
  }

  @Get('summary')
  async summary(@Query('from') from?: string, @Query('to') to?: string) {
    if (!from || !to)
      throw new BadRequestException('from and to are required (ISO date/time)');
    return this.svcSummary.getMetricsSummary(new Date(from), new Date(to));
  }

  @Post('summary/narrative')
  async narrative(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('filterKey') filterKey?: string,
  ) {
    if (!from || !to)
      throw new BadRequestException('from and to are required (ISO date/time)');
    return this.svcSummary.getNarrativeSummary(
      new Date(from!),
      new Date(to!),
      filterKey ?? 'all',
    );
  }

  @Get('summary/narratives')
  async narratives(
    @Query('limit') limit?: string,
    @Query('filterKey') filterKey?: string,
  ) {
    return this.svcSummary.listNarratives({
      limit: Math.min(parseInt(limit ?? '20', 10), 200),
      filterKey: filterKey ?? 'all',
    });
  }
}
