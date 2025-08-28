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

@Entity('inbound')
export class Inbound {
  @ApiProperty({
    description: 'Unique identifier for the inbound record',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Purchase Order number',
    example: 'PO-2024-001',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  poNumber?: string;

  @ApiProperty({
    description: 'Container number for shipping',
    example: 'CONT-12345678',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  containerNumber?: string;

  @ApiProperty({
    description: 'Estimated Time of Departure',
    example: '2024-01-20T00:00:00.000Z',
    required: false,
  })
  @Column({ type: 'date', nullable: true })
  etd?: Date;

  @ApiProperty({
    description: 'Estimated Time of Arrival',
    example: '2024-02-15T00:00:00.000Z',
    required: false,
  })
  @Column({ type: 'date', nullable: true })
  eta?: Date;

  @ApiProperty({
    description: 'Shipped status or date',
    example: '2024-01-21',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  shipped?: string;

  @ApiProperty({
    description: 'Date when goods were offloaded',
    example: '2024-02-16T00:00:00.000Z',
    required: false,
  })
  @Column({ type: 'date', nullable: true })
  offloadedDate?: Date;

  // Include all inventory fields
  @ApiProperty({
    description: 'Stock Keeping Unit - unique identifier for the product',
    example: 'SKU-001',
  })
  @Column({ type: 'varchar', length: 255 })
  @Index('idx_inbound_sku')
  sku: string;

  @ApiProperty({
    description: 'Vendor description of the product',
    example: 'High-quality foam material',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  vendorDescription?: string;

  @ApiProperty({
    description: 'Length measurement ',
    example: '123.456',
  })
  @Column({ type: 'varchar', length: 10, nullable: true })
  length?: string;

  @ApiProperty({
    description: 'Width measurement ',
    example: '45.789',
    required: false,
  })
  @Column({ type: 'varchar', length: 10, nullable: true })
  width?: string;

  @ApiProperty({
    description: 'Radius measurement ',
    example: '67.321',
    required: false,
  })
  @Column({ type: 'varchar', length: 10, nullable: true })
  radius?: string;

  @ApiProperty({
    description: 'Skirt measurement ',
    example: '89.123',
  })
  @Column({ type: 'varchar', length: 10, nullable: true })
  skirt?: string;

  @ApiProperty({
    description: 'Taper specification',
    example: 'Standard',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  taper?: string;

  @ApiProperty({
    description: 'Foam density ',
    example: '25.123',
  })
  @Column({ type: 'varchar', length: 10, nullable: true })
  foamDensity?: string;

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

  @ApiProperty({
    description:
      'Inbound quantity (supports very large values up to bigint limit)',
    example: 1000000,
    required: false,
  })
  @Column({ type: 'bigint', nullable: true })
  quantity?: string; // Use string here to safely store bigints

  @Column({ type: 'bigint', nullable: true, default: '0' })
  scannedQuantity?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'production_batch_id',
  })
  productionBatchId?: string;

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

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
