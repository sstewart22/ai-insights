import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  DeleteDateColumn,
  Generated,
  Index,
} from 'typeorm';

@Index(['refId'])
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'ref_id', type: 'int', unique: true })
  @Generated('increment')
  refId: number;

  @CreateDateColumn({
    type: 'datetime2',
    name: 'created',
    default: () => 'GETDATE()',
  })
  created: Date;

  @UpdateDateColumn({
    type: 'datetime2',
    name: 'modified',
    default: () => 'GETDATE()',
  })
  modified: Date;

  @Column({
    type: 'bit',
    name: 'is_active',
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'uniqueidentifier',
    name: 'created_by_id',
    nullable: true,
  })
  createdById: string | null;

  @Column({
    type: 'uniqueidentifier',
    name: 'modified_by_id',
    nullable: true,
  })
  modifiedById: string | null;

  @DeleteDateColumn({
    type: 'datetime2',
    name: 'deleted_date_time',
    nullable: true,
  })
  deletedDateTime?: Date | null;
}
