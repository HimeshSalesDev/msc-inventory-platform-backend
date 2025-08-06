import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @ApiProperty({
    description: 'Unique identifier for the inventory item to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description: 'Vendor description of the product',
    example: 'High-quality foam material',
  })
  @IsOptional()
  @IsString()
  vendorDescription?: string;

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
}
