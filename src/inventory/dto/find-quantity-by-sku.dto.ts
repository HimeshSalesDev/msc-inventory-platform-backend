import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FindQuantityBySkuDto {
  @ApiPropertyOptional({
    description: 'Search by SKU (partial match)',
    example: 'SKU-001',
  })
  @IsString()
  sku: string;
}
