import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreatePreOrderDto {
  @ApiProperty({
    description: 'Stock Keeping Unit',
    example: 'SKU-123',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  sku: string;

  @ApiProperty({
    description: 'Total quantity to order',
    example: 100,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    description: 'Purchase Order number',
    example: 'PO-2024-001',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  poNumber?: string;
}

export class MoveToProductionDto {
  @ApiProperty({
    description: 'Quantity of items to move to production',
    example: 10,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number) // transforms "10" -> 10
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}
