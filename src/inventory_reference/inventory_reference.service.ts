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
    req: any,
  ): Promise<InventoryReferenceResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.createOrUpdateInventoryReference(
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

  private async createOrUpdateInventoryReference(
    queryRunner: QueryRunner,
    createDto: CreateInventoryReferenceDto,
    req: any,
  ) {
    const { sku, number, type } = createDto;

    let isNewInventory = false;
    let isNewReference = false;
    let originalInventoryData: Inventory = null;
    let originalReferenceData: InventoryReference = null;

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

    // Check if Inventory Reference already exists for this inventory and bin
    const existingReference = await queryRunner.manager.findOne(
      InventoryReference,
      {
        where: {
          inventoryId: inventory.id,
          number: number,
          type: type,
        },
        lock: { mode: 'pessimistic_write' },
      },
    );

    let inventoryReference: InventoryReference;

    if (existingReference) {
      // Store original location data for audit
      originalReferenceData = { ...existingReference };

      // Update existing References
      const type = existingReference.type;
      const number = existingReference.number;

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
        `Updated inventory reference created: ${inventoryReference.id}`,
      );
    } else {
      // Create new Reference
      inventoryReference = queryRunner.manager.create(InventoryReference, {
        inventoryId: inventory.id,
        type: type,
        number: number,
      });
      inventoryReference = await queryRunner.manager.save(
        InventoryReference,
        inventoryReference,
      );
      isNewReference = true;

      this.logger.log(
        `New inventory reference created: ${inventoryReference.id}`,
      );
    }

    return InventoryReferenceResponseDto.fromEntity(
      inventoryReference,
      sku,
      number,
      type,
    );
  }
}
