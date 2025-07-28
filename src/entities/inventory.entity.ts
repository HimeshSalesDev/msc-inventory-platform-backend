import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('inventory')
export class Inventory {
  @ApiProperty({
    description: 'Unique identifier for the inventory item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Stock Keeping Unit - unique identifier for the product',
    example: 'SKU-001',
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_inventory_sku', { unique: true })
  sku: string;

  @ApiProperty({
    description: 'Vendor description of the product',
    example: 'High-quality foam material',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  vendorDescription?: string;

  @ApiProperty({
    description:
      'Length measurement (up to 7 digits before decimal, 6 decimal places)',
    example: 1234.56789,
  })
  @Column({ type: 'decimal', precision: 13, scale: 6 })
  length: number;

  @ApiProperty({
    description:
      'Width measurement (up to 7 digits before decimal, 6 decimal places)',
    example: 123.456789,
    required: false,
  })
  @Column({ type: 'decimal', precision: 13, scale: 6, nullable: true })
  width?: number;

  @ApiProperty({
    description:
      'Radius measurement (up to 7 digits before decimal, 6 decimal places)',
    example: 12.345678,
    required: false,
  })
  @Column({ type: 'decimal', precision: 13, scale: 6, nullable: true })
  radius?: number;

  @ApiProperty({
    description:
      'Skirt measurement (up to 7 digits before decimal, 6 decimal places)',
    example: 5.123456,
  })
  @Column({ type: 'decimal', precision: 13, scale: 6 })
  skirt: number;

  @ApiProperty({
    description: 'Taper specification',
    example: 'Standard',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  taper?: string;

  @ApiProperty({
    description:
      'Foam density measurement (up to 7 digits before decimal, 6 decimal places)',
    example: 25.123456,
  })
  @Column({ type: 'decimal', precision: 13, scale: 6 })
  foamDensity: number;

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
      'Total quantity available (supports very large values up to bigint limit)',
    example: 1000000,
    required: false,
  })
  @Column({ type: 'bigint', nullable: true })
  quantity?: string; // Use string here to safely store bigints

  @ApiProperty({
    description:
      'Quantity that has been allocated (supports very large values up to bigint limit)',
    example: 250000,
    required: false,
  })
  @Column({ type: 'bigint', nullable: true })
  allocatedQuantity?: string; // Use string here to safely store bigints

  @ApiProperty({
    description:
      'Quantity currently in hand (supports very large values up to bigint limit)',
    example: 750000,
    required: false,
  })
  @Column({ type: 'bigint', nullable: true })
  inHandQuantity?: string; // Use string here to safely store bigints

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
}
