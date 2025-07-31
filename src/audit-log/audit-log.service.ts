import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog, AuditLogType } from 'src/entities/auditLog.entity';

import { Repository, SelectQueryBuilder } from 'typeorm';
import { QueryAuditLogsDto } from './dto/query-audit-log.dto';

interface CreateAuditLogOptions {
  userId: string;
  userName: string;
  type: AuditLogType;
  prevData?: Record<string, any>;
  updatedData?: Record<string, any>;
  entityName?: string;
  entityId?: string;
  action?: string;
  isLogWithoutData?: boolean;
  key?: string;
  descriptionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ComparisonResult {
  changes: string[];
  previousData: Record<string, any>;
  newData: Record<string, any>;
}

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

  // Main method to create audit logs with comparison logic
  async createAuditLog(options: CreateAuditLogOptions): Promise<void> {
    try {
      const {
        userId,
        userName,
        type,
        prevData,
        updatedData,
        entityName,
        entityId,
        action = 'updated',
        isLogWithoutData = false,
        key = 'id',
        descriptionId,
        ipAddress,
        userAgent,
      } = options;

      if (!userId) {
        this.logger.warn(`User with ID ${userId} not found for audit log`);
        return;
      }

      const entityInfo = entityName ?? '';
      const entityIdInfo =
        entityId || (prevData && prevData[key]) || descriptionId;
      const description = `User ${userName} ${action}${entityInfo}${entityIdInfo ? ` (ID: ${entityIdInfo})` : ''}`;

      if (
        isLogWithoutData ||
        type === AuditLogType.LOGIN ||
        type === AuditLogType.LOGOUT
      ) {
        await this.auditLogRepository.save({
          userId,
          type,
          description,
          previousData: null,
          updatedData: null,
          entityName,
          entityId,
          ipAddress,
          userAgent,
        });
        return;
      }

      // For data comparison scenarios
      if (prevData && updatedData) {
        const { changes, previousData, newData } = this.compareObjects(
          prevData,
          updatedData,
        );

        if (changes.length > 0) {
          await this.auditLogRepository.save({
            userId,
            type,
            description: `${description}.`,
            previousData,
            updatedData: newData,
            entityName,
            entityId,
            ipAddress,
            userAgent,
          });
        }
      } else if (
        updatedData &&
        (type === AuditLogType.ADD_INVENTORY || type.includes('create'))
      ) {
        // For create operations, only store new data
        await this.auditLogRepository.save({
          userId,
          type,
          description,
          previousData: null,
          updatedData,
          entityName,
          entityId,
          ipAddress,
          userAgent,
        });
      }
    } catch (error) {
      this.logger.error('Error creating audit log:', error);
    }
  }

  // Login audit log
  async logLogin(
    userId: string,
    userName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      userName,
      type: AuditLogType.LOGIN,
      action: 'logged in',
      isLogWithoutData: true,
      ipAddress,
      userAgent,
    });
  }

  // Inventory operations
  async logInventoryCreate(
    userId: string,
    userName: string,
    inventoryData: Record<string, any>,
    inventoryId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      userName,
      type: AuditLogType.ADD_INVENTORY,
      updatedData: inventoryData,
      entityName: 'inventory',
      entityId: inventoryId,
      action: 'created',
      ipAddress,
      userAgent,
    });
  }

  async logInventoryUpdate(
    userId: string,
    userName: string,
    prevData: Record<string, any>,
    updatedData: Record<string, any>,
    inventoryId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      userName,
      type: AuditLogType.UPDATE_INVENTORY,
      prevData,
      updatedData,
      entityName: 'inventory',
      entityId: inventoryId,
      action: 'updated',
      ipAddress,
      userAgent,
    });
  }

  async logInventoryDelete(
    userId: string,
    userName: string,
    inventoryData: Record<string, any>,
    inventoryId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      userName,
      type: AuditLogType.DELETE_INVENTORY,
      prevData: inventoryData,
      entityName: 'inventory',
      entityId: inventoryId,
      action: 'deleted',
      isLogWithoutData: false,
      ipAddress,
      userAgent,
    });
  }

  // Private utility function for deep comparison
  private compareObjects(
    prevData: Record<string, any>,
    updatedData: Record<string, any>,
    ignoreKeys: string[] = ['updatedAt', 'updated_at'],
  ): ComparisonResult {
    const changes: string[] = [];
    const previousData: Record<string, any> = {};
    const newData: Record<string, any> = {};

    const compareValues = (
      key: string,
      oldVal: any,
      newVal: any,
      prefix = '',
      parentKey = '',
    ): void => {
      // Skip ignored keys
      if (ignoreKeys.includes(key)) return;

      const formattedKey =
        prefix + key.replace(/([A-Z])/g, ' $1').toLowerCase();
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      // Handle nested objects
      if (
        typeof oldVal === 'object' &&
        oldVal !== null &&
        typeof newVal === 'object' &&
        newVal !== null &&
        !Array.isArray(oldVal) &&
        !Array.isArray(newVal)
      ) {
        Object.keys({ ...oldVal, ...newVal }).forEach((nestedKey) => {
          const nestedOldVal = oldVal?.[nestedKey];
          const nestedNewVal = newVal?.[nestedKey];
          compareValues(
            nestedKey,
            nestedOldVal,
            nestedNewVal,
            `${formattedKey}.`,
            fullKey,
          );
        });
        return;
      }

      // Compare primitive values
      const oldValue = oldVal ?? '';
      const newValue = newVal ?? '';

      if (oldValue != newValue) {
        if (!previousData[fullKey]) previousData[fullKey] = oldVal;
        if (!newData[fullKey]) newData[fullKey] = newVal;
        changes.push(`${formattedKey}: "${oldValue}" to "${newValue}"`);
      }
    };

    // Start the comparison
    Object.keys({ ...prevData, ...updatedData }).forEach((key) => {
      compareValues(key, prevData[key], updatedData[key]);
    });

    return { changes, previousData, newData };
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
