import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  Index,
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

  // Always keep the full raw JSON from the LLM
  @Column({ type: 'nvarchar', length: 'MAX' })
  json!: string;

  @Column({ type: 'varchar', length: 50, default: 'v1' })
  extractorVersion!: string;

  // --- Existing accelerator columns ---
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  summary_short!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  summary_detailed!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  primary_intent!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  resolution_status!: string | null;

  @Column({ type: 'float', nullable: true })
  sentiment_overall!: number | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  risk_flags_json!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  action_items_json!: string | null;

  // --- New fields for your upgraded prompt ---
  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  contact_disposition!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  conversation_type!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  topics_json!: string | null; // JSON array of strings

  @Index()
  @Column({ type: 'varchar', length: 20, nullable: true })
  interest_level!: string | null; // high|medium|low|unknown

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  objections_json!: string | null; // JSON array of strings

  @Index()
  @Column({ type: 'bit', nullable: true })
  dealer_contact_required!: boolean | null;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  dealer_name_if_mentioned!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  agent_coaching_json!: string | null; // JSON object

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  data_quality_json!: string | null; // JSON object

  @CreateDateColumn()
  createdAt!: Date;
}
