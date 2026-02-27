import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { InsightsService } from './insights.service';

class InsightsRequestDto {
  transcript!: string;
}

@Controller('uiapi/insights')
export class InsightsController {
  constructor(private readonly svc: InsightsService) {}

  @Post('call')
  async getCallInsights(@Body() body: InsightsRequestDto) {
    if (!body?.transcript || body.transcript.trim().length < 20) {
      throw new BadRequestException(
        'Please provide a transcript (at least ~20 characters).',
      );
    }
    return this.svc.extractInsights(body.transcript);
  }
}
