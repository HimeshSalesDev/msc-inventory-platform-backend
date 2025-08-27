import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum AuditLogType {
  LOGIN = 'login',
  LOGOUT = 'logout',

  ADD_INVENTORY = 'add_inventory',
  UPDATE_INVENTORY = 'update_inventory',
  DELETE_INVENTORY = 'delete_inventory',

  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',

  ADD_INBOUND = 'add_inbound',
  UPDATE_INBOUND = 'update_inbound',
  DELETE_INBOUND = 'delete_inbound',

  ADD_INVENTORY_LOCATION = 'add_inventory_location',
  UPDATE_INVENTORY_LOCATION = 'update_inventory_location',
  DELETE_INVENTORY_LOCATION = 'delete_inventory_location',

  ADD_INVENTORY_REFERENCE = 'add_inventory_reference',
  UPDATE_INVENTORY_REFERENCE = 'update_inventory_reference',
  DELETE_INVENTORY_REFERENCE = 'delete_inventory_reference',

  UPDATE_INBOUND_PRE_ORDER = 'update_inbound_pre_order',
}

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index() // add index for faster lookups
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @Index()
  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json', nullable: true, name: 'previous_data' })
  previousData: Record<string, any> | null;

  @Column({ type: 'json', nullable: true, name: 'updated_data' })
  updatedData: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'entity_name' })
  entityName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'entity_id' })
  entityId: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
