import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TranscriptionService } from './transcription.service';

@Controller('uiapi/transcription')
export class TranscriptionController {
  constructor(private readonly svc: TranscriptionService) {}

  @Post('call')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeCall(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Missing file field "file"');
    const result = await this.svc.transcribeBuffer(file);
    return result; // { text, ... }
  }
}
