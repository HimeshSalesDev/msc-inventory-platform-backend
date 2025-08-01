import { Expose } from 'class-transformer';
import { InventoryReference } from 'src/entities/inventory_reference.entity';

export class InventoryReferenceResponseDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  sku: string;

  @Expose()
  number: string;

  @Expose()
  inventoryId: string;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;

  static fromEntity(
    inventoryLocation: InventoryReference,
    sku: string,
    number: string,
    type: string,
  ): InventoryReferenceResponseDto {
    return {
      id: inventoryLocation.id,
      inventoryId: inventoryLocation.inventoryId,
      createdAt: inventoryLocation.createdAt,
      updatedAt: inventoryLocation.updatedAt,
      sku,
      number,
      type,
    };
  }
}
