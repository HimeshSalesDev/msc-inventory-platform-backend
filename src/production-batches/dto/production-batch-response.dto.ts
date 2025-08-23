import { ApiProperty } from '@nestjs/swagger';
import { PreOrder } from 'src/entities/pre_orders.entity';

export class ProductionBatchResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Pre-order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  preOrderId: string;

  @ApiProperty({
    description: 'Quantity in production',
    example: 50,
  })
  quantityInProduction: number;

  @ApiProperty({
    description: 'Total quantity dispatched from this batch',
    example: 15,
  })
  totalDispatched: number;

  @ApiProperty({
    description: 'Quantity remaining to be dispatched',
    example: 35,
  })
  quantityPendingDispatch: number;

  @ApiProperty({
    description: 'User who moved items to production',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  movedBy: string;

  @ApiProperty({
    description: 'When items were moved to production',
    example: '2024-01-15T10:30:00Z',
  })
  movedAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Pre-order details',
    nullable: true,
  })
  preOrder?: PreOrder;
}
