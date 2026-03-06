import { Module } from '@nestjs/common';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionOpenAiService } from './transcriptionOpenAi.service';
import { TranscriptionDeepgramService } from './transcriptionDeepgram.service';

@Module({
  controllers: [TranscriptionController],
  providers: [TranscriptionOpenAiService, TranscriptionDeepgramService],
})
export class TranscriptionModule {}
