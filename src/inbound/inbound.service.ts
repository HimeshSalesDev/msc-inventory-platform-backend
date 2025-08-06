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

import { Inbound } from 'src/entities/inbound.entity';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { UpdateInboundDto } from './dto/update-inbound.dto';
import { QueryInboundDto } from './dto/query-inbound.dto';

import { normalizeKey } from 'src/lib/stringUtils';
import {
  IMPORT_NUMERIC_FIELDS,
  INBOUND_CSV_FILE_COLUMNS,
  INBOUND_CSV_TO_PRISMA_INVENTORY_MAP,
  INBOUND_DATE_FIELDS,
  PREVIEW_NUMERIC_FIELDS,
  REQUIRED_FIELDS,
} from 'src/constants/csv';
import { formatDateToYMD } from 'src/lib/dateHelper';

@Injectable()
export class InboundService {
  private readonly logger = new Logger(InboundService.name);

  constructor(
    @InjectRepository(Inbound)
    private inboundRepo: Repository<Inbound>,
  ) {}

  async findAll(queryDto: QueryInboundDto): Promise<Inbound[]> {
    const {
      poNumber,
      vendorDescription,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const qb = this.inboundRepo.createQueryBuilder('inbound');

    if (poNumber) {
      qb.andWhere('inbound.poNumber LIKE :poNumber', {
        poNumber: `%${poNumber}%`,
      });
    }

    if (vendorDescription) {
      qb.andWhere('inbound.vendorName LIKE :vendorName', {
        vendorName: `%${vendorDescription}%`,
      });
    }

    qb.orderBy(`inbound.${sortBy}`, sortOrder);
    return await qb.getMany();
  }

  async create(createDto: CreateInboundDto): Promise<Inbound> {
    const existing = await this.inboundRepo.findOne({
      where: { sku: createDto.sku },
    });

    if (existing) {
      throw new ConflictException(
        `Inbound record with SKU "${createDto.sku}" already exists.`,
      );
    }

    const record = this.inboundRepo.create({
      ...createDto,
      etd: createDto.etd ? new Date(createDto.etd) : null,
      eta: createDto.eta ? new Date(createDto.eta) : null,
      offloadedDate: createDto.offloadedDate
        ? new Date(createDto.offloadedDate)
        : null,
    });

    return await this.inboundRepo.save(record);
  }

  async update(updateDto: UpdateInboundDto) {
    const { id, ...updateData } = updateDto;
    const existing = await this.inboundRepo.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Inbound record not found');
    }

    const updateDtoData = {
      ...updateData,
      etd: updateData.etd ? new Date(updateData.etd) : null,
      eta: updateData.eta ? new Date(updateData.eta) : null,
      offloadedDate: updateData.offloadedDate
        ? new Date(updateData.offloadedDate)
        : null,
    };

    return await this.inboundRepo.save({
      ...existing,
      ...updateDtoData,
      updatedAt: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.inboundRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Inbound record not found');
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
          const actualColumns = Object.keys(data[0] || {}).filter((col) =>
            INBOUND_CSV_FILE_COLUMNS.some(
              (allowedCol) => normalizeKey(allowedCol) === normalizeKey(col),
            ),
          );

          const missingColumns = INBOUND_CSV_FILE_COLUMNS.filter(
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
            for (const field of REQUIRED_FIELDS) {
              const actualKey = Object.keys(row).find(
                (col) => normalizeKey(col) === normalizeKey(field),
              );
              const value = actualKey ? row[actualKey] : undefined;
              if (!value?.toString().trim()) {
                errors.push(`${field} is required`);
              }
            }

            // Numeric field validation
            for (const field of PREVIEW_NUMERIC_FIELDS) {
              const actualKey = Object.keys(row).find(
                (col) => normalizeKey(col) === normalizeKey(field),
              );
              const value = actualKey ? row[actualKey] : undefined;
              if (value && isNaN(parseFloat(value))) {
                errors.push(`${field} must be a valid number`);
              }
            }

            // === DATE FORMATTING ===
            for (const field of INBOUND_DATE_FIELDS) {
              const actualKey = Object.keys(row).find(
                (col) => normalizeKey(col) === normalizeKey(field),
              );

              if (actualKey && row[actualKey]) {
                const formatted = formatDateToYMD(row[actualKey]);
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
    user: any,
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
          INBOUND_CSV_TO_PRISMA_INVENTORY_MAP,
        )) {
          let value = row[csvKey];
          if (IMPORT_NUMERIC_FIELDS.includes(entityKey)) {
            value = value ? parseFloat(value) : null;
          }
          mappedData[entityKey] = value || null;
        }

        const inbound = this.inboundRepo.create(mappedData);
        const result = await this.inboundRepo.save(inbound);

        successfulImports.push(result);
      } catch (error) {
        this.logger.error(`Error importing row ${row._rowIndex}`, {
          error,
          row,
          user: user?.email,
          filename,
        });

        failedImports.push({
          row: row._rowIndex,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
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
