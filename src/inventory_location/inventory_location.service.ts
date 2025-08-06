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
import * as Papa from 'papaparse';

import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { UpdateInventoryLocationDto } from './dto/update-inventory-location.dto';
import { QueryInventoryLocationDto } from './dto/query-inventory-location.dto';
import {
  FindBySkuOrNumberResponseDto,
  InventoryLocationResponseDto,
  InventoryLocationWithSkuResponseDto,
} from './dto/inventory-location-response.dto';
import { InventoryLocation } from 'src/entities/inventory_location.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { parseSKU, validateSKU } from 'src/lib/sku.util';
import { GetLocationByNumberOrSkuDto } from './dto/get-inventory.dto';
import { InventoryReference } from 'src/entities/inventory_reference.entity';
import {
  RemoveQuantityDto,
  RemoveQuantityResponseDto,
} from './dto/remove-quantity.dto';
import { AuditEventService } from 'src/audit-log/audit-event.service';
import {
  DEFAULT_LOCATION,
  LOCATION_CSV_FILE_COLUMNS,
  LOCATION_CSV_PREVIEW_NUMERIC_FIELDS,
  LOCATION_CSV_REQUIRED_FIELDS,
  LOCATION_CSV_TO_SQL_KEY_MAP,
  LOCATION_CSV_VALIDATION_REQUIRED_FIELDS,
  LOCATION_IMPORT_NUMERIC_FIELDS,
} from 'src/constants/csv';
import { normalizeKey } from 'src/lib/stringUtils';
import { ImportCSVLocationsDto } from './dto/import-csv-location.dto';

type TotalQuantityResult = {
  total: string | null;
};

type InventoryLocationResponse = {
  data: InventoryLocationWithSkuResponseDto[];
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
    private auditEventService: AuditEventService,
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

  async removeQuantity(
    removeDto: RemoveQuantityDto,
    req: any,
  ): Promise<RemoveQuantityResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.removeQuantityFromLocation(
        queryRunner,
        removeDto,
        req,
      );
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to remove quantity from location: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to remove quantity from location',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async removeQuantityFromLocation(
    queryRunner: QueryRunner,
    removeDto: RemoveQuantityDto,
    req: any,
  ): Promise<RemoveQuantityResponseDto> {
    const { inventoryLocationId, quantity } = removeDto;

    // Validate quantity early
    let removeQuantity: bigint;
    try {
      removeQuantity = BigInt(quantity);
      if (removeQuantity <= 0n) {
        throw new BadRequestException('Quantity must be positive');
      }
    } catch (error) {
      throw new BadRequestException('Invalid quantity format');
    }

    // Find inventory location with lock
    const inventoryLocation = await queryRunner.manager.findOne(
      InventoryLocation,
      {
        where: { id: inventoryLocationId },
        lock: { mode: 'pessimistic_write' },
        relations: ['inventory'], // Assuming you have this relation
      },
    );

    if (!inventoryLocation) {
      throw new NotFoundException(
        `Inventory location with ID ${inventoryLocationId} not found`,
      );
    }

    // Get inventory with lock (if not included in relations)
    const inventory =
      inventoryLocation.inventory ||
      (await queryRunner.manager.findOne(Inventory, {
        where: { id: inventoryLocation.inventoryId },
        lock: { mode: 'pessimistic_write' },
      }));

    if (!inventory) {
      throw new NotFoundException('Associated inventory not found');
    }

    // Store original data for audit
    const originalLocationData = { ...inventoryLocation };
    const originalInventoryData = { ...inventory };

    // Validate available quantity
    const currentQuantity = BigInt(inventoryLocation.quantity);

    const allocatedQuantity = BigInt(inventory.allocatedQuantity || '0');

    if (removeQuantity > currentQuantity) {
      throw new BadRequestException(
        `Cannot remove ${quantity} units. Only ${currentQuantity.toString()} units available in this location.`,
      );
    }

    if (removeQuantity > allocatedQuantity) {
      throw new BadRequestException(
        `Cannot remove quantity: ${removeQuantity.toString()} for sku: ${inventory.sku}. Allocated quantity: ${allocatedQuantity.toString()} must be greater than or equal to the removal quantity.`,
      );
    }

    // Calculate new quantity
    const newQuantity = currentQuantity - removeQuantity;

    const newAllocatedQuantity = allocatedQuantity - removeQuantity;

    // Update inventory location
    await queryRunner.manager.update(InventoryLocation, inventoryLocationId, {
      quantity: newQuantity.toString(),
    });

    // Get updated inventory location
    const updatedLocation = {
      ...inventoryLocation,
      quantity: newQuantity.toString(),
    };

    // Calculate total quantity across all locations for this inventory
    const totalQuantity =
      await this.calculateTotalQuantityForInventoryWithQueryRunner(
        queryRunner,
        inventory.id,
      );

    // Update inventory total quantity
    await queryRunner.manager.update(Inventory, inventory.id, {
      quantity: totalQuantity,
      allocatedQuantity: newAllocatedQuantity.toString(),
    });

    // Get updated inventory for audit
    const updatedInventory = {
      ...inventory,
      quantity: totalQuantity,
    };

    // Audit logging after successful transaction
    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };

      try {
        // Log inventory location quantity removal
        this.auditEventService.emitInventoryLocationUpdated(
          requestContext,
          originalLocationData,
          updatedLocation,
          inventoryLocationId,
        );

        // Log inventory quantity update (if changed)
        if (originalInventoryData.quantity !== updatedInventory.quantity) {
          this.auditEventService.emitInventoryUpdated(
            requestContext,
            originalInventoryData,
            updatedInventory,
            inventory.id,
          );
        }

        this.logger.log(
          `Quantity removal successful - SKU: ${inventory.sku}, Location: ${inventoryLocation.location}, Removed: ${removeQuantity.toString()}, Remaining: ${newQuantity.toString()}`,
        );
      } catch (auditError) {
        // Log audit errors but don't fail the main operation
        this.logger.error('Error creating audit logs:', auditError);
      }
    }

    return RemoveQuantityResponseDto.fromData(
      updatedLocation,
      totalQuantity,
      inventory.sku,
    );
  }

  async findAll(
    queryDto: QueryInventoryLocationDto,
  ): Promise<InventoryLocationResponse> {
    try {
      const { sku, binNumber, location, page, limit } = queryDto;

      // Only paginate if BOTH page AND limit are provided
      const shouldPaginate = page !== undefined && limit !== undefined;
      const pageNum = shouldPaginate ? Math.max(parseInt(page) || 1, 1) : 1;
      const limitNum = shouldPaginate
        ? Math.min(parseInt(limit) || 10, 100)
        : undefined;

      const queryBuilder = this.inventoryLocationRepository
        .createQueryBuilder('il')
        .leftJoinAndSelect('il.inventory', 'i')
        .orderBy('il.createdAt', 'DESC');

      if (sku) {
        queryBuilder.andWhere('LOWER(i.sku) LIKE LOWER(:sku)', {
          sku: `%${sku.trim()}%`,
        });
      }

      if (binNumber) {
        queryBuilder.andWhere('LOWER(il.binNumber) LIKE LOWER(:binNumber)', {
          binNumber: `%${binNumber.trim()}%`,
        });
      }

      if (location) {
        queryBuilder.andWhere('LOWER(il.location) LIKE LOWER(:location)', {
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
      console.dir({ inventoryLocations: inventoryLocations[0] });
      const responseData = await Promise.all(
        inventoryLocations.map(async (il) => {
          return InventoryLocationWithSkuResponseDto.fromEntity(
            il,
            il.inventory?.sku || '',
          );
        }),
      );

      const response: InventoryLocationResponse = {
        data: responseData,
      };

      // Only include pagination if both page and limit were provided
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

  async previewCsv(csvContent: string, filename: string): Promise<any> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            this.logger.error('CSV parse errors', results.errors);
            reject(
              new BadRequestException({
                error: 'Failed to parse CSV',
                details: results.errors,
              }),
            );
            return;
          }

          const data = results.data as any[];

          // Validate required columns
          const actualColumns = Object.keys(data[0] || {})
            .filter((col) => col.trim() !== '')
            .filter((col) =>
              LOCATION_CSV_FILE_COLUMNS.some(
                (allowedCol) => normalizeKey(allowedCol) === normalizeKey(col),
              ),
            );

          const normalizedActual = actualColumns.map(normalizeKey);

          const missingColumns = LOCATION_CSV_REQUIRED_FIELDS.filter(
            (requiredCol) =>
              !normalizedActual.includes(normalizeKey(requiredCol)),
          );

          if (missingColumns.length > 0) {
            reject(
              new BadRequestException({
                error: 'Missing required columns',
                missingColumns,
                foundColumns: actualColumns,
              }),
            );
            return;
          }

          // Validate data types and business rules
          const validationErrors: any[] = [];
          const validatedData = data.map(
            (row: Record<string, any>, index: number) => {
              const errors: string[] = [];

              // Validate required fields
              for (const field of LOCATION_CSV_VALIDATION_REQUIRED_FIELDS) {
                const actualKey = Object.keys(row).find(
                  (col) => normalizeKey(col) === normalizeKey(field),
                );

                let value = actualKey ? row[actualKey] : undefined;
                if (field === 'Location' && !actualKey) {
                  row[field] = DEFAULT_LOCATION;
                  value = DEFAULT_LOCATION;
                }

                if (!value?.toString().trim()) {
                  errors.push(`${field} is required`);
                }
              }

              // Validate numeric fields
              for (const field of LOCATION_CSV_PREVIEW_NUMERIC_FIELDS) {
                const actualKey = Object.keys(row).find(
                  (col) => normalizeKey(col) === normalizeKey(field),
                );
                const value = actualKey ? row[actualKey] : undefined;
                if (value && isNaN(parseInt(value))) {
                  errors.push(`${field} must be a valid number`);
                }
                if (parseInt(value) < 0) {
                  errors.push(`${field} must be a positive number`);
                }
              }

              if (errors.length > 0) {
                validationErrors.push({ row: index + 1, errors });
              }

              const cleanedRow = Object.fromEntries(
                Object.entries(row)
                  .filter(([key]) => key.trim() !== '')
                  .filter(([key]) =>
                    LOCATION_CSV_FILE_COLUMNS.some(
                      (allowedKey) =>
                        normalizeKey(allowedKey) === normalizeKey(key),
                    ),
                  ),
              );

              return {
                ...cleanedRow,
                _rowIndex: index + 1,
                _hasErrors: errors.length > 0,
              };
            },
          );

          resolve({
            data: validatedData,
            totalRows: data.length,
            validationErrors,
            columns: Object.keys(validatedData[0] || {})
              .filter((col) => col.trim() !== '')
              .filter((col) =>
                LOCATION_CSV_FILE_COLUMNS.some(
                  (allowedCol) =>
                    normalizeKey(allowedCol) === normalizeKey(col),
                ),
              ),
            filename,
            hasErrors: validationErrors.length > 0,
          });
        },
      });
    });
  }

  async importCsv(
    data: ImportCSVLocationsDto[],
    filename: string,
    skipErrors: boolean = false,
    user: any,
  ): Promise<any> {
    const dataToImport = skipErrors
      ? data.filter((row) => !row._hasErrors)
      : data;

    if (dataToImport.length === 0) {
      throw new BadRequestException('No valid data to import');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const successfulImports: any[] = [];
    const failedImports: any[] = [];

    try {
      // Group data by SKU to handle multiple locations per SKU efficiently
      const groupedData = this.groupDataBySku(dataToImport);

      for (const [sku, rows] of Object.entries(groupedData)) {
        try {
          const results = await this.processBulkInventoryLocations(
            queryRunner,
            sku,
            rows,
            user,
          );
          successfulImports.push(...results);
        } catch (error) {
          this.logger.error(`Error processing SKU ${sku}`, {
            error,
            filename,
            sku,
            rowCount: rows.length,
            user: user?.email,
          });

          // Add all rows for this SKU to failed imports
          failedImports.push(
            ...rows.map((row) => ({
              row: row._rowIndex,
              data: row,
              error: error instanceof Error ? error.message : 'Unknown error',
            })),
          );
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return {
      success: true,
      filename,
      totalProcessed: dataToImport.length,
      imported: successfulImports.length,
      failed: failedImports.length,
      failures: failedImports,
      importedItems: successfulImports,
    };
  }

  private groupDataBySku(data: ImportCSVLocationsDto[]): Record<string, any[]> {
    return data.reduce((acc, row) => {
      const mappedData = this.mapCsvRowToDto(row);
      const sku = mappedData.sku;

      if (!acc[sku]) {
        acc[sku] = [];
      }
      acc[sku].push({ ...row, mappedData });
      return acc;
    }, {});
  }

  private mapCsvRowToDto(row: any): any {
    const mappedData: any = {};

    for (const [csvKey, prismaKey] of Object.entries(
      LOCATION_CSV_TO_SQL_KEY_MAP,
    )) {
      let value = row[csvKey];

      // Convert numeric strings to number values
      const numberKeys = Object.values(LOCATION_CSV_TO_SQL_KEY_MAP).filter(
        (key) => LOCATION_IMPORT_NUMERIC_FIELDS.includes(key),
      );

      if (numberKeys.includes(prismaKey)) {
        value = value ? parseFloat(value) : null;
      }

      mappedData[prismaKey] = value || null;
    }

    return mappedData;
  }

  private async processBulkInventoryLocations(
    queryRunner: QueryRunner,
    sku: string,
    rows: any[],
    user: any,
  ): Promise<any[]> {
    let isNewInventory = false;
    let originalInventoryData: Inventory = null;
    const results: any[] = [];

    // Create request context for audit logging
    const requestContext = user
      ? {
          userId: user.id,
          userName: user.fullName,
          ipAddress: user.ipAddress,
          userAgent: user.userAgent,
          controllerPath: '/inventory-location/bulk-import',
        }
      : null;

    // Find or create inventory with lock
    let inventory = await queryRunner.manager.findOne(Inventory, {
      where: { sku },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      if (!validateSKU(sku)) {
        throw new BadRequestException(`Invalid SKU format: ${sku}`);
      }

      const productInfo = parseSKU(sku);
      inventory = queryRunner.manager.create(Inventory, {
        sku,
        quantity: '0',
        inHandQuantity: '0',
        vendorDescription: productInfo.description || '',
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

    let totalQuantityToAdd = BigInt(0);

    // Process each location for this SKU
    for (const row of rows) {
      const { mappedData } = row;
      const { binNumber, location, quantity } = mappedData;

      let isNewLocation = false;
      let originalLocationData: InventoryLocation = null;

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

      // Add to total quantity for this SKU
      totalQuantityToAdd += BigInt(quantity);

      // Audit logging for location operations
      if (requestContext) {
        try {
          if (isNewLocation) {
            this.auditEventService.emitInventoryLocationCreated(
              requestContext,
              inventoryLocation,
              inventoryLocation.id,
            );
          } else {
            this.auditEventService.emitInventoryLocationUpdated(
              requestContext,
              originalLocationData,
              inventoryLocation,
              inventoryLocation.id,
            );
          }
        } catch (auditError) {
          this.logger.error('Error creating location audit logs:', auditError);
        }
      }

      results.push({
        ...row,
        inventoryLocation,
        inventoryId: inventory.id,
      });
    }

    // Calculate total quantity across all locations for this inventory
    const totalQuantity =
      await this.calculateTotalQuantityForInventoryWithQueryRunner(
        queryRunner,
        inventory.id,
      );

    // Calculate new inHandQuantity by adding received quantity to existing inHandQuantity
    const currentInHandQuantity = BigInt(inventory.inHandQuantity || '0');
    const newInHandQuantity = currentInHandQuantity + totalQuantityToAdd;

    // Update inventory total quantity and inHandQuantity
    await queryRunner.manager.update(Inventory, inventory.id, {
      quantity: totalQuantity,
      inHandQuantity: newInHandQuantity.toString(),
    });

    // Get updated inventory for audit
    const updatedInventory = await queryRunner.manager.findOne(Inventory, {
      where: { id: inventory.id },
    });

    // Audit logging for inventory operations
    if (requestContext) {
      try {
        if (isNewInventory) {
          this.auditEventService.emitInventoryCreated(
            requestContext,
            updatedInventory,
            inventory.id,
          );
        } else {
          // Only log inventory update if quantity actually changed
          if (originalInventoryData.quantity !== updatedInventory.quantity) {
            this.auditEventService.emitInventoryUpdated(
              requestContext,
              originalInventoryData,
              updatedInventory,
              inventory.id,
            );
          }
        }
      } catch (auditError) {
        this.logger.error('Error creating inventory audit logs:', auditError);
      }
    }

    return results;
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
        inHandQuantity: '0',
        vendorDescription: productInfo.description || '',
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

    // Calculate new inHandQuantity by adding received quantity to existing inHandQuantity
    const currentInHandQuantity = BigInt(inventory.inHandQuantity || '0');
    const addQuantity = BigInt(quantity);
    const newInHandQuantity = currentInHandQuantity + addQuantity;

    // Update inventory total quantity and inHandQuantity
    await queryRunner.manager.update(Inventory, inventory.id, {
      quantity: totalQuantity,
      inHandQuantity: newInHandQuantity.toString(),
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
        controllerPath: req.route?.path || req.originalUrl,
      };
      try {
        // Log inventory location operation
        if (isNewLocation) {
          this.auditEventService.emitInventoryLocationCreated(
            requestContext,
            inventoryLocation,
            inventoryLocation.id,
          );
        } else {
          this.auditEventService.emitInventoryLocationUpdated(
            requestContext,
            originalLocationData,
            inventoryLocation,
            inventoryLocation.id,
          );
        }

        // Log inventory operation
        if (isNewInventory) {
          this.auditEventService.emitInventoryCreated(
            requestContext,
            updatedInventory,
            inventory.id,
          );
        } else {
          // Only log inventory update if quantity actually changed
          if (originalInventoryData.quantity !== updatedInventory.quantity) {
            this.auditEventService.emitInventoryUpdated(
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

  async getLocationBySkuOrPro(
    payload: GetLocationByNumberOrSkuDto,
  ): Promise<FindBySkuOrNumberResponseDto> {
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
    };
  }
}
