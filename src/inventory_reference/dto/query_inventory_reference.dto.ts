import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { InventoryReferenceResponseDto } from './inventory_reference_response.dto';

export class InventoryReferenceQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 100,
    minimum: 1,
    maximum: 1000,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiPropertyOptional({
    description: 'Filter by SKU (partial match)',
    example: 'SKU-001',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Filter by type',
    example: 'TYPE001',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by pro number',
    example: 'REF-001',
  })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({
    description:
      'Include records with zero quantity. If true, returns all records. If false or not provided, returns only records with quantity > 0',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  @IsBoolean()
  isShipped?: boolean = false;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: [
      'createdAt',
      'updatedAt',
      'sku',
      'type',
      'number',
      'status',
      'quantity',
    ],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class PaginatedInventoryReferenceResponseDto {
  @ApiProperty({ type: [InventoryReferenceResponseDto] })
  data: InventoryReferenceResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  totalCount: number;
}

export class UpdateQuantityDto {
  @ApiProperty({
    description: 'Unique identifier of the inventory reference to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'ID is required' })
  @IsString({ message: 'ID must be a string' })
  @IsUUID('4', { message: 'ID must be a valid UUID' })
  id: string;
}
