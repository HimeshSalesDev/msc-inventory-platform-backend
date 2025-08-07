import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

export enum InventoryReferenceStatus {
  CREATED = 'CREATED',
  DELIVERED = 'DELIVERED',
  IN_TRANSIT = 'IN_TRANSIT',
  CANCELLED = 'CANCELLED',
}
@Entity()
export class InventoryReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  type: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  number: string;

  @ApiProperty({
    description: 'Stock Keeping Unit',
    example: 'SKU-001',
  })
  @Column({ type: 'varchar', length: 255 })
  @Index('idx_inventory_reference_sku')
  sku: string;

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
    description: 'Status of the inventory reference',
    enum: InventoryReferenceStatus,
    example: InventoryReferenceStatus.CREATED,
  })
  @Column({
    type: 'enum',
    enum: InventoryReferenceStatus,
    default: InventoryReferenceStatus.CREATED,
  })
  status: InventoryReferenceStatus;
}
