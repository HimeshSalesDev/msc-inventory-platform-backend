import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog, AuditLogType } from 'src/entities/auditLog.entity';

import { Repository, SelectQueryBuilder } from 'typeorm';
import { QueryAuditLogsDto } from './dto/query-audit-log.dto';

import { Inventory } from 'src/entities/inventory.entity';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,

    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
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

  async findAllBySku(
    sku: string,
    queryDto: QueryAuditLogsDto,
  ): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 100,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    // 1️⃣ Get the inventory record with its related locations

    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      throw new BadRequestException('SKU must be a non-empty string');
    }
    const trimmedSku = sku.trim();

    const inventory = await this.inventoryRepository.findOne({
      where: { sku: trimmedSku },
      relations: ['inventoryLocations'],
    });

    if (!inventory) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // 2️⃣ Extract all entity IDs we care about
    const entityIds: string[] = [
      inventory.id,
      ...inventory.inventoryLocations.map((loc) => loc.id),
    ];

    // 3️⃣ Build the query for audit logs
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.entityId IN (:...entityIds)', { entityIds })
      .orderBy(`auditLog.${sortBy}`, sortOrder)
      .take(limit)
      .skip((page - 1) * limit);

    const [data, total] = await queryBuilder.getManyAndCount();

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
