import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as Papa from 'papaparse';

import { Inbound } from 'src/entities/inbound.entity';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { UpdateInboundDto } from './dto/update-inbound.dto';
import {
  QueryInboundDto,
  QueryInboundPreOrdersDto,
} from './dto/query-inbound.dto';

import { findActualCsvKey, normalizeKey } from 'src/lib/stringUtils';
import {
  IMPORT_INBOUND_NUMERIC_FIELDS,
  INBOUND_CSV_FILE_COLUMNS,
  INBOUND_CSV_FILE_REQUIRED_COLUMNS,
  INBOUND_CSV_TO_PRISMA_INVENTORY_MAP,
  INBOUND_DATE_FIELDS,
  PREVIEW_NUMERIC_FIELDS,
} from 'src/constants/csv';
import { formatDateToYMD } from 'src/lib/dateHelper';
import { UpdateContainerFieldDto } from './dto/update-container-field.dto';
import { AuditEventService } from 'src/audit-log/audit-event.service';
import { InboundPreOrder } from 'src/entities/inbound-preorder.entity';

@Injectable()
export class InboundService {
  private readonly logger = new Logger(InboundService.name);

  constructor(
    @InjectRepository(Inbound)
    private inboundRepo: Repository<Inbound>,
    private auditEventService: AuditEventService,
    @InjectRepository(InboundPreOrder)
    private inboundPreOrderRepo: Repository<InboundPreOrder>,
  ) {}

  async findAll(queryDto: QueryInboundDto): Promise<Inbound[]> {
    const {
      poNumber,
      vendorDescription,
      containerNumber,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      onlyOffloaded,
    } = queryDto;

    const qb = this.inboundRepo.createQueryBuilder('inbound');

    if (poNumber) {
      qb.andWhere('inbound.poNumber LIKE :poNumber', {
        poNumber: `%${poNumber}%`,
      });
    }

    if (containerNumber) {
      qb.andWhere('inbound.containerNumber = :containerNumber', {
        containerNumber,
      });
    }

    if (vendorDescription) {
      qb.andWhere('inbound.vendorName LIKE :vendorName', {
        vendorName: `%${vendorDescription}%`,
      });
    }

    if (onlyOffloaded === true) {
      qb.andWhere('inbound.offloadedDate IS NOT NULL');
    } else if (onlyOffloaded === false) {
      qb.andWhere('inbound.offloadedDate IS NULL');
    }

    qb.orderBy(`inbound.${sortBy}`, sortOrder);
    return await qb.getMany();
  }

  async getByContainer(containerNumber: string) {
    const records = await this.inboundRepo.find({
      where: { containerNumber },
      order: { createdAt: 'ASC' },
    });

    if (!records.length) {
      throw new NotFoundException(
        `No inbound records found for ${containerNumber}`,
      );
    }

    // Split into new vs old
    const newRecords = records.filter((r) => !r.offloadedDate);
    const oldRecords = records.filter((r) => r.offloadedDate);

    // Compute top-level container details
    const totalQuantity = records.reduce(
      (sum, r) => sum + (parseFloat(r.quantity) ?? 0),
      0,
    );

    // Rule for container offloadedDate
    let finalOffloadedDate: string | null = null;
    if (newRecords.length === 0 && oldRecords.length > 0) {
      finalOffloadedDate = new Date(
        Math.max(...oldRecords.map((r) => new Date(r.offloadedDate).getTime())),
      ).toISOString();
    }

    const first = newRecords.length ? newRecords[0] : records[0];

    const containerDetails = {
      containerNumber,
      totalItems: records.length,
      totalQuantity,
      etd: first.etd,
      eta: first.eta,
      shipped: first.shipped,
      offloadedDate: finalOffloadedDate,
      createdAt: first.createdAt,
      updatedAt: new Date(
        Math.max(...records.map((r) => new Date(r.updatedAt).getTime())),
      ).toISOString(),
    };

    return {
      containerDetails,
      newRecords,
      oldRecords,
    };
  }

  async create(createDto: CreateInboundDto, req: any): Promise<Inbound> {
    const record = this.inboundRepo.create({
      ...createDto,
      etd: createDto.etd ? new Date(createDto.etd) : null,
      eta: createDto.eta ? new Date(createDto.eta) : null,
      offloadedDate: createDto.offloadedDate
        ? new Date(createDto.offloadedDate)
        : null,
    });

    const inboundData = await this.inboundRepo.save(record);

    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };

      this.auditEventService.emitInboundCreated(
        requestContext,
        inboundData,
        inboundData.id,
      );
    }
    return inboundData;
  }

  async update(updateDto: UpdateInboundDto, req: any) {
    const { id, ...updateData } = updateDto;
    const existing = await this.inboundRepo.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Inbound record not found');
    }

    const inboundData = await this.inboundRepo.save({
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    });

    const updatedInBound = await this.inboundRepo.findOne({
      where: { id },
    });

    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };
      this.auditEventService.emitInboundUpdated(
        requestContext,
        existing,
        updatedInBound,
        id,
      );
    }

    return inboundData;
  }

  async updateByContainerNumber(
    dto: UpdateContainerFieldDto,
    req: any,
  ): Promise<{ updatedCount: number }> {
    const { containerNumber, etd, eta, shipped, offloadedDate } = dto;

    if (!etd && !eta && !shipped && !offloadedDate) {
      throw new BadRequestException(
        'At least one of etd, eta, shipped, or offloadedDate must be provided',
      );
    }

    const records = await this.inboundRepo.find({
      where: { containerNumber, offloadedDate: IsNull() },
    });

    if (!records.length) {
      throw new NotFoundException(
        `No inbound records found for container number "${containerNumber}"`,
      );
    }

    // Prepare update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (etd) updateData.etd = etd;
    if (eta) updateData.eta = eta;
    if (shipped) updateData.shipped = shipped;
    if (offloadedDate) updateData.offloadedDate = offloadedDate;

    const result = await this.inboundRepo.manager.transaction(
      async (manager) => {
        return await manager
          .createQueryBuilder()
          .update(Inbound)
          .set(updateData)
          .where('containerNumber = :containerNumber', { containerNumber })
          .andWhere('offloadedDate IS NULL')
          .execute();
      },
    );

    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };

      const message = `skus ${records.map((r) => r.sku).join(',')} for container number`;

      this.auditEventService.emitInboundContainerUpdated(
        requestContext,
        updateData,
        containerNumber,
        message,
      );
    }

    return { updatedCount: result.affected || 0 };
  }

  async delete(id: string, req: any): Promise<void> {
    const existing = await this.inboundRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Inbound record not found');
    }

    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };

      this.auditEventService.emitInboundDeleted(
        requestContext,
        existing,
        existing.id,
      );
    }

    await this.inboundRepo.delete(id);
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
            INBOUND_CSV_FILE_COLUMNS.some(
              (allowedCol) => normalizeKey(allowedCol) === normalizeKey(col),
            ),
          );

          const missingColumns = INBOUND_CSV_FILE_REQUIRED_COLUMNS.filter(
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
            for (const field of INBOUND_CSV_FILE_REQUIRED_COLUMNS) {
              const actualKey = findActualCsvKey(row, field);
              const value = actualKey ? row[actualKey] : undefined;
              if (!value?.toString().trim()) {
                errors.push(`${field} is required`);
              }
            }

            // Numeric field validation
            for (const field of PREVIEW_NUMERIC_FIELDS) {
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

            // === DATE FORMATTING ===
            for (const field of INBOUND_DATE_FIELDS) {
              const actualKey = findActualCsvKey(row, field);

              if (actualKey) {
                const formatted = row[actualKey]
                  ? formatDateToYMD(row[actualKey])
                  : null;
                row[actualKey] = formatted ?? null;
              }
            }

            if (errors.length > 0) {
              validationErrors.push({ row: index + 1, errors });
            }

            const cleanedRow = Object.fromEntries(
              Object.entries(row)
                .filter(([key]) => key.trim() !== '')
                .filter(([key]) =>
                  INBOUND_CSV_FILE_COLUMNS.some(
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

        // Use the mapping logic to handle case-insensitive header matching
        for (const [expectedCsvKey, entityKey] of Object.entries(
          INBOUND_CSV_TO_PRISMA_INVENTORY_MAP,
        )) {
          // Find the actual key in the row that matches the expected CSV key
          const actualCsvKey = findActualCsvKey(row, expectedCsvKey);
          let value = actualCsvKey ? row[actualCsvKey] : undefined;

          if (IMPORT_INBOUND_NUMERIC_FIELDS.includes(entityKey)) {
            value = value ? parseFloat(value) : null;
          }
          mappedData[entityKey] = value;
        }

        const inbound = this.inboundRepo.create(mappedData);
        const result = await this.inboundRepo.save(inbound);

        successfulImports.push(result);
      } catch (error) {
        this.logger.error(`Error importing row ${row._rowIndex}`, {
          error,
          row,
          user: req?.user?.email,
          filename,
        });

        failedImports.push({
          ...row,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          _hasErrors: true,
        });
      }
    }

    // ✅ Emit audit logs for each successfully imported inbound
    if (req?.user?.id) {
      const requestContext = {
        userId: req?.user.id,
        userName: req?.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };

      for (const inboundData of successfulImports) {
        this.auditEventService.emitInboundCreated(
          requestContext,
          inboundData,
          inboundData.id,
        );
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

  async findShippedAfterProduction(
    queryDto: QueryInboundDto,
  ): Promise<Inbound[]> {
    const {
      poNumber,
      vendorDescription,
      containerNumber,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      onlyOffloaded,
    } = queryDto;

    const qb = this.inboundRepo.createQueryBuilder('inbound');

    qb.andWhere('inbound.productionBatchId IS NOT NULL');

    if (poNumber) {
      qb.andWhere('inbound.poNumber LIKE :poNumber', {
        poNumber: `%${poNumber}%`,
      });
    }

    if (containerNumber) {
      qb.andWhere('inbound.containerNumber = :containerNumber', {
        containerNumber,
      });
    }

    if (vendorDescription) {
      qb.andWhere('inbound.vendorName LIKE :vendorName', {
        vendorName: `%${vendorDescription}%`,
      });
    }

    if (onlyOffloaded === true) {
      qb.andWhere('inbound.offloadedDate IS NOT NULL');
    } else if (onlyOffloaded === false) {
      qb.andWhere('inbound.offloadedDate IS NULL');
    }

    qb.orderBy(`inbound.${sortBy}`, sortOrder);
    return await qb.getMany();
  }

  async findUniquePendingContainerNumbers(): Promise<string[]> {
    const result: { containerNumber: string }[] = await this.inboundRepo
      .createQueryBuilder('inbound')
      .select('DISTINCT inbound.containerNumber', 'containerNumber')
      .where('inbound.offloadedDate IS NULL')
      .andWhere('inbound.containerNumber IS NOT NULL')
      .andWhere("TRIM(inbound.containerNumber) <> ''") // excludes empty strings
      .orderBy('inbound.containerNumber', 'ASC')
      .getRawMany();

    return result.map(({ containerNumber }) => containerNumber);
  }

  async findAllPreOrder(query: QueryInboundPreOrdersDto) {
    const { page, limit, sku } = query;

    const qb = this.inboundPreOrderRepo.createQueryBuilder('order');

    if (sku) qb.andWhere('order.sku LIKE :sku', { sku: `%${sku}%` });

    qb.skip((page - 1) * limit).take(limit);

    const [data, totalCount] = await qb.getManyAndCount();

    return {
      data,
      page,
      limit,
      totalCount,
    };
  }
}
