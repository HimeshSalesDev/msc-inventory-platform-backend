import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditEvent,
  InventoryCreatedEvent,
  InventoryUpdatedEvent,
  InventoryDeletedEvent,
  UserLoginEvent,
  UserLogoutEvent,
  InventoryLocationCreatedEvent,
  InventoryLocationUpdatedEvent,
  InboundCreatedEvent,
  InboundUpdatedEvent,
  InboundDeletedEvent,
  InboundContainerUpdatedEvent,
} from './events/audit.events';
import { AuditLogType } from 'src/entities/auditLog.entity';

export interface RequestContext {
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  controllerPath?: string;
}

@Injectable()
export class AuditEventService {
  constructor(private eventEmitter: EventEmitter2) {}

  // Generic method to emit audit events
  private emitAuditEvent(event: AuditEvent): void {
    this.eventEmitter.emit(`audit.${event.type}`, event);
  }

  // User authentication events
  emitLoginEvent(
    userId: string,
    userName: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    const event = new UserLoginEvent(userId, userName, ipAddress, userAgent);
    this.emitAuditEvent(event);
  }

  emitLogoutEvent(
    userId: string,
    userName: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    const event = new UserLogoutEvent(userId, userName, ipAddress, userAgent);
    this.emitAuditEvent(event);
  }

  // Inventory events
  emitInventoryCreated(
    context: RequestContext,
    inventoryData: Record<string, any>,
    inventoryId: string,
  ): void {
    const event = new InventoryCreatedEvent(
      context.userId,
      context.userName,
      inventoryData,
      inventoryId,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }

  emitInventoryUpdated(
    context: RequestContext,
    previousData: Record<string, any>,
    updatedData: Record<string, any>,
    inventoryId: string,
  ): void {
    const event = new InventoryUpdatedEvent(
      context.userId,
      context.userName,
      previousData,
      updatedData,
      inventoryId,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }

  emitInventoryDeleted(
    context: RequestContext,
    inventoryData: Record<string, any>,
    inventoryId: string,
  ): void {
    const event = new InventoryDeletedEvent(
      context.userId,
      context.userName,
      inventoryData,
      inventoryId,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }

  emitInventoryLocationCreated(
    context: RequestContext,
    inventoryLocationData: Record<string, any>,
    inventoryLocationId: string,
  ): void {
    const event = new InventoryLocationCreatedEvent(
      context.userId,
      context.userName,
      inventoryLocationData,
      inventoryLocationId,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }

  emitInventoryLocationUpdated(
    context: RequestContext,
    previousData: Record<string, any>,
    updatedData: Record<string, any>,
    inventoryLocationId: string,
  ): void {
    const event = new InventoryLocationUpdatedEvent(
      context.userId,
      context.userName,
      previousData,
      updatedData,
      inventoryLocationId,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }

  // Inbound events
  emitInboundCreated(
    context: RequestContext,
    inboundData: Record<string, any>,
    inboundId: string,
  ): void {
    const event = new InboundCreatedEvent(
      context.userId,
      context.userName,
      inboundData,
      inboundId,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }

  emitInboundUpdated(
    context: RequestContext,
    previousData: Record<string, any>,
    updatedData: Record<string, any>,
    inboundId: string,
  ): void {
    const event = new InboundUpdatedEvent(
      context.userId,
      context.userName,
      previousData,
      updatedData,
      inboundId,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }

  emitInboundDeleted(
    context: RequestContext,
    inboundData: Record<string, any>,
    inboundId: string,
  ): void {
    const event = new InboundDeletedEvent(
      context.userId,
      context.userName,
      inboundData,
      inboundId,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }

  // Generic method for custom audit events
  emitCustomAuditEvent(
    userId: string,
    userName: string,
    type: AuditLogType,
    options?: {
      entityName?: string;
      entityId?: string;
      previousData?: Record<string, any>;
      updatedData?: Record<string, any>;
      action?: string;
      ipAddress?: string;
      userAgent?: string;
      isLogWithoutData?: boolean;
    },
    controllerPath?: string,
  ): void {
    const event = new AuditEvent(
      userId,
      userName,
      type,
      options?.entityName,
      options?.entityId,
      options?.previousData,
      options?.updatedData,
      options?.action,
      options?.ipAddress,
      options?.userAgent,
      options?.isLogWithoutData,
      controllerPath,
    );
    this.emitAuditEvent(event);
  }

  emitInboundContainerUpdated(
    context: RequestContext,
    updatedData: Record<string, any>,
    containerNumber: string,
    message: string,
  ): void {
    const event = new InboundContainerUpdatedEvent(
      context.userId,
      context.userName,
      {},
      updatedData,
      containerNumber,
      message,
      context.ipAddress,
      context.userAgent,
      context.controllerPath,
    );
    this.emitAuditEvent(event);
  }
}
