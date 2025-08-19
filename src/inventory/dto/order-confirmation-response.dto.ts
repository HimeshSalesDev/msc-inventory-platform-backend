import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OrderTypeEnum } from './order-confirmation.dto';

export class OrderConfirmationResponseDto {
  @ApiProperty({
    description: 'Status of the order confirmation request',
    example: 'OK',
  })
  status: string;

  @ApiProperty({
    description: 'Type of order that was confirmed',
    enum: OrderTypeEnum,
    example: OrderTypeEnum.INVENTORY,
  })
  type: OrderTypeEnum;

  @ApiProperty({
    description: 'Number of rows updated in the inventory',
    example: 3,
  })
  updatedRows: number;

  @ApiPropertyOptional({
    description: 'Extra updated values (like preBookedQuantity for inbound)',
    example: { preBookedQuantity: 500 },
  })
  updated?: Record<string, any>;

  @ApiProperty({
    description: 'Updated  data after confirmation',
  })
  data: any;
}
