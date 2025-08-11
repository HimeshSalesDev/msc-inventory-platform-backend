import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  WebHookLogType,
  WebHookStatusType,
} from 'src/entities/webhook_logs.entity';

/**
 * DTO for filtering webhook logs when fetching from the API.
 */
export class FilterWebhookLogsDto {
  @ApiPropertyOptional({
    enum: WebHookLogType,
    description: 'Filter by audit log type',
  })
  @IsOptional()
  @IsEnum(WebHookLogType)
  type?: WebHookLogType;

  @ApiPropertyOptional({ description: 'Filter by entity name' })
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional({ description: 'Filter by entity ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

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

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}

export class WebHookLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WebHookStatusType })
  status: WebHookStatusType;

  @ApiProperty({ enum: WebHookLogType })
  type: WebHookLogType;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  response?: Record<string, any>;

  @ApiPropertyOptional()
  request?: Record<string, any>;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedWebHookLogResponseDto {
  @ApiProperty({ type: [WebHookLogResponseDto] })
  data: WebHookLogResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
