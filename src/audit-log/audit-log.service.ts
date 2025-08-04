import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog, AuditLogType } from 'src/entities/auditLog.entity';

import { Repository, SelectQueryBuilder } from 'typeorm';
import { QueryAuditLogsDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async findAll(queryDto: QueryAuditLogsDto): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      userId,
      type,
      entityName,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 100,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user');

    this.applyFilters(queryBuilder, {
      userId,
      type,
      entityName,
      entityId,
      startDate,
      endDate,
    });

    queryBuilder.orderBy(`auditLog.${sortBy}`, sortOrder);

    const [data, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<AuditLog>,
    filters: {
      userId?: string;
      type?: AuditLogType;
      entityName?: string;
      entityId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): void {
    const { userId, type, entityName, entityId, startDate, endDate } = filters;

    if (userId) {
      queryBuilder.andWhere('auditLog.userId = :userId', { userId });
    }

    if (type) {
      queryBuilder.andWhere('auditLog.type = :type', { type });
    }

    if (entityName) {
      queryBuilder.andWhere('auditLog.entityName = :entityName', {
        entityName,
      });
    }

    if (entityId) {
      queryBuilder.andWhere('auditLog.entityId = :entityId', { entityId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'auditLog.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    } else if (startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }
  }
}
