import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';

import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { UpdateInventoryLocationDto } from './dto/update-inventory-location.dto';
import { QueryInventoryLocationDto } from './dto/query-inventory-location.dto';
import { InventoryLocationResponseDto } from './dto/inventory-location-response.dto';
import { InventoryLocation } from 'src/entities/inventory_location.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { parseSKU, validateSKU } from 'src/lib/sku.util';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { GetLocationByNumberOrSkuDto } from './dto/get-inventory.dto';
import { InventoryReference } from 'src/entities/inventory_reference.entity';

type TotalQuantityResult = {
  total: string | null;
};

type InventoryLocationResponse = {
  data: InventoryLocationResponseDto[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
@Injectable()
export class InventoryLocationService {
  private readonly logger = new Logger(InventoryLocationService.name);

  constructor(
    @InjectRepository(InventoryLocation)
    private readonly inventoryLocationRepository: Repository<InventoryLocation>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryReference)
    private readonly inventoryReference: Repository<InventoryReference>,
    private readonly dataSource: DataSource,

    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    createDto: CreateInventoryLocationDto,
    req: any,
  ): Promise<InventoryLocationResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.createOrUpdateInventoryLocation(
        queryRunner,
        createDto,
        req,
      );
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create inventory location: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create inventory location',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    queryDto: QueryInventoryLocationDto,
  ): Promise<InventoryLocationResponse> {
    try {
      const { sku, binNumber, location, page, limit } = queryDto;

      const shouldPaginate = page !== undefined || limit !== undefined;
      const pageNum = shouldPaginate ? Math.max(parseInt(page) || 1, 1) : 1;
      const limitNum = shouldPaginate
        ? Math.min(parseInt(limit) || 10, 100)
        : undefined;

      const queryBuilder = this.inventoryLocationRepository
        .createQueryBuilder('il')
        .leftJoinAndSelect('il.inventory', 'i')
        .orderBy('il.createdAt', 'DESC');

      if (sku) {
        queryBuilder.andWhere('i.sku ILIKE :sku', { sku: `%${sku.trim()}%` });
      }

      if (binNumber) {
        queryBuilder.andWhere('il.binNumber ILIKE :binNumber', {
          binNumber: `%${binNumber.trim()}%`,
        });
      }

      if (location) {
        queryBuilder.andWhere('il.location ILIKE :location', {
          location: `%${location.trim()}%`,
        });
      }

      let inventoryLocations: InventoryLocation[] = [];
      let total = 0;

      if (shouldPaginate && limitNum !== undefined) {
        [inventoryLocations, total] = await queryBuilder
          .skip((pageNum - 1) * limitNum)
          .take(limitNum)
          .getManyAndCount();
      } else {
        inventoryLocations = await queryBuilder.getMany();
        total = inventoryLocations.length;
      }

      const responseData = await Promise.all(
        inventoryLocations.map(async (il) => {
          const totalQuantity = await this.calculateTotalQuantityForInventory(
            il.inventoryId,
          );
          return InventoryLocationResponseDto.fromEntity(
            il,
            totalQuantity,
            il.inventory.sku,
          );
        }),
      );

      const response: InventoryLocationResponse = {
        data: responseData,
      };

      if (shouldPaginate && limitNum !== undefined) {
        response.pagination = {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        };
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve inventory locations: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve inventory locations',
      );
    }
  }

  async findOne(id: string): Promise<InventoryLocationResponseDto> {
    try {
      const inventoryLocation = await this.inventoryLocationRepository.findOne({
        where: { id },
        relations: ['inventory'],
      });

      if (!inventoryLocation) {
        throw new NotFoundException(
          `Inventory location with ID ${id} not found`,
        );
      }

      const totalQuantity = await this.calculateTotalQuantityForInventory(
        inventoryLocation.inventoryId,
      );

      return InventoryLocationResponseDto.fromEntity(
        inventoryLocation,
        totalQuantity,
        inventoryLocation.inventory.sku,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve inventory location: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve inventory location',
      );
    }
  }

  async update(
    id: string,
    updateDto: UpdateInventoryLocationDto,
  ): Promise<InventoryLocationResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find existing inventory location with lock
      const existingLocation = await queryRunner.manager.findOne(
        InventoryLocation,
        {
          where: { id },
          relations: ['inventory'],
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!existingLocation) {
        throw new NotFoundException(
          `Inventory location with ID ${id} not found`,
        );
      }

      // Check for unique constraint violation if binNumber is being updated
      if (
        updateDto.binNumber &&
        updateDto.binNumber !== existingLocation.binNumber
      ) {
        const conflictingLocation = await queryRunner.manager.findOne(
          InventoryLocation,
          {
            where: {
              inventoryId: existingLocation.inventoryId,
              binNumber: updateDto.binNumber,
            },
          },
        );

        if (conflictingLocation) {
          throw new ConflictException(
            `Bin number ${updateDto.binNumber} already exists for this inventory item`,
          );
        }
      }

      const oldQuantity = BigInt(existingLocation.quantity);
      const newQuantity = updateDto.quantity
        ? BigInt(updateDto.quantity)
        : oldQuantity;

      // Update the inventory location
      await queryRunner.manager.update(InventoryLocation, id, {
        binNumber: updateDto.binNumber || existingLocation.binNumber,
        location: updateDto.location || existingLocation.location,
        quantity: newQuantity.toString(),
      });

      // Recalculate and update inventory total quantity
      const totalQuantity =
        await this.calculateTotalQuantityForInventoryWithQueryRunner(
          queryRunner,
          existingLocation.inventoryId,
        );

      await queryRunner.manager.update(
        Inventory,
        existingLocation.inventoryId,
        {
          quantity: totalQuantity,
        },
      );

      // Get updated record
      const updatedLocation = await queryRunner.manager.findOne(
        InventoryLocation,
        {
          where: { id },
          relations: ['inventory'],
        },
      );

      await queryRunner.commitTransaction();

      return InventoryLocationResponseDto.fromEntity(
        updatedLocation,
        totalQuantity,
        updatedLocation.inventory.sku,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to update inventory location: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update inventory location',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const inventoryLocation = await queryRunner.manager.findOne(
        InventoryLocation,
        {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!inventoryLocation) {
        throw new NotFoundException(
          `Inventory location with ID ${id} not found`,
        );
      }

      const inventoryId = inventoryLocation.inventoryId;

      // Delete the inventory location
      await queryRunner.manager.delete(InventoryLocation, id);

      // Recalculate and update inventory total quantity
      const totalQuantity =
        await this.calculateTotalQuantityForInventoryWithQueryRunner(
          queryRunner,
          inventoryId,
        );

      await queryRunner.manager.update(Inventory, inventoryId, {
        quantity: totalQuantity,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to delete inventory location: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to delete inventory location',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findBySkuAndBin(
    sku: string,
    binNumber: string,
  ): Promise<InventoryLocationResponseDto | null> {
    try {
      const inventory = await this.inventoryRepository.findOne({
        where: { sku },
      });
      if (!inventory) {
        return null;
      }

      const inventoryLocation = await this.inventoryLocationRepository.findOne({
        where: {
          inventoryId: inventory.id,
          binNumber: binNumber,
        },
        relations: ['inventory'],
      });

      if (!inventoryLocation) {
        return null;
      }

      const totalQuantity = await this.calculateTotalQuantityForInventory(
        inventory.id,
      );

      return InventoryLocationResponseDto.fromEntity(
        inventoryLocation,
        totalQuantity,
        sku,
      );
    } catch (error) {
      this.logger.error(
        `Failed to find inventory location by SKU and bin: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to find inventory location',
      );
    }
  }

  private async createOrUpdateInventoryLocation(
    queryRunner: QueryRunner,
    createDto: CreateInventoryLocationDto,
    req: any,
  ): Promise<InventoryLocationResponseDto> {
    const { sku, binNumber, location, quantity } = createDto;

    let isNewInventory = false;
    let isNewLocation = false;
    let originalInventoryData: Inventory = null;
    let originalLocationData: InventoryLocation = null;

    // Find or create inventory with lock
    let inventory = await queryRunner.manager.findOne(Inventory, {
      where: { sku },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      if (!validateSKU(sku)) {
        throw new BadRequestException('Invalid SKU format');
      }

      const productInfo = parseSKU(sku);
      // Create new inventory record
      inventory = queryRunner.manager.create(Inventory, {
        sku,
        quantity: '0', // Will be updated after location creation
        length: productInfo.length,
        skirt: productInfo.skirtLength,
        foamDensity: productInfo.foam,
        width: productInfo.width,
        radius: productInfo.radius,
        taper: productInfo.taper,
        materialNumber: productInfo.colorCode
          ? productInfo.colorCode.toString()
          : null,
        materialColor: productInfo.colorName,
      });
      inventory = await queryRunner.manager.save(Inventory, inventory);
      isNewInventory = true;
    } else {
      // Store original inventory data for audit
      originalInventoryData = { ...inventory };
    }

    // Check if location already exists for this inventory and bin
    const existingLocation = await queryRunner.manager.findOne(
      InventoryLocation,
      {
        where: {
          inventoryId: inventory.id,
          binNumber: binNumber,
          location,
        },
        lock: { mode: 'pessimistic_write' },
      },
    );

    let inventoryLocation: InventoryLocation;

    if (existingLocation) {
      // Store original location data for audit
      originalLocationData = { ...existingLocation };

      // Update existing location - add quantities
      const oldQuantity = BigInt(existingLocation.quantity);
      const addQuantity = BigInt(quantity);
      const newQuantity = oldQuantity + addQuantity;

      await queryRunner.manager.update(InventoryLocation, existingLocation.id, {
        location,
        quantity: newQuantity.toString(),
      });

      inventoryLocation = await queryRunner.manager.findOne(InventoryLocation, {
        where: { id: existingLocation.id },
      });
    } else {
      // Create new location
      inventoryLocation = queryRunner.manager.create(InventoryLocation, {
        inventoryId: inventory.id,
        binNumber: binNumber,
        location,
        quantity,
      });
      inventoryLocation = await queryRunner.manager.save(
        InventoryLocation,
        inventoryLocation,
      );
      isNewLocation = true;
    }

    // Calculate total quantity across all locations for this inventory
    const totalQuantity =
      await this.calculateTotalQuantityForInventoryWithQueryRunner(
        queryRunner,
        inventory.id,
      );

    // Update inventory total quantity
    await queryRunner.manager.update(Inventory, inventory.id, {
      quantity: totalQuantity,
    });

    // Get updated inventory for audit
    const updatedInventory = await queryRunner.manager.findOne(Inventory, {
      where: { id: inventory.id },
    });

    // Audit logging after successful transaction
    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
      };
      try {
        // Log inventory location operation
        if (isNewLocation) {
          await this.auditLogService.logInventoryLocationCreate(
            requestContext,
            {
              ...inventoryLocation,
              sku: sku,
            },
            inventoryLocation.id,
          );
        } else {
          await this.auditLogService.logInventoryLocationUpdate(
            requestContext,
            {
              ...originalLocationData,
              sku: sku,
            },
            {
              ...inventoryLocation,
              sku: sku,
            },
            inventoryLocation.id,
          );
        }

        // Log inventory operation
        if (isNewInventory) {
          await this.auditLogService.logInventoryCreate(
            requestContext,
            updatedInventory,
            inventory.id,
          );
        } else {
          // Only log inventory update if quantity actually changed
          if (originalInventoryData.quantity !== updatedInventory.quantity) {
            await this.auditLogService.logInventoryUpdate(
              requestContext,
              originalInventoryData,
              updatedInventory,
              inventory.id,
            );
          }
        }
      } catch (auditError) {
        // Log audit errors but don't fail the main operation
        this.logger.error('Error creating audit logs:', auditError);
      }
    }

    return InventoryLocationResponseDto.fromEntity(
      inventoryLocation,
      totalQuantity,
      sku,
    );
  }

  private async calculateTotalQuantityForInventory(
    inventoryId: string,
  ): Promise<string> {
    const result = await this.inventoryLocationRepository
      .createQueryBuilder('il')
      .select('SUM(CAST(il.quantity AS DECIMAL))', 'total')
      .where('il.inventoryId = :inventoryId', { inventoryId })
      .getRawOne<TotalQuantityResult>();

    return result?.total ? result.total.toString() : '0';
  }

  private async calculateTotalQuantityForInventoryWithQueryRunner(
    queryRunner: QueryRunner,
    inventoryId: string,
  ): Promise<string> {
    const result = await queryRunner.manager
      .createQueryBuilder(InventoryLocation, 'il')
      .select('SUM(CAST(il.quantity AS DECIMAL))', 'total')
      .where('il.inventoryId = :inventoryId', { inventoryId })
      .getRawOne<TotalQuantityResult>();

    return result?.total ? result.total.toString() : '0';
  }

  async findLocationsByInventoryId(
    inventoryId: string,
    page: number,
    limit: number,
  ) {
    try {
      const skip = (page - 1) * limit;

      // First check if inventory exists
      const inventory = await this.inventoryRepository.findOne({
        where: { id: inventoryId },
      });

      if (!inventory) {
        throw new NotFoundException(
          `Inventory with ID ${inventoryId} not found`,
        );
      }

      const [inventoryLocations, total] =
        await this.inventoryLocationRepository.findAndCount({
          where: { inventoryId },
          order: { createdAt: 'DESC' },
          skip,
          take: limit,
        });

      const totalQuantity =
        await this.calculateTotalQuantityForInventory(inventoryId);

      const responseData = inventoryLocations.map((il) =>
        InventoryLocationResponseDto.fromEntity(
          il,
          totalQuantity,
          inventory.sku,
        ),
      );

      return {
        data: responseData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          totalQuantity,
          locationCount: total,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve locations for inventory: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve inventory locations',
      );
    }
  }

  async bulkCreateUpdate(createDtos: CreateInventoryLocationDto[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results = [];
      let createdCount = 0;
      let updatedCount = 0;

      for (const dto of createDtos) {
        const { sku, binNumber, location, quantity } = dto;

        // Find or create inventory with lock
        let inventory = await queryRunner.manager.findOne(Inventory, {
          where: { sku },
          lock: { mode: 'pessimistic_write' },
        });

        let isNewInventory = false;
        if (!inventory) {
          inventory = queryRunner.manager.create(Inventory, {
            sku,
            quantity: '0',
          });
          inventory = await queryRunner.manager.save(Inventory, inventory);
          isNewInventory = true;
        }

        // Check if location exists
        const existingLocation = await queryRunner.manager.findOne(
          InventoryLocation,
          {
            where: {
              inventoryId: inventory.id,
              binNumber: binNumber,
            },
            lock: { mode: 'pessimistic_write' },
          },
        );

        let inventoryLocation: InventoryLocation;
        let wasUpdated = false;

        if (existingLocation) {
          // Update existing location
          const oldQuantity = BigInt(existingLocation.quantity);
          const addQuantity = BigInt(quantity);
          const newQuantity = oldQuantity + addQuantity;

          await queryRunner.manager.update(
            InventoryLocation,
            existingLocation.id,
            {
              location,
              quantity: newQuantity.toString(),
            },
          );

          inventoryLocation = await queryRunner.manager.findOne(
            InventoryLocation,
            {
              where: { id: existingLocation.id },
            },
          );
          wasUpdated = true;
          updatedCount++;
        } else {
          // Create new location
          inventoryLocation = queryRunner.manager.create(InventoryLocation, {
            inventoryId: inventory.id,
            binNumber: binNumber,
            location,
            quantity,
          });
          inventoryLocation = await queryRunner.manager.save(
            InventoryLocation,
            inventoryLocation,
          );
          createdCount++;
        }

        // Calculate and update total quantity for this inventory
        const totalQuantity =
          await this.calculateTotalQuantityForInventoryWithQueryRunner(
            queryRunner,
            inventory.id,
          );

        await queryRunner.manager.update(Inventory, inventory.id, {
          quantity: totalQuantity,
        });

        results.push(
          InventoryLocationResponseDto.fromEntity(
            inventoryLocation,
            totalQuantity,
            sku,
          ),
        );
      }

      await queryRunner.commitTransaction();

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Bulk operation completed successfully',
        data: {
          processed: createDtos.length,
          created: createdCount,
          updated: updatedCount,
          results,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Bulk operation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Bulk operation failed - all changes rolled back',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getAnalyticsSummary(sku?: string) {
    try {
      const baseQuery = this.inventoryLocationRepository
        .createQueryBuilder('il')
        .leftJoinAndSelect('il.inventory', 'i');

      if (sku) {
        baseQuery.where('i.sku = :sku', { sku });
      }

      // Get basic counts and totals
      const totalLocations = await baseQuery.getCount();

      const totalQuantityResult = await baseQuery
        .select('SUM(CAST(il.quantity AS DECIMAL))', 'total')
        .getRawOne();

      const totalQuantity = totalQuantityResult?.total
        ? totalQuantityResult.total.toString()
        : '0';

      // Get unique inventory items count
      const uniqueInventoryQuery =
        this.inventoryRepository.createQueryBuilder('i');
      if (sku) {
        uniqueInventoryQuery.where('i.sku = :sku', { sku });
      }
      const totalInventoryItems = await uniqueInventoryQuery.getCount();

      // Calculate average quantity per location
      const averageQuantityPerLocation =
        totalLocations > 0
          ? (BigInt(totalQuantity) / BigInt(totalLocations)).toString()
          : '0';

      // Get top locations by total quantity
      const topLocationsQuery = this.inventoryLocationRepository
        .createQueryBuilder('il')
        .leftJoin('il.inventory', 'i')
        .select([
          'il.location as location',
          'SUM(CAST(il.quantity AS DECIMAL)) as totalQuantity',
          'COUNT(*) as itemCount',
        ])
        .groupBy('il.location')
        .orderBy('totalQuantity', 'DESC')
        .limit(10);

      if (sku) {
        topLocationsQuery.where('i.sku = :sku', { sku });
      }

      const topLocations = await topLocationsQuery.getRawMany();

      // Get top bins by quantity
      const topBinsQuery = this.inventoryLocationRepository
        .createQueryBuilder('il')
        .leftJoin('il.inventory', 'i')
        .select([
          'il.binNumber as binNumber',
          'il.quantity as totalQuantity',
          'il.location as location',
        ])
        .orderBy('CAST(il.quantity AS DECIMAL)', 'DESC')
        .limit(10);

      if (sku) {
        topBinsQuery.where('i.sku = :sku', { sku });
      }

      const topBins = await topBinsQuery.getRawMany();

      return {
        statusCode: HttpStatus.OK,
        message: 'Analytics summary retrieved successfully',
        data: {
          totalLocations,
          totalInventoryItems,
          totalQuantity,
          averageQuantityPerLocation,
          topLocations: topLocations.map((loc) => ({
            location: loc.location,
            totalQuantity: loc.totalQuantity?.toString() || '0',
            itemCount: parseInt(loc.itemCount) || 0,
          })),
          topBins: topBins.map((bin) => ({
            binNumber: bin.binNumber,
            totalQuantity: bin.totalQuantity?.toString() || '0',
            location: bin.location,
          })),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve analytics summary: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve analytics summary',
      );
    }
  }

  async getLocationBySkuOrPro(payload: GetLocationByNumberOrSkuDto) {
    const { skuOrNumber } = payload;

    if (!skuOrNumber?.trim()) {
      throw new BadRequestException('SKU or PRO number must be provided.');
    }

    let inventoryData: Inventory | null = null;

    inventoryData = await this.inventoryRepository.findOne({
      where: { sku: skuOrNumber },
    });

    if (!inventoryData) {
      const inventoryReference = await this.inventoryReference.findOne({
        where: { number: skuOrNumber },
        select: ['inventoryId'],
      });

      if (inventoryReference) {
        inventoryData = await this.inventoryRepository.findOne({
          where: { id: inventoryReference.inventoryId },
        });
      }
    }

    if (!inventoryData) {
      throw new NotFoundException(
        `No inventory found for the provided identifier: "${skuOrNumber}".`,
      );
    }

    const inventoryLocationData = await this.inventoryLocationRepository.find({
      where: { inventoryId: inventoryData.id },
      order: { createdAt: 'DESC' },
    });

    return {
      sku: inventoryData.sku,
      locations: inventoryLocationData,
      totalLocations: inventoryLocationData.length,
    };
  }
}
