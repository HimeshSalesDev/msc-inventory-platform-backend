import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Length,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const MAX_DECIMAL = 999999.999999;

export class CreateInventoryDto {
  @ApiProperty({
    description: 'Stock Keeping Unit - unique identifier for the product',
    example: 'SKU-001',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  sku: string;

  @ApiPropertyOptional({
    description: 'Vendor description of the product',
    example: 'High-quality foam material',
  })
  @IsOptional()
  @IsString()
  vendorDescription?: string;

  @ApiProperty({
    description: 'Length (decimal, max 6 decimal places)',
    example: 123456.123456,
    minimum: 0,
    maximum: MAX_DECIMAL,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  length: number;

  @ApiPropertyOptional({
    description: 'Width (decimal, max 6 decimal places)',
    example: 12345.123456,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  width?: number;

  @ApiPropertyOptional({
    description: 'Radius (decimal, max 6 decimal places)',
    example: 54321.123456,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  radius?: number;

  @ApiProperty({
    description: 'Skirt (decimal, max 6 decimal places)',
    example: 9999.999999,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  skirt: number;

  @ApiPropertyOptional({
    description: 'Taper specification',
    example: 'Standard',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  taper?: string;

  @ApiProperty({
    description: 'Foam density (decimal, max 6 decimal places)',
    example: 12.345678,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(MAX_DECIMAL)
  @Type(() => Number)
  foamDensity: number;

  @ApiPropertyOptional({
    description: 'Strip insert specification',
    example: 'Type A',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  stripInsert?: string;

  @ApiPropertyOptional({
    description: 'Shape of the inventory item',
    example: 'Circular',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  shape?: string;

  @ApiPropertyOptional({
    description: 'Material number identifier',
    example: 'MAT-001',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  materialNumber?: string;

  @ApiPropertyOptional({
    description: 'Type of material',
    example: 'Foam',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  materialType?: string;

  @ApiPropertyOptional({
    description: 'Color of the material',
    example: 'Blue',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  materialColor?: string;

  @ApiPropertyOptional({
    description: 'Total quantity available (as string to support bigint)',
    example: '1000000000000',
  })
  @Matches(/^\d+$/, { message: 'Quantity must be a numeric string' })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Quantity allocated (as string to support bigint)',
    example: '500000000000',
  })
  @Matches(/^\d+$/, { message: 'Quantity must be a numeric string' })
  @IsOptional()
  @IsString()
  allocatedQuantity?: string;

  @ApiPropertyOptional({
    description: 'Quantity in hand (as string to support bigint)',
    example: '500000000000',
  })
  @Matches(/^\d+$/, { message: 'Quantity must be a numeric string' })
  @IsOptional()
  @IsString()
  inHandQuantity?: string;
}
