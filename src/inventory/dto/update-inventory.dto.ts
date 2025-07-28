import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Length,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const MAX_DECIMAL = 9999999.999999;

export class UpdateInventoryDto {
  @ApiProperty({
    description: 'Unique identifier for the inventory item to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description: 'Stock Keeping Unit - unique identifier for the product',
    example: 'SKU-001',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  sku?: string;

  @ApiPropertyOptional({
    description: 'Vendor description of the product',
    example: 'High-quality foam material',
  })
  @IsOptional()
  @IsString()
  vendorDescription?: string;

  @ApiPropertyOptional({
    description: 'Length measurement (max: 9999999.999999)',
    example: 123456.123456,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  length?: number;

  @ApiPropertyOptional({
    description: 'Width measurement (max: 9999999.999999)',
    example: 123456.123456,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  width?: number;

  @ApiPropertyOptional({
    description: 'Radius measurement (max: 9999999.999999)',
    example: 123456.123456,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({
    description: 'Skirt measurement (max: 9999999.999999)',
    example: 123456.123456,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  skirt?: number;

  @ApiPropertyOptional({
    description: 'Taper specification',
    example: 'Standard',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  taper?: string;

  @ApiPropertyOptional({
    description: 'Foam density (max: 9999999.999999)',
    example: 123456.123456,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  foamDensity?: number;

  @ApiPropertyOptional({
    description: 'Strip insert specification',
    example: 'Type A',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  stripInsert?: string;

  @ApiPropertyOptional({
    description: 'Shape of the inventory item',
    example: 'Circular',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  shape?: string;

  @ApiPropertyOptional({
    description: 'Material number identifier',
    example: 'MAT-001',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  materialNumber?: string;

  @ApiPropertyOptional({
    description: 'Type of material',
    example: 'Foam',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  materialType?: string;

  @ApiPropertyOptional({
    description: 'Color of the material',
    example: 'Blue',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  materialColor?: string;

  @ApiPropertyOptional({
    description: 'Total quantity (as string for bigint)',
    example: '1000000000000000',
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Allocated quantity (as string for bigint)',
    example: '500000000000000',
  })
  @IsOptional()
  @IsString()
  allocatedQuantity?: string;

  @ApiPropertyOptional({
    description: 'In-hand quantity (as string for bigint)',
    example: '500000000000000',
  })
  @IsOptional()
  @IsString()
  inHandQuantity?: string;
}
