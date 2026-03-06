import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'insight_summaries' })
@Index(['fromUtc', 'toUtc', 'filterKey'], { unique: true })
export class InsightSummary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'datetime2' })
  fromUtc!: Date;

  @Column({ type: 'datetime2' })
  toUtc!: Date;

  @Column({ type: 'varchar', length: 200, default: 'all' })
  filterKey!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  metricsJson!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX' })
  narrativeJson!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  model!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
