import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TranscriptionOpenAiService } from './transcriptionOpenAi.service';
import { TranscriptionDeepgramService } from './transcriptionDeepgram.service';

@Controller('uiapi/transcription')
export class TranscriptionController {
  constructor(
    private readonly svcOa: TranscriptionOpenAiService,
    private readonly svcDg: TranscriptionDeepgramService,
  ) {}

  @Post('call')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeCall(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Missing file field "file"');
    const result = await this.svcOa.transcribeBuffer(file);
    return result; // { text, ... }
  }

  @Post('call-url')
  async transcribeCallUrl(@Body() body: { url?: string }) {
    if (!body?.url) throw new BadRequestException('Missing body field "url"');
    return this.svcDg.transcribeUrl(body.url);
  }
}
