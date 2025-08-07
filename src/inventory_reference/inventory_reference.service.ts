import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateInventoryReferenceDto } from './dto/create_inventory_reference.dto';
import { Inventory } from 'src/entities/inventory.entity';
import { DataSource, QueryRunner } from 'typeorm';
import { InventoryReference } from 'src/entities/inventory_reference.entity';
import { InventoryReferenceResponseDto } from './dto/inventory_reference_response.dto';
import { parseSKU, validateSKU } from 'src/lib/sku.util';

@Injectable()
export class InventoryReferenceService {
  private readonly logger = new Logger(InventoryReferenceService.name);

  constructor(private readonly dataSource: DataSource) {}

  async create(
    createDto: CreateInventoryReferenceDto,
  ): Promise<InventoryReferenceResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.createOrUpdateInventoryReference(
        queryRunner,
        createDto,
      );
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create inventory location: ${error.message}`,
        error.stack,
      );

      // FIX: Handle database constraint violations
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Record already exists');
      }

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

  private async createOrUpdateInventoryReference(
    queryRunner: QueryRunner,
    createDto: CreateInventoryReferenceDto,
  ): Promise<InventoryReferenceResponseDto> {
    const { sku, number, type } = createDto;

    // FIX: Validate SKU early
    if (!validateSKU(sku)) {
      throw new BadRequestException('Invalid SKU format');
    }

    // Find or create inventory with lock
    let inventory = await queryRunner.manager.findOne(Inventory, {
      where: { sku },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
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

      try {
        inventory = await queryRunner.manager.save(Inventory, inventory);
      } catch (error) {
        // If duplicate key error, another thread created it, fetch it
        if (error.code === 'ER_DUP_ENTRY') {
          inventory = await queryRunner.manager.findOne(Inventory, {
            where: { sku },
            lock: { mode: 'pessimistic_write' },
          });
          if (!inventory) {
            throw new InternalServerErrorException(
              'Failed to find inventory after conflict',
            );
          }
        } else {
          throw error;
        }
      }
    }

    // Check if Inventory Reference already exists for this inventory and bin
    const existingReference = await queryRunner.manager.findOne(
      InventoryReference,
      {
        where: {
          sku: inventory.sku,
          number: number,
          type: type,
        },
        lock: { mode: 'pessimistic_write' },
      },
    );

    let inventoryReference: InventoryReference;

    if (existingReference) {
      // FIX: Only update if values are actually different
      if (
        existingReference.type !== type ||
        existingReference.number !== number
      ) {
        await queryRunner.manager.update(
          InventoryReference,
          existingReference.id,
          {
            type,
            number,
          },
        );

        inventoryReference = await queryRunner.manager.findOne(
          InventoryReference,
          {
            where: { id: existingReference.id },
          },
        );

        this.logger.log(
          `Updated inventory reference: ${inventoryReference.id} ${sku} ${type} ${number}`,
        );
      } else {
        // No update needed, just return existing
        inventoryReference = existingReference;
        this.logger.log(
          `Inventory reference already exists: ${inventoryReference.id} ${sku} ${type} ${number}`,
        );
      }
    } else {
      // FIX: Handle race condition for reference creation
      try {
        // Create new Reference
        inventoryReference = queryRunner.manager.create(InventoryReference, {
          sku: inventory.sku,
          type: type,
          number: number,
        });
        inventoryReference = await queryRunner.manager.save(
          InventoryReference,
          inventoryReference,
        );

        this.logger.log(
          `New inventory reference created: ${inventoryReference.id}  ${sku} ${type} ${number}`,
        );
      } catch (error) {
        // If duplicate key error, fetch the existing one
        if (error.code === 'ER_DUP_ENTRY') {
          inventoryReference = await queryRunner.manager.findOne(
            InventoryReference,
            {
              where: {
                sku: inventory.sku,
                number: number,
                type: type,
              },
            },
          );
          if (!inventoryReference) {
            throw new InternalServerErrorException(
              'Failed to find reference after conflict',
            );
          }
          this.logger.log(
            `Inventory reference already created by another request: ${inventoryReference.id} ${sku} ${type} ${number}`,
          );
        } else {
          throw error;
        }
      }
    }

    return inventoryReference;
  }
}
