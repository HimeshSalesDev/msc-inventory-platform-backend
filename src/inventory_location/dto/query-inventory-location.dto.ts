import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryInventoryLocationDto {
  @ApiPropertyOptional({ description: 'Filter by SKU' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  sku?: string;

  @ApiPropertyOptional({ description: 'Filter by bin number' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  binNumber?: string;

  @ApiPropertyOptional({ description: 'Filter by location' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  location?: string;

  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    example: 1,
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }: { value: string }): string | undefined => {
    const num = parseInt(value);
    return isNaN(num) || num < 1 ? undefined : value;
  })
  page?: string;

  @ApiPropertyOptional({
    description:
      'Items per page (1–100). If omitted, all results are returned.',
    example: 10,
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }: { value: string }): string | undefined => {
    const num = parseInt(value);
    return isNaN(num) || num < 1 || num > 100 ? undefined : value;
  })
  limit?: string;
}
