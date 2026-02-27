import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CallRecording } from './call-recording.entity';

@Entity({ name: 'call_insights' })
export class CallInsight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CallRecording, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordingId' })
  recording!: CallRecording;

  @Column({ type: 'uniqueidentifier' })
  recordingId!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  json!: string; // store as string; later you can use JSON columns if desired

  @Column({ type: 'varchar', length: 50, default: 'v1' })
  extractorVersion!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
