import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('inbound_pre_order')
@Unique(['sku'])
export class InboundPreOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  sku: string;

  @Column({ type: 'bigint', default: '0' })
  preBookedQuantity: string;
}
