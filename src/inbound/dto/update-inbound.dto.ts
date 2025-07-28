import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Length,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

const MAX_DECIMAL = 9999999.999999;

export class UpdateInboundDto {
  @ApiProperty({
    description: 'Unique identifier for the inbound record to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsString()
  id: string;

  // Inbound-specific fields
  @ApiPropertyOptional({
    description: 'Purchase Order number',
    example: 'PO-2024-001',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  poNumber?: string;

  @ApiPropertyOptional({
    description: 'Container number for shipping',
    example: 'CONT-12345678',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  containerNumber?: string;

  @ApiPropertyOptional({
    description: 'Estimated Time of Departure (ISO date string)',
    example: '2024-01-20',
  })
  @IsOptional()
  @IsDateString({}, { message: 'ETD must be a valid ISO date string' })
  etd?: string;

  @ApiPropertyOptional({
    description: 'Estimated Time of Arrival (ISO date string)',
    example: '2024-02-15',
  })
  @IsOptional()
  @IsDateString({}, { message: 'ETA must be a valid ISO date string' })
  eta?: string;

  @ApiPropertyOptional({
    description: 'Shipped status or date',
    example: '2024-01-21',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  shipped?: string;

  @ApiPropertyOptional({
    description: 'Date when goods were offloaded (ISO date string)',
    example: '2024-02-16',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Offloaded date must be a valid ISO date string' },
  )
  offloadedDate?: string;

  // Inventory fields
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
    description: 'Inbound quantity (as string for bigint)',
    example: '1000000000000000',
  })
  @IsOptional()
  @IsString()
  quantity?: string;
}
