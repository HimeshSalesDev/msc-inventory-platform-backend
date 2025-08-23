import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PreOrder } from './pre_orders.entity';

@Entity('production_batches')
export class ProductionBatch {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Reference to pre-order' })
  @Column({ name: 'pre_order_id' })
  preOrderId: string;

  @ApiProperty({ description: 'Quantity moved to production', example: 50 })
  @Column({ type: 'int', unsigned: true })
  quantityInProduction: number;

  @ApiProperty({ description: 'User who moved items to production' })
  @Column({ name: 'moved_by' })
  movedBy: string;

  @ApiProperty({ description: 'When items were moved to production' })
  @CreateDateColumn({ name: 'moved_at' })
  movedAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => PreOrder, (preOrder) => preOrder.productionBatch)
  @JoinColumn({ name: 'pre_order_id' })
  preOrder: PreOrder;
}
