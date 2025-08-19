import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';

import { Inventory } from 'src/entities/inventory.entity';
import {
  OrderConfirmationDto,
  OrderTypeEnum,
} from './dto/order-confirmation.dto';
import { AuditEventService } from 'src/audit-log/audit-event.service';
import { ConfigService } from '@nestjs/config';
import { WebhooksLogsService } from 'src/webhooks-logs/webhooks-logs.service';
import {
  WebHookLogType,
  WebHookStatusType,
} from 'src/entities/webhook_logs.entity';
import { Inbound } from 'src/entities/inbound.entity';
import dayjs from 'dayjs';
import {
  CustomOrders,
  CustomOrdersStatusEnum,
} from 'src/entities/custom_orders.entity';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private auditEventService: AuditEventService,
    private configService: ConfigService,
    private readonly webhookLogsService: WebhooksLogsService,

    @InjectRepository(Inbound)
    private inboundRepository: Repository<Inbound>,
  ) {}

  async findAll(queryDto: QueryInventoryDto): Promise<Inventory[]> {
    const {
      sku,
      materialType,
      materialColor,
      shape,
      minQuantity,
      maxQuantity,
      minLength,
      maxLength,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      vendorDescription,
      materialNumber,
      lowStockThreshold,
      hasAllocatedQuantity,
      inStock,
    } = queryDto;

    const queryBuilder =
      this.inventoryRepository.createQueryBuilder('inventory');

    // Apply filters
    if (sku) {
      queryBuilder.andWhere('inventory.sku LIKE :sku', { sku: `%${sku}%` });
    }

    if (materialType) {
      queryBuilder.andWhere('inventory.materialType = :materialType', {
        materialType,
      });
    }

    if (materialColor) {
      queryBuilder.andWhere('inventory.materialColor = :materialColor', {
        materialColor,
      });
    }

    if (shape) {
      queryBuilder.andWhere('inventory.shape = :shape', { shape });
    }

    if (materialNumber) {
      queryBuilder.andWhere('inventory.materialNumber = :materialNumber', {
        materialNumber,
      });
    }

    if (vendorDescription) {
      queryBuilder.andWhere(
        'inventory.vendorDescription LIKE :vendorDescription',
        {
          vendorDescription: `%${vendorDescription}%`,
        },
      );
    }

    if (minQuantity !== undefined) {
      queryBuilder.andWhere('inventory.quantity >= :minQuantity', {
        minQuantity,
      });
    }

    if (maxQuantity !== undefined) {
      queryBuilder.andWhere('inventory.quantity <= :maxQuantity', {
        maxQuantity,
      });
    }

    if (minLength !== undefined) {
      queryBuilder.andWhere('inventory.length >= :minLength', { minLength });
    }

    if (maxLength !== undefined) {
      queryBuilder.andWhere('inventory.length <= :maxLength', { maxLength });
    }

    if (lowStockThreshold !== undefined) {
      queryBuilder.andWhere('inventory.quantity < :lowStockThreshold', {
        lowStockThreshold,
      });
    }

    if (hasAllocatedQuantity) {
      queryBuilder.andWhere('inventory.allocatedQuantity > 0');
    }

    if (inStock) {
      queryBuilder.andWhere('inventory.inHandQuantity > 0');
    }

    // Apply sorting
    queryBuilder.orderBy(`inventory.${sortBy}`, sortOrder);

    return await queryBuilder.getMany();
  }

  async findOneBySku(sku: string): Promise<Inventory | null> {
    try {
      // Validate SKU parameter
      if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
        throw new BadRequestException('SKU must be a non-empty string');
      }
      const trimmedSku = sku.trim();

      return await this.inventoryRepository.findOne({
        where: { sku: trimmedSku },
        relations: ['inventoryLocations'],
      });
    } catch (error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
  }

  async update(updateInventoryDto: UpdateInventoryDto, req: any) {
    const { id, ...updateData } = updateInventoryDto;

    const existing = await this.inventoryRepository.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.inventoryRepository.update(id, {
      vendorDescription: updateData.vendorDescription || null,
      stripInsert: updateData.stripInsert || null,
      shape: updateData.shape || null,
      materialType: updateData.materialType || null,
      materialColor: updateData.materialColor || null,
      updatedAt: new Date(),
    });

    const updatedInventory = await this.inventoryRepository.findOne({
      where: { id },
    });

    // Log inventory update with before/after data
    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };
      this.auditEventService.emitInventoryUpdated(
        requestContext,
        existing,
        updatedInventory,
        id,
      );
    }
    return updatedInventory;
  }

  async findQuantityBySKU(
    sku: string | string[],
    req: any,
  ): Promise<{ inventory: Inventory[]; inbound: Inbound[] }> {
    const webhookKey = this.configService.get<string>('WEBHOOK_KEY');

    if (!webhookKey) {
      throw new Error('Web hook key not configured');
    }

    const incomingKey = req?.headers['x-webhook-key'];
    if (!incomingKey) {
      throw new UnauthorizedException('Missing X-Webhook-Key header');
    }
    if (incomingKey !== webhookKey) {
      throw new UnauthorizedException('Not a valid key');
    }

    // Validate SKU input
    if (
      !sku ||
      (Array.isArray(sku) && sku.length === 0) ||
      (typeof sku === 'string' && !sku.trim())
    ) {
      throw new BadRequestException(
        'SKU must be a non-empty string or array of strings.',
      );
    }

    // ---- Inventory Query ----
    const inventoryQuery =
      this.inventoryRepository.createQueryBuilder('inventory');
    if (Array.isArray(sku)) {
      const conditions = sku.map(
        (_, index) => `inventory.sku LIKE :sku${index}`,
      );
      const parameters = sku.reduce((acc, val, index) => {
        acc[`sku${index}`] = `${val}%`;
        return acc;
      }, {});
      inventoryQuery.andWhere(conditions.join(' OR '), parameters);
    } else {
      inventoryQuery.andWhere('inventory.sku LIKE :sku', { sku: `${sku}%` });
    }

    // ---- Inbound Query ----
    const inboundQuery = this.inboundRepository.createQueryBuilder('inbound');

    // Filter by SKU
    if (Array.isArray(sku)) {
      const conditions = sku.map((_, index) => `inbound.sku LIKE :sku${index}`);
      const parameters = sku.reduce((acc, val, index) => {
        acc[`sku${index}`] = `${val}%`;
        return acc;
      }, {});
      inboundQuery.andWhere(conditions.join(' OR '), parameters);
    } else {
      inboundQuery.andWhere('inbound.sku LIKE :sku', { sku: `${sku}%` });
    }

    // Filter ETA between today and +3 days
    const today = dayjs().format('YYYY-MM-DD');
    const threeDaysLater = dayjs().add(3, 'day').format('YYYY-MM-DD');

    inboundQuery.andWhere('inbound.eta BETWEEN :startDate AND :endDate', {
      startDate: today,
      endDate: threeDaysLater,
    });

    // Order by earliest ETA
    inboundQuery.orderBy('inbound.eta', 'ASC');

    const [inventory, inboundRaw] = await Promise.all([
      inventoryQuery.getMany(),
      inboundQuery.getMany(),
    ]);

    // Filter and map inbound with computed `inHandQuantity`
    const inbound = inboundRaw
      .map((record) => ({
        ...record,
        inHandQuantity:
          parseFloat(record.quantity) -
          (parseFloat(record.preBookedQuantity) || 0),
      }))
      .filter((record) => record.inHandQuantity > 0);

    return { inventory, inbound };
  }

  async orderConfirmation(payload: OrderConfirmationDto, req: any) {
    const webhookKey = this.configService.get<string>('WEBHOOK_KEY');
    let webhookLogId: string | null = null;
    try {
      if (!webhookKey) throw new Error('Web hook key not configured');

      const incomingKey = req?.headers['x-webhook-key'];
      if (!incomingKey)
        throw new UnauthorizedException('Missing X-Webhook-Key header');
      if (incomingKey !== webhookKey)
        throw new UnauthorizedException('Not a valid key');

      const { qty, sku, type, id } = payload;

      const webhookLog = await this.webhookLogsService.create({
        type: WebHookLogType.ORDER_CONFIRMATION,
        status: WebHookStatusType.RECEIVED,
        request: payload,
        ipAddress: req?.ip,
        description: 'Order confirmation webhook received.',
      });
      webhookLogId = webhookLog.id;

      const result = await this.inventoryRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const parsedQty = parseInt(qty);
          if (isNaN(parsedQty) || parsedQty <= 0) {
            throw new BadRequestException(
              'Quantity must be a valid positive number',
            );
          }

          if (type === OrderTypeEnum.INVENTORY) {
            const inventory = await transactionalEntityManager
              .createQueryBuilder(Inventory, 'inventory')
              .where('inventory.sku = :sku', { sku })
              .setLock('pessimistic_write')
              .getOne();

            if (!inventory) throw new NotFoundException('No Inventory Found!');

            const inHandQty = parseInt(inventory.inHandQuantity || '0');
            const allocatedQty = parseInt(inventory.allocatedQuantity || '0');

            const parsedQty = parseInt(qty);

            if (isNaN(inHandQty) || isNaN(parsedQty) || isNaN(allocatedQty)) {
              throw new BadRequestException('Invalid quantity values');
            }

            if (parsedQty <= 0) {
              throw new BadRequestException('Quantity must be positive');
            }

            if (parsedQty > inHandQty) {
              throw new BadRequestException(
                'Qty cant be more than in-hand qty',
              );
            }

            const updatedInHand = inHandQty - parsedQty;
            const updatedAllocated = allocatedQty + parsedQty;

            const updatedRows = await transactionalEntityManager.update(
              Inventory,
              { id: inventory.id },
              {
                inHandQuantity: updatedInHand.toString(),
                allocatedQuantity: updatedAllocated.toString(),
              },
            );

            return {
              status: 'OK',
              type,
              updated: {
                inHandQuantity: updatedInHand,
                allocatedQuantity: updatedAllocated,
              },
              updatedRows: updatedRows.affected,
              data: await this.inventoryRepository.findOne({
                where: { id: inventory.id },
              }),
            };
          }

          if (type === OrderTypeEnum.INBOUND) {
            if (!id)
              throw new BadRequestException(
                'id is required when type = inbound',
              );

            const inbound = await transactionalEntityManager.findOne(Inbound, {
              where: { id, sku },
            });
            if (!inbound)
              throw new NotFoundException(
                'Inbound record not found for given id & sku',
              );

            const inboundQty = parseInt(inbound.quantity || '0');
            const preBooked = parseInt(inbound.preBookedQuantity || '0');
            const availableQty = inboundQty - preBooked;

            if (parsedQty > availableQty) {
              throw new BadRequestException(
                `Requested quantity (${parsedQty}) exceeds available inbound quantity (${availableQty}).`,
              );
            }

            const updatedPreBooked = preBooked + parsedQty;

            const updatedRows = await transactionalEntityManager.update(
              Inbound,
              { id: inbound.id },
              { preBookedQuantity: updatedPreBooked.toString() },
            );

            return {
              status: 'OK',
              type,
              updated: { preBookedQuantity: updatedPreBooked },
              updatedRows: updatedRows.affected,
              data: await transactionalEntityManager.findOne(Inbound, {
                where: { id: inbound.id },
              }),
            };
          }

          if (type === OrderTypeEnum.CUSTOM) {
            const customOrder = transactionalEntityManager.create(
              CustomOrders,
              {
                sku,
                quantity: parsedQty.toString(),
                status: CustomOrdersStatusEnum.CREATED,
              },
            );

            const updatedRows =
              await transactionalEntityManager.save(customOrder);

            return {
              status: 'OK',
              type,
              updatedRows: updatedRows ? 1 : 0,
              data: customOrder,
            };
          }

          throw new BadRequestException('Invalid type provided');
        },
      );

      await this.webhookLogsService.markAsStored(
        webhookLogId,
        result,
        `Order confirmation processed successfully for SKU: ${sku}, Type: ${payload.type}.`,
      );

      return result;
    } catch (error) {
      if (webhookLogId) {
        await this.webhookLogsService.markAsError(
          webhookLogId,
          `Order confirmation failed: ${error.message}`,
        );
      }
      throw new Error(`Order confirmation failed: ${error.message}`);
    }
  }
}
