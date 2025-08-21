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
import { normalizeKey } from 'src/lib/stringUtils';

@Injectable()
export class PreOrdersService {
  constructor(
    @InjectRepository(PreOrder)
    private preOrderRepository: Repository<PreOrder>,
    @InjectRepository(ProductionBatch)
    private productionBatchRepository: Repository<ProductionBatch>,
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
        remaining: savedPreOrder.totalQuantity,
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
      select: ['id', 'totalQuantity'],
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
    // Get total quantity in production
    const inProductionResult = await this.productionBatchRepository
      .createQueryBuilder('pb')
      .select('COALESCE(SUM(pb.quantityInProduction), 0)', 'total')
      .where('pb.preOrderId = :preOrderId', { preOrderId })
      .getRawOne();

    const inProduction = parseInt(inProductionResult?.total || '0');

    // Get total quantity dispatched
    // const dispatchedResult = await this.dispatchedPreOrderRepository
    //   .createQueryBuilder('dpo')
    //   .innerJoin('dpo.productionBatch', 'pb')
    //   .select('COALESCE(SUM(dpo.quantityDispatched), 0)', 'total')
    //   .where('pb.preOrderId = :preOrderId', { preOrderId })
    //   .getRawOne();

    // const dispatched = parseInt(dispatchedResult?.total || '0');
    const dispatched = 0;
    // Get pre-order total quantity to calculate remaining
    const preOrder = await this.preOrderRepository.findOne({
      where: { id: preOrderId },
      select: ['totalQuantity'],
    });

    const remaining = (preOrder?.totalQuantity || 0) - inProduction;

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
          const actualColumns = Object.keys(data[0] || {}).filter((col) =>
            PRE_ORDER_CSV_FILE_COLUMNS.some(
              (allowedCol) => normalizeKey(allowedCol) === normalizeKey(col),
            ),
          );

          const missingColumns = PRE_ORDER_CSV_FILE_REQUIRED_COLUMNS.filter(
            (requiredCol) =>
              !actualColumns
                .map(normalizeKey)
                .includes(normalizeKey(requiredCol)),
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
              const actualKey = Object.keys(row).find(
                (col) => normalizeKey(col) === normalizeKey(field),
              );
              const value = actualKey ? row[actualKey] : undefined;
              if (!value?.toString().trim()) {
                errors.push(`${field} is required`);
              }
            }

            // Numeric field validation
            for (const field of PRE_ORDER_PREVIEW_NUMERIC_FIELDS) {
              const actualKey = Object.keys(row).find(
                (col) => normalizeKey(col) === normalizeKey(field),
              );
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

            // === DATE FORMATTING ===
            // for (const field of INBOUND_DATE_FIELDS) {
            //   const actualKey = Object.keys(row).find(
            //     (col) => normalizeKey(col) === normalizeKey(field),
            //   );

            //   if (actualKey && row[actualKey]) {
            //     const formatted = formatDateToYMD(row[actualKey]);
            //     row[actualKey] = formatted ?? null;
            //   }
            // }

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
            };
          });

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
    skipErrors = false,
    req: any,
  ): Promise<any> {
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

        for (const [csvKey, entityKey] of Object.entries(
          PRE_ORDER_CSV_TO_PRISMA_INVENTORY_MAP,
        )) {
          let value = row[csvKey];
          if (IMPORT_PRE_ORDER_NUMERIC_FIELDS.includes(entityKey)) {
            value = value ? parseFloat(value) : null;
          }
          mappedData[entityKey] = value;
        }

        const inbound = this.preOrderRepository.create(mappedData);
        const result = await this.preOrderRepository.save(inbound);

        successfulImports.push(result);
      } catch (error) {
        // this.logger.error(`Error importing row ${row._rowIndex}`, {
        //   error,
        //   row,
        //   user: req?.user?.email,
        //   filename,
        // });

        failedImports.push({
          ...row,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          _hasErrors: true,
        });
      }
    }

    // ✅ Emit audit logs for each successfully imported inbound
    // if (req?.user?.id) {
    //   const requestContext = {
    //     userId: req?.user.id,
    //     userName: req?.user.fullName,
    //     ipAddress: req?.ip,
    //     userAgent: req?.get('User-Agent'),
    //     controllerPath: req.route?.path || req.originalUrl,
    //   };

    //   for (const inboundData of successfulImports) {
    //     this.auditEventService.emitInboundCreated(
    //       requestContext,
    //       inboundData,
    //       inboundData.id,
    //     );
    //   }
    // }

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
