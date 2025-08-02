import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditLogType } from '../entities/auditLog.entity';
import { AuditEvent } from '../events/audit.events';

interface ComparisonResult {
  changes: string[];
  previousData: Record<string, any>;
  newData: Record<string, any>;
}

@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  @OnEvent('audit.**', { async: true })
  async handleAuditEvent(event: AuditEvent): Promise<void> {
    try {
      await this.processAuditEvent(event);
    } catch (error) {
      this.logger.error('Error processing audit event:', error);
      // Optionally implement retry logic or dead letter queue here
    }
  }

  private async processAuditEvent(event: AuditEvent): Promise<void> {
    const {
      userId,
      userName,
      type,
      entityName,
      entityId,
      previousData,
      updatedData,
      action = 'updated',
      ipAddress,
      userAgent,
      isLogWithoutData = false,
    } = event;

    if (!userId) {
      this.logger.warn(`Invalid user ID for audit log: ${userId}`);
      return;
    }

    const entityInfo = entityName ?? '';
    const entityIdInfo = entityId;
    const description = `User ${userName} ${action} ${entityInfo}${
      entityIdInfo ? ` (ID: ${entityIdInfo})` : ''
    }`;

    // Handle events without data comparison
    if (
      isLogWithoutData ||
      type === AuditLogType.LOGIN ||
      type === AuditLogType.LOGOUT
    ) {
      await this.saveAuditLog({
        userId,
        type: type,
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

    // Handle create operations
    if (
      updatedData &&
      !previousData &&
      (type === AuditLogType.ADD_INVENTORY ||
        type === AuditLogType.ADD_INVENTORY_LOCATION ||
        type === AuditLogType.CREATE_USER)
    ) {
      await this.saveAuditLog({
        userId,
        type: type as AuditLogType,
        description,
        previousData: null,
        updatedData,
        entityName,
        entityId,
        ipAddress,
        userAgent,
      });
      return;
    }

    // Handle update operations with data comparison
    if (previousData && updatedData) {
      const {
        changes,
        previousData: prevDataFiltered,
        newData,
      } = this.compareObjects(previousData, updatedData);

      if (changes.length > 0) {
        await this.saveAuditLog({
          userId,
          type: type as AuditLogType,
          description: `${description}.`,
          previousData: prevDataFiltered,
          updatedData: newData,
          entityName,
          entityId,
          ipAddress,
          userAgent,
        });
      }
    }

    // Handle delete operations
    if (
      previousData &&
      !updatedData &&
      type === AuditLogType.DELETE_INVENTORY
    ) {
      await this.saveAuditLog({
        userId,
        type: type as AuditLogType,
        description,
        previousData,
        updatedData: null,
        entityName,
        entityId,
        ipAddress,
        userAgent,
      });
    }
  }

  private async saveAuditLog(data: {
    userId: string;
    type: AuditLogType;
    description: string;
    previousData: Record<string, any> | null;
    updatedData: Record<string, any> | null;
    entityName?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogRepository.save(data);
      this.logger.debug(
        `Audit log saved for user ${data.userId}, type: ${data.type}`,
      );
    } catch (error) {
      this.logger.error('Failed to save audit log:', error);
      throw error;
    }
  }

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
      if (ignoreKeys.includes(key)) return;

      const formattedKey =
        prefix + key.replace(/([A-Z])/g, ' $1').toLowerCase();
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

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

      const oldValue = oldVal ?? '';
      const newValue = newVal ?? '';

      if (oldValue != newValue) {
        if (!previousData[fullKey]) previousData[fullKey] = oldVal;
        if (!newData[fullKey]) newData[fullKey] = newVal;
        changes.push(`${formattedKey}: "${oldValue}" to "${newValue}"`);
      }
    };

    Object.keys({ ...prevData, ...updatedData }).forEach((key) => {
      compareValues(key, prevData[key], updatedData[key]);
    });

    return { changes, previousData, newData };
  }
}
