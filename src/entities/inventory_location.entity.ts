import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Inventory } from './inventory.entity';

@Entity('inventory_locations')
@Index('idx_inventory_location_inventory_bin', ['inventoryId', 'binNumber'])
@Index('idx_inventory_location_composite', ['inventoryId', 'location'])
export class InventoryLocation {
  @ApiProperty({
    description: 'Unique identifier for the inventory location record',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Reference to the inventory item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Column({ type: 'uuid' })
  @Index('idx_inventory_location_inventory_id')
  inventoryId: string;

  @ApiProperty({
    description: 'Bin number where the inventory is stored (max 10 characters)',
    example: 'BIN-A001',
  })
  @Column({ type: 'varchar', length: 10 }) // Updated length
  @Index('idx_inventory_location_bin_number')
  binNumber: string;

  @ApiProperty({
    description: 'Physical location or warehouse section (max 200 characters)',
    example: 'Warehouse-A, Section-1, Row-5',
  })
  @Column({ type: 'varchar', length: 200 })
  @Index('idx_inventory_location_location')
  location: string;

  @ApiProperty({
    description: 'Quantity stored in this specific location',
    example: 150000,
  })
  @Column({ type: 'bigint' })
  quantity: string; // Stored as string to safely represent bigints

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

  // Relationship to the main inventory table
  @ManyToOne(() => Inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;
}
