import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CallRecording } from './call-recording.entity';

@Entity({ name: 'call_transcripts' })
export class CallTranscript {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CallRecording, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordingId' })
  recording!: CallRecording;

  @Column({ type: 'uniqueidentifier' })
  recordingId!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  text!: string;

  @Column({ type: 'varchar', length: 100, default: 'gpt-4o-transcribe' })
  model!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
