import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum CustomOrdersStatusEnum {
  CREATED = 'created',
  DISPATCHED = 'dispatched',
  DELIVERED = 'delivered',
}

@Entity('custom_orders')
export class CustomOrders {
  @ApiProperty({
    description: 'Unique identifier for the orders',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Stock Keeping Unit - identifier for the product',
    example: 'SKU-001',
  })
  @Index()
  @Column({ type: 'varchar', length: 255 })
  sku: string;

  @ApiProperty({
    description:
      'Total quantity (supports very large values up to bigint limit)',
    example: '100',
    required: false,
    nullable: true,
  })
  @Column({ type: 'bigint', nullable: true })
  quantity?: string; // bigint values stored as string

  @Index()
  @Column({ type: 'varchar', length: 255 })
  status: string;

  @ApiProperty({
    description: 'Date when the record was created',
    example: '2024-01-15T10:30:00Z',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the record was last updated',
    example: '2024-01-15T10:30:00Z',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Date when the record was deleted',
    example: '2024-01-15T10:30:00Z',
    required: false,
    nullable: true,
  })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
