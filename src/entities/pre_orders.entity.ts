import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ProductionBatch } from './production_batches.entity';

export enum PreOrderStatusEnums {
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@Entity('pre_orders')
export class PreOrder {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Stock Keeping Unit', example: 'SKU-123' })
  @Column({ type: 'varchar', length: 100 })
  sku: string;

  @ApiProperty({ description: 'Total quantity ordered', example: 100 })
  @Column({ type: 'int', unsigned: true })
  totalQuantity: number;

  @ApiProperty({ description: 'User who created the order' })
  @Column({ name: 'created_by' })
  createdBy: string;

  @ApiProperty({
    description: 'Order status',
    enum: PreOrderStatusEnums,
  })
  @Column({ type: 'varchar', length: 20, default: PreOrderStatusEnums.Active })
  status: string;

  @ApiProperty({
    description: 'Purchase Order number',
    example: 'PO-2024-001',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  poNumber?: string;

  @ApiProperty({
    description:
      'Length measurement (max 6 digits total, with 3 decimal places, e.g. 999.999)',
    example: 123.456,
  })
  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  length?: number;

  @ApiProperty({
    description:
      'Width measurement (max 6 digits total, with 3 decimal places, e.g. 999.999)',
    example: 45.789,
    required: false,
  })
  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  width?: number;

  @ApiProperty({
    description:
      'Radius measurement (max 6 digits total, with 3 decimal places, e.g. 999.999)',
    example: 67.321,
    required: false,
  })
  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  radius?: number;

  @ApiProperty({
    description:
      'Skirt measurement (max 6 digits total, with 3 decimal places, e.g. 999.999)',
    example: 89.123,
  })
  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  skirt?: number;

  @ApiProperty({
    description: 'Taper specification',
    example: 'Standard',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  taper?: string;

  @ApiProperty({
    description:
      'Foam density (max 6 digits total, with 3 decimal places, e.g. 999.999)',
    example: 25.123,
  })
  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  foamDensity?: number;

  @ApiProperty({
    description: 'Strip insert specification',
    example: 'Type A',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripInsert?: string;

  @ApiProperty({
    description: 'Shape of the inventory item',
    example: 'Circular',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  shape?: string;

  @ApiProperty({
    description: 'Material number identifier',
    example: 'MAT-001',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  materialNumber?: string;

  @ApiProperty({
    description: 'Type of material',
    example: 'Foam',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  materialType?: string;

  @ApiProperty({
    description: 'Color of the material',
    example: 'Blue',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  materialColor?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => ProductionBatch,
    (productionBatch) => productionBatch.preOrder,
  )
  productionBatch: ProductionBatch[];
}
