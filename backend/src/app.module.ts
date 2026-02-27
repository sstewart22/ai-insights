import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envSchema } from './env.validation';

import { TranscriptionModule } from './transcription/transcription.module';
import { InsightsModule } from './insights/insights.module';
import { RecordingsModule } from './recordings/recordings.module';

import { CallRecording } from './db/entities/call-recording.entity';
import { CallTranscript } from './db/entities/call-transcript.entity';
import { CallInsight } from './db/entities/call-insight.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const opts = {
          type: 'mssql' as const,
          host: cfg.get('DATABASE_HOST', '127.0.0.1'),
          port: parseInt(cfg.get('DATABASE_PORT', '1433'), 10),
          username: cfg.get('DATABASE_USER'),
          password: cfg.get('DATABASE_PASSWORD'),
          database: cfg.get('DATABASE_NAME', 'ai_assist'),
          entities: [CallRecording, CallTranscript, CallInsight],
          synchronize: false, // keep false; use migrations if you want
          logging: false,
          options: {
            encrypt: true,
            trustServerCertificate: true,
            enableArithAbort: true,
          },
        };

        if (opts.type !== 'mssql') throw new Error('NOT MSSQL!');
        return opts;
      },
    }),

    TranscriptionModule,
    InsightsModule,
    RecordingsModule,
  ],
})
export class AppModule {}
