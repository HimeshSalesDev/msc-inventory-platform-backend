import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Inventory } from './inventory.entity';
import { ApiProperty } from '@nestjs/swagger';

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

  @Column({ type: 'uuid' })
  @Index('idx_inventory_reference_inventory_id')
  inventoryId: string;

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
    description: 'Reference to the inventory item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ManyToOne(() => Inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;
}
