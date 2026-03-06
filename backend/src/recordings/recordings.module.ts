import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallRecording } from '../db/entities/call-recording.entity';
import { CallTranscript } from '../db/entities/call-transcript.entity';
import { CallInsight } from '../db/entities/call-insight.entity';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';
import { InsightsService } from '../insights/insights.service';
import { TranscriptionDeepgramService } from '../transcription/transcriptionDeepgram.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallRecording, CallTranscript, CallInsight]),
  ],
  controllers: [RecordingsController],
  providers: [RecordingsService, InsightsService, TranscriptionDeepgramService],
})
export class RecordingsModule {}
