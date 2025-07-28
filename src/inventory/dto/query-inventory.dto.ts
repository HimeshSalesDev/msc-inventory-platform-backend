import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';

export class QueryInventoryDto {
  @ApiPropertyOptional({
    description: 'Search by SKU (partial match)',
    example: 'SKU-001',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Filter by material type',
    example: 'Foam',
  })
  @IsOptional()
  @IsString()
  materialType?: string;

  @ApiPropertyOptional({
    description: 'Filter by material color',
    example: 'Blue',
  })
  @IsOptional()
  @IsString()
  materialColor?: string;

  @ApiPropertyOptional({
    description: 'Filter by shape',
    example: 'Circular',
  })
  @IsOptional()
  @IsString()
  shape?: string;

  @ApiPropertyOptional({
    description: 'Minimum quantity filter (supports very large numbers)',
    example: 100000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minQuantity?: number;

  @ApiPropertyOptional({
    description: 'Maximum quantity filter (supports very large numbers)',
    example: 10000000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxQuantity?: number;

  @ApiPropertyOptional({
    description: 'Minimum length filter (supports very large decimal values)',
    example: 1000.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Type(() => Number)
  minLength?: number;

  @ApiPropertyOptional({
    description: 'Maximum length filter (supports very large decimal values)',
    example: 100000.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Type(() => Number)
  maxLength?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: [
      'sku',
      'length',
      'width',
      'radius',
      'skirt',
      'foamDensity',
      'quantity',
      'allocatedQuantity',
      'inHandQuantity',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'sku',
    'length',
    'width',
    'radius',
    'skirt',
    'foamDensity',
    'quantity',
    'allocatedQuantity',
    'inHandQuantity',
    'createdAt',
    'updatedAt',
  ])
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Search in vendor description (partial match)',
    example: 'foam',
  })
  @IsOptional()
  @IsString()
  vendorDescription?: string;

  @ApiPropertyOptional({
    description: 'Filter by material number',
    example: 'MAT-001',
  })
  @IsOptional()
  @IsString()
  materialNumber?: string;

  @ApiPropertyOptional({
    description:
      'Filter items with low stock (quantity less than specified value - supports large numbers)',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'Filter items that have allocated quantity greater than 0',
    example: true,
  })
  @IsOptional()
  hasAllocatedQuantity?: boolean;

  @ApiPropertyOptional({
    description:
      'Filter items that are currently in stock (inHandQuantity > 0)',
    example: true,
  })
  @IsOptional()
  inStock?: boolean;
}
