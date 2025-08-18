import { AuditLogType } from 'src/entities/auditLog.entity';

export class AuditEvent {
  constructor(
    public readonly userId: string,
    public readonly userName: string,
    public readonly type: AuditLogType,
    public readonly entityName?: string,
    public readonly entityId?: string,
    public readonly previousData?: Record<string, any>,
    public readonly updatedData?: Record<string, any>,
    public readonly action?: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    public readonly isLogWithoutData?: boolean,
    public readonly controllerPath?: string,
  ) {}
}

export class InventoryCreatedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    inventoryData: Record<string, any>,
    inventoryId: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.ADD_INVENTORY,
      'inventory',
      inventoryId,
      null,
      inventoryData,
      'created',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}

export class InventoryUpdatedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    previousData: Record<string, any>,
    updatedData: Record<string, any>,
    inventoryId: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.UPDATE_INVENTORY,
      'inventory',
      inventoryId,
      previousData,
      updatedData,
      'updated',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}

export class InventoryDeletedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    inventoryData: Record<string, any>,
    inventoryId: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.DELETE_INVENTORY,
      'inventory',
      inventoryId,
      inventoryData,
      null,
      'deleted',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}

export class UserLoginEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.LOGIN,
      null,
      null,
      null,
      null,
      'logged in',
      ipAddress,
      userAgent,
      true,
      controllerPath,
    );
  }
}

export class UserLogoutEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.LOGIN,
      null,
      null,
      null,
      null,
      'logged out',
      ipAddress,
      userAgent,
      true,
      controllerPath,
    );
  }
}

export class InventoryLocationCreatedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    inventoryLocationData: Record<string, any>,
    inventoryLocationId: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.ADD_INVENTORY_LOCATION,
      'inventory location',
      inventoryLocationId,
      null,
      inventoryLocationData,
      'created',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}

export class InventoryLocationUpdatedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    previousData: Record<string, any>,
    updatedData: Record<string, any>,
    inventoryLocationId: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.UPDATE_INVENTORY_LOCATION,
      'inventory location',
      inventoryLocationId,
      previousData,
      updatedData,
      'updated',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}

export class InboundCreatedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    inboundData: Record<string, any>,
    inboundId: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.ADD_INBOUND,
      'inbound',
      inboundId,
      null,
      inboundData,
      'created',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}

export class InboundUpdatedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    previousData: Record<string, any>,
    updatedData: Record<string, any>,
    inboundId: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.UPDATE_INBOUND,
      'inbound',
      inboundId,
      previousData,
      updatedData,
      'updated',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}

export class InboundDeletedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    inboundData: Record<string, any>,
    inboundId: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.DELETE_INBOUND,
      'inbound',
      inboundId,
      inboundData,
      null,
      'deleted',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}

export class InboundContainerUpdatedEvent extends AuditEvent {
  constructor(
    userId: string,
    userName: string,
    previousData: Record<string, any>,
    updatedData: Record<string, any>,
    containerNumber: string,
    message: string,
    ipAddress?: string,
    userAgent?: string,
    controllerPath?: string,
  ) {
    super(
      userId,
      userName,
      AuditLogType.UPDATE_INBOUND,
      `inbound ${message}`,
      containerNumber,
      previousData,
      updatedData,
      'updated',
      ipAddress,
      userAgent,
      false,
      controllerPath,
    );
  }
}
