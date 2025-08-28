import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum WebHookStatusType {
  RECEIVED = 'received',
  ERROR = 'error',
  STORED = 'stored',
  RETRY_PENDING = 'retry_pending',
  RETRY_SUCCESS = 'retry_success',
}

export enum WebHookLogType {
  ORDER_CONFIRMATION = 'order_confirmation',
  INVENTORY_REFERENCE = 'inventory_reference',
  ORDER_UPDATE = 'order_update',
}

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  type: string;

  @Index()
  @Column({
    type: 'enum',
    enum: WebHookStatusType,
    default: WebHookStatusType.RECEIVED,
  })
  status: WebHookStatusType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'json', nullable: true })
  request: Record<string, any> | null;

  @Column({ type: 'json', nullable: true })
  response: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRetryAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
