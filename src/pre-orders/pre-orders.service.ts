import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePreOrderDto } from './dto/pre-order.dto';
import {
  PreOrderResponseDto,
  PreOrderCountsDto,
} from './dto/pre-order-response.dto';
import { PreOrder, PreOrderStatusEnums } from 'src/entities/pre_orders.entity';
import { ProductionBatch } from 'src/entities/production_batches.entity';

import * as Papa from 'papaparse';
import {
  IMPORT_PRE_ORDER_NUMERIC_FIELDS,
  PRE_ORDER_CSV_FILE_COLUMNS,
  PRE_ORDER_CSV_FILE_REQUIRED_COLUMNS,
  PRE_ORDER_CSV_TO_PRISMA_INVENTORY_MAP,
  PRE_ORDER_PREVIEW_NUMERIC_FIELDS,
} from 'src/constants/csv';

import { Inbound } from 'src/entities/inbound.entity';
import { findActualCsvKey, normalizeKey } from 'src/lib/stringUtils';

@Injectable()
export class PreOrdersService {
  constructor(
    @InjectRepository(PreOrder)
    private preOrderRepository: Repository<PreOrder>,
    @InjectRepository(ProductionBatch)
    private productionBatchRepository: Repository<ProductionBatch>,
    @InjectRepository(Inbound)
    private inboundRepository: Repository<Inbound>,
  ) {}

  async create(
    createPreOrderDto: CreatePreOrderDto,
    req: any,
  ): Promise<PreOrderResponseDto> {
    const preOrder = this.preOrderRepository.create({
      ...createPreOrderDto,
      createdBy: req?.user?.id || '',
    });
    const savedPreOrder = await this.preOrderRepository.save(preOrder);

    return {
      ...savedPreOrder,
      counts: {
        inProduction: 0,
        dispatched: 0,
        remaining: savedPreOrder.quantity,
      },
    };
  }

  async findAllWithCounts(
    status?: PreOrderStatusEnums,
  ): Promise<PreOrderResponseDto[]> {
    const whereClause = status ? { status } : undefined;

    const preOrders = await this.preOrderRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    const preOrdersWithCounts = await Promise.all(
      preOrders.map(async (preOrder) => {
        const counts = await this.calculateCounts(preOrder.id);
        return {
          ...preOrder,
          counts,
        };
      }),
    );

    return preOrdersWithCounts;
  }

  async findOneWithCounts(id: string): Promise<PreOrderResponseDto> {
    const preOrder = await this.preOrderRepository.findOne({
      where: { id },
    });

    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }

    const counts = await this.calculateCounts(id);

    return {
      ...preOrder,
      counts,
    };
  }

  async moveToProduction(
    preOrderId: string,
    quantity: number,
    req: any,
  ): Promise<ProductionBatch> {
    const preOrder = await this.preOrderRepository.findOne({
      where: { id: preOrderId },
      select: ['id', 'quantity'],
    });

    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }

    // Calculate current counts
    const counts = await this.calculateCounts(preOrderId);

    // ✅ Validation checks
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (quantity > counts.remaining) {
      throw new Error(
        `Invalid quantity. Only ${counts.remaining} items remaining to move into production`,
      );
    }

    const productionBatch = this.productionBatchRepository.create({
      preOrderId,
      quantityInProduction: quantity,
      movedBy: req?.user?.id || '',
    });

    return this.productionBatchRepository.save(productionBatch);
  }

  private async calculateCounts(
    preOrderId: string,
  ): Promise<PreOrderCountsDto> {
    // Get total quantity in production and collect batch IDs
    const productionBatchResults: ProductionBatch[] =
      await this.productionBatchRepository
        .createQueryBuilder('pb')
        .select([
          'pb.id as id',
          'pb.quantityInProduction as quantityInProduction',
        ])
        .where('pb.preOrderId = :preOrderId', { preOrderId })
        .getRawMany();

    const inProduction = productionBatchResults.reduce(
      (sum, batch) => sum + batch.quantityInProduction,
      0,
    );

    const productionBatchIds = productionBatchResults.map((batch) => batch.id);

    let dispatched = 0;
    if (productionBatchIds.length > 0) {
      const dispatchedResult = await this.inboundRepository
        .createQueryBuilder('inbound')
        .select('COALESCE(SUM(CONVERT(inbound.quantity, SIGNED)), 0)', 'total')
        .where('inbound.productionBatchId IN (:...batchIds)', {
          batchIds: productionBatchIds,
        })
        .getRawOne();

      dispatched = parseInt(dispatchedResult?.total || '0');
    }
    // Get pre-order total quantity to calculate remaining
    const preOrder = await this.preOrderRepository.findOne({
      where: { id: preOrderId },
      select: ['quantity'],
    });

    const remaining = (preOrder?.quantity || 0) - inProduction;

    return {
      inProduction,
      dispatched,
      remaining,
    };
  }

  async previewCsv(csvContent: string, filename: string): Promise<any> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
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
          const csvHeaders = Object.keys(data[0] || {});

          // Create mapping of normalized keys to actual CSV headers
          const actualHeaderMap = new Map<string, string>();
          csvHeaders.forEach((header) => {
            actualHeaderMap.set(normalizeKey(header), header);
          });

          const actualColumns = csvHeaders.filter((col) =>
            PRE_ORDER_CSV_FILE_COLUMNS.some(
              (allowedCol) => normalizeKey(allowedCol) === normalizeKey(col),
            ),
          );

          const missingColumns = PRE_ORDER_CSV_FILE_REQUIRED_COLUMNS.filter(
            (requiredCol) =>
              !csvHeaders.map(normalizeKey).includes(normalizeKey(requiredCol)),
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

          const validationErrors: any[] = [];
          const validatedData = data.map((row, index) => {
            const errors: string[] = [];

            // Required field validation
            for (const field of PRE_ORDER_CSV_FILE_REQUIRED_COLUMNS) {
              const actualKey = findActualCsvKey(row, field);
              const value = actualKey ? row[actualKey] : undefined;
              if (!value?.toString().trim()) {
                errors.push(`${field} is required`);
              }
            }

            // Numeric field validation
            for (const field of PRE_ORDER_PREVIEW_NUMERIC_FIELDS) {
              const actualKey = findActualCsvKey(row, field);
              const value = actualKey ? row[actualKey] : undefined;

              if (
                value !== undefined &&
                value !== null &&
                value.toString().trim() !== ''
              ) {
                if (isNaN(parseFloat(value))) {
                  errors.push(`${field} must be a valid number`);
                }
              }
            }

            if (errors.length > 0) {
              validationErrors.push({ row: index + 1, errors });
            }

            const cleanedRow = Object.fromEntries(
              Object.entries(row)
                .filter(([key]) => key.trim() !== '')
                .filter(([key]) =>
                  PRE_ORDER_CSV_FILE_COLUMNS.some(
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
          });

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

  // Modified importCsv method
  async importCsv(
    data: any[],
    filename: string,
    skipErrors = false,
    req: any,
  ): Promise<any> {
    if (!req?.user?.id) {
      throw new BadRequestException('Unauthorize user');
    }

    const dataToImport = skipErrors
      ? data.filter((row) => !row._hasErrors)
      : data;

    if (dataToImport.length === 0) {
      throw new BadRequestException('No valid data to import');
    }

    const successfulImports = [];
    const failedImports = [];

    for (const row of dataToImport) {
      try {
        const mappedData: any = {};

        // Use the mapping logic to handle case-insensitive header matching
        for (const [expectedCsvKey, entityKey] of Object.entries(
          PRE_ORDER_CSV_TO_PRISMA_INVENTORY_MAP,
        )) {
          // Find the actual key in the row that matches the expected CSV key
          const actualCsvKey = findActualCsvKey(row, expectedCsvKey);
          let value = actualCsvKey ? row[actualCsvKey] : undefined;

          if (IMPORT_PRE_ORDER_NUMERIC_FIELDS.includes(entityKey)) {
            value = value ? parseFloat(value) : null;
          }
          mappedData[entityKey] = value;
        }

        const data: PreOrder = this.preOrderRepository.create({
          ...(mappedData as PreOrder),
          createdBy: req.user.id,
        });
        const result = await this.preOrderRepository.save(data);

        // Insert into ProductionBatch
        const batches: ProductionBatch[] = [];

        // First batch: QTY always goes into production
        if (mappedData.quantity && result.id) {
          batches.push(
            this.productionBatchRepository.create({
              preOrderId: result.id,
              quantityInProduction: mappedData.quantity,
              movedBy: req.user.id,
            }),
          );
        }

        if (batches.length > 0) {
          await this.productionBatchRepository.save(batches);
        }

        successfulImports.push(result);
      } catch (error) {
        failedImports.push({
          ...row,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          _hasErrors: true,
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
}
