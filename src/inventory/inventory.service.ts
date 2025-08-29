import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  UpdateInventoryDto,
  UpdateInventoryQuantityDto,
} from './dto/update-inventory.dto';
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
import { OrderUpdateDto } from './dto/order-update.dto';
import { InboundPreOrder } from 'src/entities/inbound-preorder.entity';

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

    @InjectRepository(InboundPreOrder)
    private inboundPreOrderRepository: Repository<InboundPreOrder>,
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

    // ---- Get only relevant preOrders (matching inbound SKUs) ----
    const inboundSkus = [...new Set(inboundRaw.map((r) => r.sku))];

    // ---- PreOrder Query ----
    let preOrders: InboundPreOrder[] = [];

    if (inboundSkus.length > 0) {
      preOrders = await this.inboundPreOrderRepository
        .createQueryBuilder('preOrder')
        .where('preOrder.sku IN (:...skus)', { skus: inboundSkus })
        .getMany();
    }
    // Convert to map for fast lookup
    const preOrderMap = new Map<string, number>();
    for (const order of preOrders) {
      preOrderMap.set(order.sku, Number(order.preBookedQuantity || 0));
    }

    // ---- Distribute PreOrders into inbound ----
    const inbound: any[] = [];

    const groupedInbound = inboundRaw.reduce(
      (acc, record) => {
        if (!acc[record.sku]) acc[record.sku] = [];
        acc[record.sku].push(record);
        return acc;
      },
      {} as Record<string, Inbound[]>,
    );

    for (const [skuKey, records] of Object.entries(groupedInbound)) {
      let remainingPreOrderQty = preOrderMap.get(skuKey) || 0;

      for (const record of records) {
        const recordQty = Number(record.quantity);
        let assignedPreOrder = 0;

        if (remainingPreOrderQty > 0) {
          if (recordQty >= remainingPreOrderQty) {
            assignedPreOrder = remainingPreOrderQty;
            remainingPreOrderQty = 0;
          } else {
            assignedPreOrder = recordQty;
            remainingPreOrderQty -= recordQty;
          }
        }

        inbound.push({
          ...record,
          preBookedQuantity: assignedPreOrder,
          inHandQuantity: recordQty - assignedPreOrder,
        });
      }
    }

    const filterInbound = inbound.filter((record) => record.inHandQuantity > 0);

    return { inventory, inbound: filterInbound };
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

            let preOrder = await transactionalEntityManager
              .createQueryBuilder(InboundPreOrder, 'preOrder')
              .where('preOrder.sku = :sku', { sku })
              .setLock('pessimistic_write')
              .getOne();

            if (!preOrder) {
              // if no record, create one with preBookedQuantity = 0
              preOrder = transactionalEntityManager.create(InboundPreOrder, {
                sku,
                preBookedQuantity: '0',
              });
              preOrder = await transactionalEntityManager.save(preOrder);
            }

            if (parsedQty > inboundQty) {
              throw new BadRequestException(
                `Requested quantity (${parsedQty}) exceeds available inbound quantity (${inboundQty}).`,
              );
            }
            const preBooked = parseInt(preOrder.preBookedQuantity || '0');
            const updatedPreBooked = preBooked + parsedQty;

            preOrder.preBookedQuantity = updatedPreBooked.toString();
            const updatedRows = await transactionalEntityManager.save(preOrder);

            return {
              status: 'OK',
              type,
              updated: { preBookedQuantity: updatedPreBooked },
              updatedRows: updatedRows ? 1 : 0,
              data: {
                inbound,
                preOrder,
              },
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

  async orderUpdate(payload: OrderUpdateDto, req: any) {
    const webhookKey = this.configService.get<string>('WEBHOOK_KEY');
    let webhookLogId: string | null = null;

    try {
      if (!webhookKey) throw new Error('Web hook key not configured');

      const incomingKey = req?.headers['x-webhook-key'];
      if (!incomingKey)
        throw new UnauthorizedException('Missing X-Webhook-Key header');
      if (incomingKey !== webhookKey)
        throw new UnauthorizedException('Not a valid key');

      const { updated, new: newOrder } = payload;

      // Validate payload structure
      if (!updated || !newOrder) {
        throw new BadRequestException(
          'Both updated and new order objects are required',
        );
      }

      const webhookLog = await this.webhookLogsService.create({
        type: WebHookLogType.ORDER_UPDATE,
        status: WebHookStatusType.RECEIVED,
        request: payload,
        ipAddress: req?.ip,
        description: 'Order update webhook received.',
      });
      webhookLogId = webhookLog.id;

      const result = await this.inventoryRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Validate quantities
          const updatedQty = parseInt(updated.qty);
          const newQty = parseInt(newOrder.qty);

          if (isNaN(updatedQty) || updatedQty <= 0) {
            throw new BadRequestException(
              'Updated quantity must be a valid positive number',
            );
          }

          if (isNaN(newQty) || newQty <= 0) {
            throw new BadRequestException(
              'New quantity must be a valid positive number',
            );
          }

          // Get the types for both orders (they can be different)
          const updatedOrderType = updated.type;
          const newOrderType = newOrder.type;
          let reverseResult: any = null;
          let applyResult: any = null;

          // STEP 1: Reverse the old order
          if (updatedOrderType === OrderTypeEnum.INVENTORY) {
            reverseResult = await this.reverseInventoryOrder(
              transactionalEntityManager,
              updated.sku,
              updatedQty,
            );
          } else if (updatedOrderType === OrderTypeEnum.INBOUND) {
            if (!updated.id) {
              throw new BadRequestException(
                'ID is required for inbound order reversal',
              );
            }
            reverseResult = await this.reverseInboundOrder(
              transactionalEntityManager,
              updated.id,
              updated.sku,
              updatedQty,
            );
          } else if (updatedOrderType === OrderTypeEnum.CUSTOM) {
            if (!updated.id) {
              throw new BadRequestException(
                'Custom order id is required for custom order reversal',
              );
            }
            reverseResult = await this.reverseCustomOrder(
              transactionalEntityManager,
              updated.id,
              updated.sku,
              updatedQty,
            );
          }

          // STEP 2: Apply the new order
          if (newOrderType === OrderTypeEnum.INVENTORY) {
            applyResult = await this.applyInventoryOrder(
              transactionalEntityManager,
              newOrder.sku,
              newQty,
            );
          } else if (newOrderType === OrderTypeEnum.INBOUND) {
            if (!newOrder.id) {
              throw new BadRequestException(
                'ID is required for new inbound order',
              );
            }
            applyResult = await this.applyInboundOrder(
              transactionalEntityManager,
              newOrder.id,
              newOrder.sku,
              newQty,
            );
          } else if (newOrderType === OrderTypeEnum.CUSTOM) {
            applyResult = await this.applyCustomOrder(
              transactionalEntityManager,
              newOrder.sku,
              newQty,
            );
          }

          return {
            status: 'OK',
            updatedOrderType,
            newOrderType,
            reversed: reverseResult,
            applied: applyResult,
            summary: {
              oldOrder: updated,
              newOrder: newOrder,
              quantityChange: newQty - updatedQty,
              typeChanged: updatedOrderType !== newOrderType,
            },
          };
        },
      );

      await this.webhookLogsService.markAsStored(
        webhookLogId,
        result,
        `Order update processed successfully. Changed from SKU: ${updated.sku}, Qty: ${updated.qty} to SKU: ${newOrder.sku}, Qty: ${newOrder.qty}.`,
      );

      return result;
    } catch (error) {
      if (webhookLogId) {
        await this.webhookLogsService.markAsError(
          webhookLogId,
          `Order update failed: ${error.message}`,
        );
      }
      throw new Error(`Order update failed: ${error.message}`);
    }
  }

  // Helper method to reverse inventory order
  private async reverseInventoryOrder(
    transactionalEntityManager: any,
    sku: string,
    qty: number,
  ) {
    const inventory = await transactionalEntityManager
      .createQueryBuilder(Inventory, 'inventory')
      .where('inventory.sku = :sku', { sku })
      .setLock('pessimistic_write')
      .getOne();

    if (!inventory)
      throw new NotFoundException('Inventory not found for reversal');

    const inHandQty = parseInt(inventory.inHandQuantity || '0');
    const allocatedQty = parseInt(inventory.allocatedQuantity || '0');

    if (isNaN(inHandQty) || isNaN(allocatedQty)) {
      throw new BadRequestException('Invalid inventory quantity values');
    }

    // Check if we have enough allocated quantity to reverse
    if (qty > allocatedQty) {
      throw new BadRequestException(
        `Cannot reverse ${qty} items. Only ${allocatedQty} items are currently allocated.`,
      );
    }

    // Reverse: Add back to in-hand, subtract from allocated
    const updatedInHand = inHandQty + qty;
    const updatedAllocated = allocatedQty - qty;

    await transactionalEntityManager.update(
      Inventory,
      { id: inventory.id },
      {
        inHandQuantity: updatedInHand.toString(),
        allocatedQuantity: updatedAllocated.toString(),
      },
    );

    return {
      sku,
      reversed: {
        inHandQuantity: updatedInHand,
        allocatedQuantity: updatedAllocated,
      },
      data: await transactionalEntityManager.findOne(Inventory, {
        where: { id: inventory.id },
      }),
    };
  }

  // Helper method to apply new inventory order
  private async applyInventoryOrder(
    transactionalEntityManager: any,
    sku: string,
    qty: number,
  ) {
    const inventory = await transactionalEntityManager
      .createQueryBuilder(Inventory, 'inventory')
      .where('inventory.sku = :sku', { sku })
      .setLock('pessimistic_write')
      .getOne();

    if (!inventory)
      throw new NotFoundException('Inventory not found for new order');

    const inHandQty = parseInt(inventory.inHandQuantity || '0');
    const allocatedQty = parseInt(inventory.allocatedQuantity || '0');

    if (isNaN(inHandQty) || isNaN(allocatedQty)) {
      throw new BadRequestException('Invalid inventory quantity values');
    }

    // Check if we have enough in-hand quantity
    if (qty > inHandQty) {
      throw new BadRequestException(
        `Cannot allocate ${qty} items. Only ${inHandQty} items available in-hand.`,
      );
    }

    // Apply: Subtract from in-hand, add to allocated
    const updatedInHand = inHandQty - qty;
    const updatedAllocated = allocatedQty + qty;

    await transactionalEntityManager.update(
      Inventory,
      { id: inventory.id },
      {
        inHandQuantity: updatedInHand.toString(),
        allocatedQuantity: updatedAllocated.toString(),
      },
    );

    return {
      sku,
      applied: {
        inHandQuantity: updatedInHand,
        allocatedQuantity: updatedAllocated,
      },
      data: await transactionalEntityManager.findOne(Inventory, {
        where: { id: inventory.id },
      }),
    };
  }

  // Helper method to reverse inbound order
  private async reverseInboundOrder(
    transactionalEntityManager: any,
    id: string,
    sku: string,
    qty: number,
  ) {
    const inbound = await transactionalEntityManager.findOne(Inbound, {
      where: { id, sku },
    });

    if (!inbound) {
      throw new NotFoundException('Inbound record not found for reversal');
    }

    // Lock preOrder row for update
    const preOrder = await transactionalEntityManager
      .createQueryBuilder(InboundPreOrder, 'preOrder')
      .where('preOrder.sku = :sku', { sku })
      .setLock('pessimistic_write')
      .getOne();

    if (!preOrder) {
      throw new BadRequestException(
        `No pre-booked record found for SKU ${sku}`,
      );
    }

    const preBooked = parseInt(preOrder.preBookedQuantity || '0');

    if (qty > preBooked) {
      throw new BadRequestException(
        `Cannot reverse ${qty} items. Only ${preBooked} items are pre-booked.`,
      );
    }

    const updatedPreBooked = preBooked - qty;

    preOrder.preBookedQuantity = updatedPreBooked.toString();
    await transactionalEntityManager.save(preOrder);

    return {
      id,
      sku,
      reversed: { preBookedQuantity: updatedPreBooked },
      data: {
        inbound,
        preOrder,
      },
    };
  }

  // Helper method to apply new inbound order
  private async applyInboundOrder(
    transactionalEntityManager: any,
    id: string,
    sku: string,
    qty: number,
  ) {
    const inbound = await transactionalEntityManager.findOne(Inbound, {
      where: { id, sku },
    });

    if (!inbound) {
      throw new NotFoundException('Inbound record not found for new order');
    }

    const inboundQty = parseInt(inbound.quantity || '0');

    // Lock preOrder row for update
    let preOrder = await transactionalEntityManager
      .createQueryBuilder(InboundPreOrder, 'preOrder')
      .where('preOrder.sku = :sku', { sku })
      .setLock('pessimistic_write')
      .getOne();

    if (!preOrder) {
      preOrder = transactionalEntityManager.create(InboundPreOrder, {
        sku,
        preBookedQuantity: '0',
      });
      preOrder = await transactionalEntityManager.save(preOrder);
    }

    if (qty > inboundQty) {
      throw new BadRequestException(
        `Requested quantity (${qty}) exceeds available inbound quantity (${inboundQty}).`,
      );
    }
    const preBooked = parseInt(preOrder.preBookedQuantity || '0');
    const updatedPreBooked = preBooked + qty;

    preOrder.preBookedQuantity = updatedPreBooked.toString();
    await transactionalEntityManager.save(preOrder);

    return {
      id,
      sku,
      applied: { preBookedQuantity: updatedPreBooked },
      data: {
        inbound,
        preOrder,
      },
    };
  }

  // Helper method to apply new custom order
  private async applyCustomOrder(
    transactionalEntityManager: any,
    sku: string,
    qty: number,
  ) {
    const customOrder = transactionalEntityManager.create(CustomOrders, {
      sku,
      quantity: qty.toString(),
      status: CustomOrdersStatusEnum.CREATED,
    });

    const savedOrder = await transactionalEntityManager.save(customOrder);

    return {
      sku,
      applied: { quantity: qty },
      data: savedOrder,
    };
  }
  // Helper method to reverse custom order
  private async reverseCustomOrder(
    transactionalEntityManager: any,
    customOrderId: string,
    sku: string,
    qtyToReverse: number,
  ) {
    const customOrder = await transactionalEntityManager.findOne(CustomOrders, {
      where: { id: customOrderId, sku },
    });

    if (!customOrder) {
      throw new NotFoundException('Custom order record not found for reversal');
    }

    // Delete the entire record if quantities match
    await transactionalEntityManager.delete(CustomOrders, {
      id: customOrderId,
    });

    return {
      id: customOrderId,
      sku,
      action: 'DELETED',
      reversedQuantity: qtyToReverse,
      remainingQuantity: 0,
      data: null,
    };
  }

  async updateQuantity(
    updateInventoryDto: UpdateInventoryQuantityDto,
    req: any,
  ) {
    const { id, allocatedQuantity, inHandQuantity } = updateInventoryDto;

    const existing = await this.inventoryRepository.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.inventoryRepository.update(id, {
      allocatedQuantity: allocatedQuantity || null,
      inHandQuantity: inHandQuantity || null,
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
      this.auditEventService.emitInventoryQuantityUpdated(
        requestContext,
        existing,
        updatedInventory,
        id,
      );
    }
    return updatedInventory;
  }
}
