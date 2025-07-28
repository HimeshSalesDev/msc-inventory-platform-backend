import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  IsIn,
  IsDateString,
} from 'class-validator';

export class QueryInboundDto {
  // Inbound-specific filters
  @ApiPropertyOptional({
    description: 'Search by Purchase Order number (partial match)',
    example: 'PO-2024',
  })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional({
    description: 'Search by container number (partial match)',
    example: 'CONT-123',
  })
  @IsOptional()
  @IsString()
  containerNumber?: string;

  @ApiPropertyOptional({
    description: 'Filter by ETD date (from date)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  etdFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by ETD date (to date)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  etdTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by ETA date (from date)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  etaFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by ETA date (to date)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  etaTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by offloaded date (from date)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  offloadedDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by offloaded date (to date)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  offloadedDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by shipped status',
    example: 'Shipped',
  })
  @IsOptional()
  @IsString()
  shipped?: string;

  @ApiPropertyOptional({
    description: 'Filter items that have been offloaded',
    example: true,
  })
  @IsOptional()
  isOffloaded?: boolean;

  @ApiPropertyOptional({
    description: 'Filter items that have ETD set',
    example: true,
  })
  @IsOptional()
  hasEtd?: boolean;

  @ApiPropertyOptional({
    description: 'Filter items that have ETA set',
    example: true,
  })
  @IsOptional()
  hasEta?: boolean;

  // Inventory-related filters
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
    description: 'Minimum foam density filter',
    example: 10.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Type(() => Number)
  minFoamDensity?: number;

  @ApiPropertyOptional({
    description: 'Maximum foam density filter',
    example: 50.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Type(() => Number)
  maxFoamDensity?: number;

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
    description: 'Filter by inventory ID reference',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  inventoryId?: string;

  // Sorting options
  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: [
      'poNumber',
      'containerNumber',
      'etd',
      'eta',
      'offloadedDate',
      'sku',
      'length',
      'width',
      'radius',
      'skirt',
      'foamDensity',
      'quantity',
      'materialType',
      'materialColor',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'poNumber',
    'containerNumber',
    'etd',
    'eta',
    'offloadedDate',
    'sku',
    'length',
    'width',
    'radius',
    'skirt',
    'foamDensity',
    'quantity',
    'materialType',
    'materialColor',
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

  // Date range filters for creation/update
  @ApiPropertyOptional({
    description: 'Filter by creation date (from)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date (to)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by last update date (from)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  updatedFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by last update date (to)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  updatedTo?: string;

  // Status filters
  @ApiPropertyOptional({
    description: 'Filter items that have quantity set',
    example: true,
  })
  @IsOptional()
  hasQuantity?: boolean;

  @ApiPropertyOptional({
    description:
      'Filter items with pending delivery (ETA set but not offloaded)',
    example: true,
  })
  @IsOptional()
  pendingDelivery?: boolean;
}
