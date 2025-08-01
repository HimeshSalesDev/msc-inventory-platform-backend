import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Papa from 'papaparse';

import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';

import { Inventory } from 'src/entities/inventory.entity';
import {
  CSV_FILE_COLUMNS,
  CSV_TO_PRISMA_INVENTORY_MAP,
  IMPORT_NUMERIC_FIELDS,
  PREVIEW_NUMERIC_FIELDS,
  REQUIRED_FIELDS,
} from 'src/constants/csv';
import { normalizeKey } from 'src/lib/stringUtils';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { InventoryInHandQuantityResponseDto } from './dto/inventory-inhand-quantity-response.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,

    private readonly auditLogService: AuditLogService,
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

  async create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    // Check for duplicate SKU
    const existing = await this.inventoryRepository.findOne({
      where: { sku: createInventoryDto.sku },
    });

    if (existing) {
      throw new ConflictException(
        `Inventory with SKU "${createInventoryDto.sku}" already exists.`,
      );
    }

    const inventory = this.inventoryRepository.create({
      ...createInventoryDto,
      width: createInventoryDto.width || null,
      radius: createInventoryDto.radius || null,
      quantity: createInventoryDto.quantity || null,
      allocatedQuantity: createInventoryDto.quantity || null,
      inHandQuantity: createInventoryDto.quantity || null,
    });

    return await this.inventoryRepository.save(inventory);
  }

  async update(updateInventoryDto: UpdateInventoryDto, req: any) {
    const { id, ...updateData } = updateInventoryDto;

    const existing = await this.inventoryRepository.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }

    // Check for duplicate SKU if SKU is being updated
    if (updateData.sku && updateData.sku !== existing.sku) {
      const duplicate = await this.inventoryRepository.findOne({
        where: { sku: updateData.sku },
      });

      if (duplicate) {
        throw new ConflictException(
          `Inventory with SKU "${updateData.sku}" already exists.`,
        );
      }
    }

    const updated = await this.inventoryRepository.save({
      ...existing,
      ...updateData,
      width: updateData.width || null,
      radius: updateData.radius || null,
      quantity: updateData.quantity || null,
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
      };
      await this.auditLogService.logInventoryUpdate(
        requestContext,
        existing,
        updatedInventory,
        id,
      );
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.inventoryRepository.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.inventoryRepository.delete(id);
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
              CSV_FILE_COLUMNS.some(
                (allowedCol) => normalizeKey(allowedCol) === normalizeKey(col),
              ),
            );

          const normalizedActual = actualColumns.map(normalizeKey);

          const missingColumns = CSV_FILE_COLUMNS.filter(
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
              for (const field of REQUIRED_FIELDS) {
                const actualKey = Object.keys(row).find(
                  (col) => normalizeKey(col) === normalizeKey(field),
                );
                const value = actualKey ? row[actualKey] : undefined;
                if (!value?.toString().trim()) {
                  errors.push(`${field} is required`);
                }
              }

              // Validate numeric fields
              for (const field of PREVIEW_NUMERIC_FIELDS) {
                const actualKey = Object.keys(row).find(
                  (col) => normalizeKey(col) === normalizeKey(field),
                );
                const value = actualKey ? row[actualKey] : undefined;
                if (value && isNaN(parseFloat(value))) {
                  errors.push(`${field} must be a valid number`);
                }
              }

              if (errors.length > 0) {
                validationErrors.push({ row: index + 1, errors });
              }

              const cleanedRow = Object.fromEntries(
                Object.entries(row)
                  .filter(([key]) => key.trim() !== '')
                  .filter(([key]) =>
                    CSV_FILE_COLUMNS.some(
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
            columns: actualColumns,
            filename,
            hasErrors: validationErrors.length > 0,
          });
        },
      });
    });
  }

  async importCsv(
    data: any[],
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

    const successfulImports: any[] = [];
    const failedImports: any[] = [];

    for (const row of dataToImport) {
      try {
        const mappedData: any = {};

        for (const [csvKey, prismaKey] of Object.entries(
          CSV_TO_PRISMA_INVENTORY_MAP,
        )) {
          let value = row[csvKey];

          // Convert numeric strings to number values
          const numberKeys = Object.values(CSV_TO_PRISMA_INVENTORY_MAP).filter(
            (key) => IMPORT_NUMERIC_FIELDS.includes(key),
          );

          if (numberKeys.includes(prismaKey)) {
            value = value ? parseFloat(value) : null;
          }

          mappedData[prismaKey] = value || null;
        }

        // Check if SKU exists
        const existing = await this.inventoryRepository.findOne({
          where: { sku: mappedData.sku },
        });

        mappedData['inHandQuantity'] = mappedData.quantity;
        mappedData['allocatedQuantity'] = mappedData.quantity;

        let result;

        if (existing) {
          result = await this.inventoryRepository.save({
            ...existing,
            ...mappedData,
            updatedAt: new Date(),
          });
        } else {
          const inventory = this.inventoryRepository.create(mappedData);
          result = await this.inventoryRepository.save(inventory);
        }

        successfulImports.push(result);
      } catch (error) {
        this.logger.error(`Error processing row ${row._rowIndex}`, {
          error,
          filename,
          rowData: row,
          user: user?.email,
        });

        failedImports.push({
          row: row._rowIndex,
          data: row,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
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

  async findQuantityBySKU(
    sku: string,
  ): Promise<InventoryInHandQuantityResponseDto> {
    // Validate SKU input
    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      throw new BadRequestException('SKU must be a non-empty string.');
    }

    // Fetch inventory record
    const checkInventory = await this.inventoryRepository.findOne({
      where: { sku: sku },
    });

    // Handle not found case
    if (!checkInventory) {
      throw new NotFoundException(
        `No inventory found for the provided SKU: "${sku}". Please verify the SKU and try again.`,
      );
    }

    return {
      inHandQuantity: checkInventory.inHandQuantity?.toString() ?? '0',
    };
  }
}
