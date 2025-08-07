import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum InventoryMovementTypeEnums {
  IN = 'IN',
  OUT = 'OUT',
  ADJUST = 'ADJUST',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @ApiProperty({ description: 'Unique identifier for the movement record' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'SKU of the inventory item' })
  @Column()
  sku: string;

  @ApiProperty({
    description: 'Type of inventory movement: IN, OUT, or ADJUST',
    enum: InventoryMovementTypeEnums,
  })
  @Column({ type: 'enum', enum: InventoryMovementTypeEnums })
  type: InventoryMovementTypeEnums;

  @ApiProperty({ description: 'Number of units moved' })
  @Column({
    type: 'int',
    unsigned: true,
  })
  quantity: number;

  @ApiProperty({ description: 'Bin number (nullable)', required: false })
  @Column({ nullable: true })
  binNumber?: string;

  @ApiProperty({ description: 'Warehouse location or physical area' })
  @Column()
  location: string;

  @ApiProperty({
    description: 'Pro number (tracking or reference)',
    required: false,
  })
  @Column({ nullable: true })
  proNumber?: string;

  @ApiProperty({
    description: 'Staff user ID or system trigger (nullable)',
    required: false,
  })
  @Column({ nullable: true })
  userId?: string;

  @ApiProperty({
    description: 'Reason for the movement (optional notes)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  reason?: string;

  @ApiProperty({
    description: 'Date when the record was created',
    example: '2024-01-15T10:30:00Z',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
