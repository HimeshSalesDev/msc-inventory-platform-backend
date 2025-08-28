import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as Papa from 'papaparse';
import { DataSource, IsNull, QueryRunner, Repository } from 'typeorm';

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

import { InventoryReference } from 'src/entities/inventory_reference.entity';
import { parseSKU, validateSKU } from 'src/lib/sku.util';
import { findActualCsvKey, normalizeKey } from 'src/lib/stringUtils';
import {
  CreateInventoryLocationDto,
  CreateScannerInventoryLocationDto,
} from './dto/create-inventory-location.dto';
import { GetLocationByNumberOrSkuDto } from './dto/get-inventory.dto';
import { ImportCSVLocationsDto } from './dto/import-csv-location.dto';
import {
  FindBySkuOrNumberResponseDto,
  InventoryLocationResponseDto,
  InventoryLocationWithSkuResponseDto,
} from './dto/inventory-location-response.dto';
import { QueryInventoryLocationDto } from './dto/query-inventory-location.dto';
import {
  RemoveQuantityDto,
  RemoveQuantityResponseDto,
} from './dto/remove-quantity.dto';
import { InventoryLocation } from 'src/entities/inventory_location.entity';
import { Inventory } from 'src/entities/inventory.entity';
import {
  InventoryMovement,
  InventoryMovementTypeEnums,
} from 'src/entities/inventory_movements.entity';
import { Inbound } from 'src/entities/inbound.entity';
import { InboundPreOrder } from 'src/entities/inbound-preorder.entity';

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

type ImportRow = Record<string, unknown>;

interface FailedRow extends ImportRow {
  errorMessage: string;
  _hasErrors: true;
}
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

    @InjectRepository(Inbound)
    private readonly inboundReference: Repository<Inbound>,

    @InjectRepository(InventoryReference)
    private readonly inboundPreOrderReference: Repository<InboundPreOrder>,
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

    // const inventoryReference = await queryRunner.manager.findOne(
    //   InventoryReference,
    //   {
    //     where: { number: proNumber },
    //   },
    // );

    // if (!inventoryReference) {
    //   throw new NotFoundException(
    //     `Inventory Reference with proNumber ${proNumber} not found`,
    //   );
    // }

    // if (inventoryReference.status === InventoryReferenceStatus.DELIVERED) {
    //   throw new BadRequestException(
    //     `Inventory Reference with proNumber ${proNumber} has already been delivered`,
    //   );
    // }

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

    // Create inventory movement record for removal
    const inventoryMovement = queryRunner.manager.create(InventoryMovement, {
      sku: inventory.sku,
      type: InventoryMovementTypeEnums.OUT,
      quantity: parseInt(removeQuantity.toString(), 10),
      binNumber: inventoryLocation.binNumber,
      location: inventoryLocation.location,
      proNumber: null,
      userId: req?.user?.id || null,
      reason: null,
    });
    await queryRunner.manager.save(InventoryMovement, inventoryMovement);

    // await queryRunner.manager.update(
    //   InventoryReference,
    //   inventoryReference.id,
    //   {
    //     status: InventoryReferenceStatus.DELIVERED,
    //   },
    // );

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

          // Get actual CSV headers as they appear in the file
          const csvHeaders = Object.keys(data[0] || {}).filter(
            (col) => col.trim() !== '',
          );

          // Create mapping of normalized keys to actual CSV headers
          const actualHeaderMap = new Map<string, string>();
          csvHeaders.forEach((header) => {
            actualHeaderMap.set(normalizeKey(header), header);
          });

          // Validate required columns
          const actualColumns = csvHeaders.filter((col) =>
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
                const actualKey = findActualCsvKey(row, field);

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
                const actualKey = findActualCsvKey(row, field);
                const value = actualKey ? row[actualKey] || '0' : '0';
                if (actualKey) {
                  row[actualKey] = value;
                }
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
                _actualHeaders: actualHeaderMap, // Store the mapping for import
              };
            },
          );

          resolve({
            data: validatedData,
            totalRows: data.length,
            validationErrors,
            columns: actualColumns, // These are the actual CSV headers as they appear in file
            filename,
            hasErrors: validationErrors.length > 0,
            actualHeaderMap: Object.fromEntries(actualHeaderMap), // Send mapping to frontend
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
    const failedImports: FailedRow[] = [];

    try {
      // Group data by SKU to handle multiple locations per SKU efficiently
      const groupedData: Record<string, ImportRow[]> =
        this.groupDataBySku(dataToImport);

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

          const failedData: FailedRow[] = rows.map((row) => ({
            ...row,
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            _hasErrors: true,
          }));

          failedImports.push(...failedData);
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
        select: ['sku'],
      });

      if (inventoryReference) {
        inventoryData = await this.inventoryRepository.findOne({
          where: { sku: inventoryReference.sku },
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

    // Use the mapping logic to handle case-insensitive header matching
    for (const [expectedCsvKey, prismaKey] of Object.entries(
      LOCATION_CSV_TO_SQL_KEY_MAP,
    )) {
      // Find the actual key in the row that matches the expected CSV key
      const actualCsvKey = findActualCsvKey(row, expectedCsvKey);
      let value = actualCsvKey ? row[actualCsvKey] : undefined;

      // Convert numeric strings to number values
      const numberKeys = Object.values(LOCATION_CSV_TO_SQL_KEY_MAP).filter(
        (key) => LOCATION_IMPORT_NUMERIC_FIELDS.includes(key),
      );

      if (numberKeys.includes(prismaKey)) {
        value = value ? parseFloat(value) : 0;
      }

      mappedData[prismaKey] = value;
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

      let mappedData = null;

      if (rows && rows?.length > 0) {
        mappedData = rows[0].mappedData;
      }

      inventory = queryRunner.manager.create(Inventory, {
        sku,
        quantity: '0',
        inHandQuantity: '0',
        vendorDescription: this.getValue(
          mappedData?.vendorDescription,
          productInfo.description,
        ),
        length: this.getValue(mappedData?.length, productInfo.length),
        skirt: this.getValue(mappedData?.skirt, productInfo.skirtLength),
        stripInsert: this.getValue(mappedData?.stripInsert, ''),
        shape: this.getValue(mappedData?.shape, ''),
        foamDensity: this.getValue(mappedData?.foamDensity, productInfo.foam),
        width: this.getValue(mappedData?.width, productInfo.width),
        radius: this.getValue(mappedData?.radius, productInfo.radius),
        taper: this.getValue(mappedData?.taper, productInfo.taper),
        materialNumber: this.getValue(
          mappedData?.materialNumber,
          productInfo?.colorCode?.toString(),
          null,
        ),
        materialColor: this.getValue(
          mappedData?.materialColor,
          productInfo?.colorName,
        ),
        materialType: this.getValue(mappedData?.materialType, ''),
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

      const inventoryMovement = queryRunner.manager.create(InventoryMovement, {
        sku,
        type: InventoryMovementTypeEnums.IN,
        quantity: parseInt(quantity, 10),
        binNumber,
        location,
        userId: user?.id || null,
        reason: null,
      });
      await queryRunner.manager.save(InventoryMovement, inventoryMovement);

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

    // Create inventory movement record
    const inventoryMovement = queryRunner.manager.create(InventoryMovement, {
      sku,
      type: InventoryMovementTypeEnums.IN,
      quantity: parseInt(quantity, 10),
      binNumber,
      location,
      userId: req?.user?.id || null,
      reason: null,
    });

    await queryRunner.manager.save(InventoryMovement, inventoryMovement);

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

  private getValue = (primaryValue, fallbackValue, defaultValue = ''): any => {
    const processValue = (value): any => {
      if (value === undefined || value === null) return null;
      const trimmed = value.toString().trim();
      return trimmed === '' ? null : trimmed;
    };

    const processedPrimary = processValue(primaryValue);
    if (processedPrimary !== null) {
      return processedPrimary;
    }

    const processedFallback = processValue(fallbackValue);
    if (processedFallback !== null) {
      return processedFallback;
    }

    return defaultValue;
  };

  async createFromScanner(
    createDto: CreateScannerInventoryLocationDto,
    req: any,
  ): Promise<InventoryLocationResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.createInventoryLocation(
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

  private async createInventoryLocation(
    queryRunner: QueryRunner,
    createDto: CreateInventoryLocationDto,
    req: any,
  ): Promise<InventoryLocationResponseDto> {
    const { sku, binNumber, location, quantity, containerNumber } = createDto;

    if (
      !containerNumber?.trim() ||
      !sku?.trim() ||
      !quantity ||
      BigInt(quantity) <= 0n ||
      !binNumber?.trim() ||
      !location?.trim()
    ) {
      throw new BadRequestException('Bad request');
    }

    let isNewInventory = false;
    let isNewLocation = false;
    let originalInventoryData: Inventory = null;
    let originalLocationData: InventoryLocation = null;
    let preOrderRecord: InboundPreOrder = null;
    let fullyScannedInboundRecords: Inbound[] = [];
    let preOrderAllocationAmount = 0n;

    // Container number is required
    const inboundRecords = await queryRunner.manager.find(Inbound, {
      where: {
        containerNumber: containerNumber.trim(),
        sku: sku.trim(),
        offloadedDate: IsNull(),
      },
      lock: { mode: 'pessimistic_write' },
      order: { createdAt: 'ASC' },
    });

    if (!inboundRecords || inboundRecords.length === 0) {
      throw new NotFoundException(
        `No valid inbound records found for container ${containerNumber} and SKU ${sku}. ` +
          `Either the container/SKU combination doesn't exist or all records have already been offloaded.`,
      );
    }

    // Calculate total available capacity across all inbound records
    let totalAvailableCapacity = 0n;
    for (const record of inboundRecords) {
      const currentScanned = BigInt(record.scannedQuantity || '0');
      const maxQty = BigInt(record.quantity || '0');
      const available = maxQty - currentScanned;
      if (available > 0n) {
        totalAvailableCapacity += available;
      }
    }

    const addQuantity = BigInt(quantity);
    if (addQuantity > totalAvailableCapacity) {
      throw new BadRequestException(
        `Requested quantity (${addQuantity.toString()}) exceeds total available capacity (${totalAvailableCapacity.toString()}) ` +
          `for container ${containerNumber} and SKU ${sku}`,
      );
    }

    // Distribute scanned qty across multiple inbound records
    let remainingToAllocate = addQuantity;
    const processedRecords: {
      record: Inbound;
      allocatedAmount: bigint;
      wasFullyScanned: boolean;
    }[] = [];

    for (const record of inboundRecords) {
      const currentScanned = BigInt(record.scannedQuantity || '0');
      const maxQty = BigInt(record.quantity || '0');
      const available = maxQty - currentScanned;

      if (available <= 0n) continue;

      const allocate =
        remainingToAllocate <= available ? remainingToAllocate : available;

      if (allocate > 0n) {
        const newScannedQuantity = currentScanned + allocate;

        await queryRunner.manager.update(Inbound, record.id, {
          scannedQuantity: newScannedQuantity.toString(),
        });

        const wasFullyScanned = newScannedQuantity >= maxQty;
        processedRecords.push({
          record: { ...record, scannedQuantity: newScannedQuantity.toString() },
          allocatedAmount: allocate,
          wasFullyScanned,
        });

        if (wasFullyScanned) {
          fullyScannedInboundRecords.push({
            ...record,
            scannedQuantity: newScannedQuantity.toString(),
          });
        }

        remainingToAllocate -= allocate;
      }

      if (remainingToAllocate === 0n) break;
    }

    if (remainingToAllocate > 0n) {
      throw new InternalServerErrorException(
        `Failed to allocate ${remainingToAllocate.toString()} units after processing all inbound records`,
      );
    }

    // Update offloaded date for fully scanned records
    const currentDate = new Date();
    for (const fullyScannedRecord of fullyScannedInboundRecords) {
      await queryRunner.manager.update(Inbound, fullyScannedRecord.id, {
        offloadedDate: currentDate,
      });
    }

    // Check for pre-orders
    preOrderRecord = await queryRunner.manager.findOne(InboundPreOrder, {
      where: { sku: sku.trim() },
      lock: { mode: 'pessimistic_write' },
    });

    // Find or create inventory with lock
    let inventory = await queryRunner.manager.findOne(Inventory, {
      where: { sku: sku.trim() },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      if (!validateSKU(sku)) {
        throw new BadRequestException(`Invalid SKU format: ${sku}`);
      }

      const productInfo = parseSKU(sku);
      inventory = queryRunner.manager.create(Inventory, {
        sku: sku.trim(),
        quantity: '0',
        inHandQuantity: '0',
        allocatedQuantity: '0',
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
      originalInventoryData = { ...inventory };
    }

    // Check if location already exists for this inventory and bin
    const existingLocation = await queryRunner.manager.findOne(
      InventoryLocation,
      {
        where: {
          inventoryId: inventory.id,
          binNumber: binNumber.trim(),
          location: location.trim(),
        },
        lock: { mode: 'pessimistic_write' },
      },
    );

    let inventoryLocation: InventoryLocation;

    if (existingLocation) {
      originalLocationData = { ...existingLocation };

      const oldQuantity = BigInt(existingLocation.quantity);
      const newQuantity = oldQuantity + addQuantity;

      await queryRunner.manager.update(InventoryLocation, existingLocation.id, {
        location: location.trim(),
        quantity: newQuantity.toString(),
      });

      inventoryLocation = await queryRunner.manager.findOne(InventoryLocation, {
        where: { id: existingLocation.id },
      });
    } else {
      inventoryLocation = queryRunner.manager.create(InventoryLocation, {
        inventoryId: inventory.id,
        binNumber: binNumber.trim(),
        location: location.trim(),
        quantity: quantity,
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

    // Handle pre-orders allocation
    let newInHandQuantity: bigint;
    let newAllocatedQuantity: bigint;

    if (
      preOrderRecord &&
      BigInt(preOrderRecord.preBookedQuantity || '0') > 0n
    ) {
      const currentAllocatedQuantity = BigInt(
        inventory.allocatedQuantity || '0',
      );
      const preBookedQuantity = BigInt(preOrderRecord.preBookedQuantity || '0');

      const allocateToOrders =
        addQuantity <= preBookedQuantity ? addQuantity : preBookedQuantity;
      const remainingQuantity = addQuantity - allocateToOrders;
      preOrderAllocationAmount = allocateToOrders; // Track for logging

      newAllocatedQuantity = currentAllocatedQuantity + allocateToOrders;
      newInHandQuantity =
        BigInt(inventory.inHandQuantity || '0') + remainingQuantity;

      if (allocateToOrders > 0n) {
        const newPreBookedQuantity = preBookedQuantity - allocateToOrders;
        await queryRunner.manager.update(InboundPreOrder, preOrderRecord.id, {
          preBookedQuantity: newPreBookedQuantity.toString(),
        });
      }
    } else {
      newAllocatedQuantity = BigInt(inventory.allocatedQuantity || '0');
      newInHandQuantity = BigInt(inventory.inHandQuantity || '0') + addQuantity;
    }

    // Update inventory quantities
    await queryRunner.manager.update(Inventory, inventory.id, {
      quantity: totalQuantity,
      inHandQuantity: newInHandQuantity.toString(),
      allocatedQuantity: newAllocatedQuantity.toString(),
    });

    // Create inventory movement record
    const inventoryMovement = queryRunner.manager.create(InventoryMovement, {
      sku: sku.trim(),
      type: InventoryMovementTypeEnums.IN,
      quantity: parseInt(quantity, 10),
      binNumber: binNumber.trim(),
      location: location.trim(),
      userId: req?.user?.id || null,
      reason: `Container scan: ${containerNumber.trim()}${preOrderAllocationAmount > 0n ? ` (${preOrderAllocationAmount.toString()} allocated to pre-orders)` : ''}`,
    });

    await queryRunner.manager.save(InventoryMovement, inventoryMovement);

    // Get updated inventory for audit
    const updatedInventory = await queryRunner.manager.findOne(Inventory, {
      where: { id: inventory.id },
    });

    // Audit logging
    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };

      try {
        // Log inventory location operations
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

        // Log inventory operations
        if (isNewInventory) {
          this.auditEventService.emitInventoryCreated(
            requestContext,
            updatedInventory,
            inventory.id,
          );
        } else if (
          originalInventoryData.quantity !== updatedInventory.quantity ||
          originalInventoryData.inHandQuantity !==
            updatedInventory.inHandQuantity ||
          originalInventoryData.allocatedQuantity !==
            updatedInventory.allocatedQuantity
        ) {
          this.auditEventService.emitInventoryUpdated(
            requestContext,
            originalInventoryData,
            updatedInventory,
            inventory.id,
          );
        }

        // Log inbound scanning operations for each processed record
        for (const {
          record,
          allocatedAmount,
          wasFullyScanned,
        } of processedRecords) {
          const existingData = {
            scannedQuantity: (
              parseFloat(record.scannedQuantity) -
              parseFloat(allocatedAmount.toString())
            ).toString(),
            ...(wasFullyScanned ? { offloadedDate: null } : {}),
          };

          const updatedData = {
            scannedQuantity: record.scannedQuantity,
            ...(wasFullyScanned ? { offloadedDate: currentDate } : {}),
          };

          // Emit  inbound scanning audit event
          this.auditEventService.emitInboundUpdated(
            requestContext,
            existingData,
            updatedData,
            record.id,
          );
        }

        // Log pre-order allocation if any
        if (preOrderAllocationAmount > 0n && preOrderRecord) {
          const existingData = {
            preBookedQuantity: preOrderRecord.preBookedQuantity,
          };
          const updatedData = {
            preBookedQuantity: (
              parseFloat(preOrderRecord.preBookedQuantity) -
              parseFloat(preOrderAllocationAmount.toString())
            ).toString(),
          };

          // Emit custom pre-order allocation audit event
          this.auditEventService.emitInboundPreOrderUpdated(
            requestContext,
            existingData,
            updatedData,
            preOrderRecord.id,
          );
        }
      } catch (auditError) {
        this.logger.error('Error creating audit logs:', auditError);
      }
    }

    return InventoryLocationResponseDto.fromEntity(
      inventoryLocation,
      totalQuantity,
      sku.trim(),
    );
  }
}
