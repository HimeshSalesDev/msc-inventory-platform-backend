import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { InboundPreOrder } from 'src/entities/inbound-preorder.entity';

export class QueryInboundDto {
  @ApiPropertyOptional({
    description: 'Search by Purchase Order number (partial match)',
    example: 'PO-2024',
  })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional({
    description: 'Search by container number (exact match)',
    example: 'CONT-123',
  })
  @IsOptional()
  @IsString()
  containerNumber?: string;

  @ApiPropertyOptional({
    description: 'Search in vendor description (partial match)',
    example: 'foam',
  })
  @IsOptional()
  @IsString()
  vendorDescription?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: [
      'poNumber',
      'containerNumber',
      'vendorName',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn(['poNumber', 'containerNumber', 'vendorName', 'createdAt', 'updatedAt'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description:
      'If true, only return offloaded records. If false or omitted, return only non-offloaded records.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  onlyOffloaded?: boolean;

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
}

export class QueryInboundPreOrdersDto {
  @ApiPropertyOptional({ description: 'Filter by SKU' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(1000)
  limit: number = 100;
}

export class PaginatedInboundPreOrderResponseDto {
  @ApiProperty({ type: [InboundPreOrder] })
  data: InboundPreOrder[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 200 })
  totalCount: number;
}
