import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Length,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInboundDto {
  // Inbound-specific fields
  @ApiPropertyOptional({
    description: 'Purchase Order number',
    example: 'PO-2024-001',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  poNumber?: string;

  @ApiPropertyOptional({
    description: 'Container number for shipping',
    example: 'CONT-12345678',
    maxLength: 255,
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
    maxLength: 255,
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

  // Inventory fields (same validation as inventory)
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
    description: 'Length ',
    example: '123.456',
  })
  @IsOptional()
  @IsString()
  length?: string;

  @ApiPropertyOptional({
    description: 'Width ',
    example: 45.789,
  })
  @IsOptional()
  @IsString()
  width?: string;

  @ApiPropertyOptional({
    description: 'Radius ',
    example: '67.321',
  })
  @IsOptional()
  @IsString()
  radius?: string;

  @ApiProperty({
    description: 'Skirt ',
    example: '89.123',
  })
  @IsOptional()
  @IsString()
  skirt?: string;

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
    description: 'Foam density ',
    example: '25.123',
  })
  @IsOptional()
  @IsString()
  foamDensity?: string;

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
    description: 'Inbound quantity (as string to support bigint)',
    example: '1000000000000',
  })
  @Matches(/^\d+$/, { message: 'Quantity must be a numeric string' })
  @IsOptional()
  @IsString()
  quantity?: string;
}
