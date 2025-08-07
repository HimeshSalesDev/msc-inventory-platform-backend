import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';

import { Inventory } from 'src/entities/inventory.entity';
import { OrderConfirmationDto } from './dto/order-confirmation.dto';
import { AuditEventService } from 'src/audit-log/audit-event.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private auditEventService: AuditEventService,
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

  async findQuantityBySKU(sku: string | string[]): Promise<Inventory[]> {
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

    const queryBuilder =
      this.inventoryRepository.createQueryBuilder('inventory');

    // Apply filters
    if (Array.isArray(sku)) {
      // Filter with multiple `LIKE` conditions using OR
      const conditions = sku.map(
        (val, index) => `inventory.sku LIKE :sku${index}`,
      );
      const parameters = sku.reduce((acc, val, index) => {
        acc[`sku${index}`] = `${val}%`;
        return acc;
      }, {});

      queryBuilder.andWhere(conditions.join(' OR '), parameters);
    } else {
      // Single string
      queryBuilder.andWhere('inventory.sku LIKE :sku', { sku: `${sku}%` });
    }

    return await queryBuilder.getMany();
  }

  async orderConfirmation(payload: OrderConfirmationDto) {
    const { qty, sku } = payload;

    return await this.inventoryRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const inventory = await transactionalEntityManager
          .createQueryBuilder(Inventory, 'inventory') // Use entity class
          .where('inventory.sku = :sku', { sku })
          .setLock('pessimistic_write')
          .getOne();

        if (!inventory) {
          throw new NotFoundException('No Inventory Found!');
        }

        const inHandQty = parseInt(inventory.inHandQuantity || '0');
        const allocatedQuantity = parseInt(inventory.allocatedQuantity || '0');
        const parsedQty = parseInt(qty);

        if (isNaN(inHandQty) || isNaN(parsedQty) || isNaN(allocatedQuantity)) {
          throw new BadRequestException('Invalid quantity values');
        }

        if (parsedQty <= 0) {
          throw new BadRequestException('Quantity must be positive');
        }

        if (parsedQty > inHandQty) {
          throw new BadRequestException('Qty cant be more than in-hand qty');
        }

        const updatedInHand = inHandQty - parsedQty;
        const updatedAllocated = allocatedQuantity + parsedQty;

        const updatedRows = await transactionalEntityManager.update(
          Inventory,
          { id: inventory.id },
          {
            inHandQuantity: updatedInHand.toString(),
            allocatedQuantity: updatedAllocated.toString(),
          },
        );

        this.logger.log(
          `Order confirmation successful for SKU: ${sku} | Quantity: ${qty} | Previous In Hand/Allocated QTY: ${inHandQty}/${allocatedQuantity} | Updated In Hand/Allocated QTY: ${updatedInHand}/${updatedAllocated}`,
        );

        return {
          status: 'OK',
          updatedRows: updatedRows.affected,
        };
      },
    );
  }
}
