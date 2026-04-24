import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'prompt_template_history', schema: 'app' })
@Index(['promptTemplateId', 'version'])
export class PromptTemplateHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uniqueidentifier' })
  promptTemplateId!: string;

  @Column({ type: 'varchar', length: 200 })
  key!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'nvarchar', length: 'MAX' })
  body!: string;

  @Column({ type: 'nvarchar', length: 200 })
  label!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  notes!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;
}
