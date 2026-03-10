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
import { normalizeProvider } from './helpers/provider.helper';

class InsightsRequestDto {
  transcript!: string;
  provider?: string;
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

    const provider = normalizeProvider(body.provider);

    return this.svc.extractInsightsV2(body.transcript, provider);
  }

  @Get('summary')
  async summary(@Query('from') from?: string, @Query('to') to?: string) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required (ISO date/time)');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'from and to must be valid ISO date/time values',
      );
    }

    return this.svcSummary.getMetricsSummary(fromDate, toDate);
  }

  @Post('summary/narrative')
  async narrative(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('filterKey') filterKey?: string,
    @Query('provider') providerRaw?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required (ISO date/time)');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'from and to must be valid ISO date/time values',
      );
    }

    const provider = normalizeProvider(providerRaw);

    return this.svcSummary.getNarrativeSummary(
      fromDate,
      toDate,
      filterKey ?? 'all',
      provider,
    );
  }

  @Get('summary/narratives')
  async narratives(
    @Query('limit') limit?: string,
    @Query('filterKey') filterKey?: string,
    @Query('provider') providerRaw?: string,
  ) {
    const parsedLimit = parseInt(limit ?? '20', 10);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }

    const provider = normalizeProvider(providerRaw);

    return this.svcSummary.listNarratives({
      limit: Math.min(parsedLimit, 200),
      filterKey: filterKey ?? 'all',
      provider,
    });
  }
}
