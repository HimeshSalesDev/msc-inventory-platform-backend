import { ApiProperty } from '@nestjs/swagger';

export class PreOrderCountsDto {
  @ApiProperty({
    description: 'Total quantity in production across all batches',
    example: 60,
  })
  inProduction: number;

  @ApiProperty({
    description: 'Total quantity dispatched',
    example: 25,
  })
  dispatched: number;

  @ApiProperty({
    description: 'Remaining quantity not yet moved to production',
    example: 15,
  })
  remaining: number;
}

export class PreOrderResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Stock Keeping Unit',
    example: 'SKU-123',
  })
  sku: string;

  @ApiProperty({
    description: 'Total quantity ordered',
    example: 100,
  })
  quantity: number;

  @ApiProperty({
    description: 'User who created the order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Order status',
    example: 'active',
    enum: ['active', 'completed', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Purchase Order number',
    example: 'PO-2024-001',
    nullable: true,
  })
  poNumber?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Production and dispatch counts',
    type: PreOrderCountsDto,
  })
  counts: PreOrderCountsDto;
}
