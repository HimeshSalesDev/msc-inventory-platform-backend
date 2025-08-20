import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';

import { AuditLogService } from './audit-log.service';

import { QueryAuditLogsDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/roles.enum';
import {
  AuditLogResponseDto,
  PaginatedAuditLogResponseDto,
} from './dto/create-audit-log.dto';

@ApiTags('audit-log')
@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all audit logs with pagination and filtering' })
  @ApiOkResponse({
    type: PaginatedAuditLogResponseDto,
    description: 'Audit logs retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin  role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch logs',
  })
  async findAll(@Query() queryDto: QueryAuditLogsDto) {
    return await this.auditLogService.findAll(queryDto);
  }

  @Get('by-sku/:sku')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all audit logs by sku with pagination and filtering',
  })
  @ApiOkResponse({
    type: PaginatedAuditLogResponseDto,
    description: 'Audit logs retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin  and inventory role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch logs',
  })
  async findAllBySku(
    @Query() queryDto: QueryAuditLogsDto,
    @Param('sku') sku: string,
  ) {
    return await this.auditLogService.findAllBySku(sku, queryDto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get audit log by id',
  })
  @ApiOkResponse({
    type: AuditLogResponseDto,
    description: 'Audit logs retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin  and inventory role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch logs',
  })
  async findById(@Param('id') id: string) {
    return await this.auditLogService.findOneById(id);
  }
}
