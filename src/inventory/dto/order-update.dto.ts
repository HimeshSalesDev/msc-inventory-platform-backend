import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderTypeEnum } from './order-confirmation.dto';

export class OrderDetailsDto {
  @ApiProperty({
    description: 'SKU of the item',
    example: 'SKU-12345',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Quantity as string to handle large numbers',
    example: '1000',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  qty: string;

  @ApiProperty({
    description: 'Type of order',
    enum: OrderTypeEnum,
    example: OrderTypeEnum.INVENTORY,
  })
  @IsNotEmpty()
  @IsEnum(OrderTypeEnum)
  type: OrderTypeEnum;

  @ApiProperty({
    description: 'ID required only when type is inbound',
    example: 'inbound-batch-001',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  id?: string;
}

export class OrderUpdateDto {
  @ApiProperty({
    description: 'Details of the existing order to be reversed',
    type: OrderDetailsDto,
    example: {
      sku: 'SKU-12345',
      qty: '100',
      type: 'inventory',
    },
  })
  @ValidateNested()
  @Type(() => OrderDetailsDto)
  @IsNotEmpty()
  updated: OrderDetailsDto;

  @ApiProperty({
    description: 'Details of the new order to be applied',
    type: OrderDetailsDto,
    example: {
      sku: 'SKU-12345',
      qty: '150',
      type: 'inventory',
    },
  })
  @ValidateNested()
  @Type(() => OrderDetailsDto)
  @IsNotEmpty()
  new: OrderDetailsDto;
}

export class OrderUpdateSummary {
  @ApiProperty({
    description: 'Details of the old order that was reversed',
    type: OrderDetailsDto,
  })
  oldOrder: OrderDetailsDto;

  @ApiProperty({
    description: 'Details of the new order that was applied',
    type: OrderDetailsDto,
  })
  newOrder: OrderDetailsDto;

  @ApiProperty({
    description:
      'Net quantity change (positive = increase, negative = decrease)',
    example: 50,
  })
  quantityChange: number;
}

export class OrderUpdateResponseDto {
  @ApiProperty({
    description: 'Operation status',
    example: 'OK',
  })
  status: string;

  @ApiProperty({
    description: 'Details of the order reversal operation',
  })
  reversed: any;

  @ApiProperty({
    description: 'Details of the new order application',
  })
  applied: any;

  @ApiProperty({
    description: 'Summary of the complete order update operation',
    type: OrderUpdateSummary,
  })
  summary: OrderUpdateSummary;
}
