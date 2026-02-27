import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RecordingStatus =
  | 'pending_transcription'
  | 'transcribing'
  | 'transcribed'
  | 'insights_pending'
  | 'insights_done'
  | 'error';

@Entity({ name: 'call_recordings' })
export class CallRecording {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, default: 'telnyx' })
  provider!: string; // telnyx | thirdparty | manual

  @Column({ type: 'varchar', length: 2048, nullable: true })
  recordingUrl!: string | null; // if you store a URL (Telnyx/3rd party)

  @Column({ type: 'varchar', length: 1024, nullable: true })
  storageKey!: string | null; // if you store in S3/local and reference key

  @Column({ type: 'varchar', length: 50, default: 'pending_transcription' })
  status!: RecordingStatus;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  lastError!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
