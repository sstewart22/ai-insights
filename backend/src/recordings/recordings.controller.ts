import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { normalizeProvider } from '../insights/helpers/provider.helper';

class RecordingInsightsDto {
  provider?: string;
}

class BatchInsightsDto {
  provider?: string;
}

@Controller('uiapi/recordings')
export class RecordingsController {
  constructor(private readonly svc: RecordingsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('limit') limit?: string) {
    const parsedLimit = parseInt(limit ?? '50', 10);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return this.svc.list({
      status: status as any,
      limit: Math.min(parsedLimit, 200),
    });
  }

  @Post()
  create(@Body() body: { recordingUrl: string; provider?: string }) {
    return this.svc.createRecording(
      body.recordingUrl,
      body.provider ?? 'manual',
    );
  }

  @Get('summary')
  summary() {
    return this.svc.summaryByStatus();
  }

  @Post('batch/transcribe')
  batchTranscribe(@Query('limit') limit?: string) {
    const parsedLimit = parseInt(limit ?? '10', 10);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return this.svc.batchTranscribe(Math.min(parsedLimit, 200));
  }

  @Post('batch/insights')
  batchInsights(
    @Query('limit') limit?: string,
    @Body() body?: BatchInsightsDto,
  ) {
    const parsedLimit = parseInt(limit ?? '10', 10);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }

    const provider = normalizeProvider(body?.provider);

    return this.svc.batchInsights(Math.min(parsedLimit, 200), provider);
  }

  @Post(':id/transcribe')
  transcribe(@Param('id') id: string) {
    return this.svc.transcribeRecordingById(id);
  }

  @Post(':id/insights')
  async generateInsights(
    @Param('id') id: string,
    @Body() body: RecordingInsightsDto,
  ) {
    const provider = normalizeProvider(body?.provider);
    return this.svc.generateInsights(id, provider);
  }

  @Get(':id/transcript')
  async getTranscript(@Param('id') id: string) {
    const row = await this.svc.getTranscript(id);
    if (!row) throw new NotFoundException('Transcript not found');
    return row;
  }

  @Get(':id/insight')
  async getInsight(@Param('id') id: string) {
    const row = await this.svc.getInsight(id);
    if (!row) throw new NotFoundException('Insight not found');
    return row;
  }
}
