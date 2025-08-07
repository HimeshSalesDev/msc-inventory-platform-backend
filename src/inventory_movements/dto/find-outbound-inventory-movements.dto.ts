import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class FindOutboundInventoryMovementsDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering OUT movements',
    example: '2025-08-01T00:00:00Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering OUT movements',
    example: '2025-08-07T23:59:59Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  endDate?: string;
}
