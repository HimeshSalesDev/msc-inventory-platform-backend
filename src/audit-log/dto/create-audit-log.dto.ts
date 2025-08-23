import { IsOptional, IsUUID, IsEnum, IsString } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLogType } from 'src/entities/auditLog.entity';

export class CreateAuditLogDto {
  @ApiProperty({
    description: 'User ID who performed the action',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Type of audit log' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Description of the action' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Previous data before the change' })
  @IsOptional()
  previousData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Updated data after the change' })
  @IsOptional()
  updatedData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Entity name that was affected' })
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional({ description: 'Entity ID that was affected' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent of the request' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  previousData?: Record<string, any>;

  @ApiPropertyOptional()
  updatedData?: Record<string, any>;

  @ApiPropertyOptional()
  entityName?: string;

  @ApiPropertyOptional()
  entityId?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User details (if available)',
    example: {
      id: 'uuid',
      fullName: 'John Doe',
      email: 'john@example.com',
    },
  })
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class PaginatedAuditLogResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data: AuditLogResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
