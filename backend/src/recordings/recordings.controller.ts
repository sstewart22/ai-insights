import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { RecordingsService } from './recordings.service';

@Controller('uiapi/recordings')
export class RecordingsController {
  constructor(private readonly svc: RecordingsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.svc.list({
      status: status as any,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post()
  create(@Body() body: { recordingUrl: string; provider?: string }) {
    return this.svc.createRecording(
      body.recordingUrl,
      body.provider ?? 'manual',
    );
  }

  @Post(':id/transcribe')
  transcribe(@Param('id') id: string) {
    return this.svc.transcribeRecordingById(id);
  }

  @Post(':id/insights')
  insights(@Param('id') id: string) {
    return this.svc.generateInsightsById(id);
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

  @Get('summary')
  summary() {
    return this.svc.summaryByStatus();
  }

  @Post('batch/transcribe')
  batchTranscribe(@Query('limit') limit?: string) {
    return this.svc.batchTranscribe(parseInt(limit ?? '10', 10));
  }

  @Post('batch/insights')
  batchInsights(@Query('limit') limit?: string) {
    return this.svc.batchInsights(parseInt(limit ?? '10', 10));
  }
}
