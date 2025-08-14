import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

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
