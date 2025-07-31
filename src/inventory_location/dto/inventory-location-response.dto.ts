import { ApiProperty } from '@nestjs/swagger';
import { InventoryLocation } from 'src/entities/inventory_location.entity';

export class InventoryLocationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the inventory location record',
  })
  id: string;

  @ApiProperty({ description: 'Reference to the inventory item' })
  inventoryId: string;

  @ApiProperty({ description: 'Stock Keeping Unit' })
  sku: string;

  @ApiProperty({ description: 'Bin number where the inventory is stored' })
  binNumber: string;

  @ApiProperty({ description: 'Physical location or warehouse section' })
  location: string;

  @ApiProperty({ description: 'Quantity stored in this specific location' })
  quantity: string;

  @ApiProperty({
    description: 'Total quantity across all locations for this SKU',
  })
  totalQuantity: string;

  @ApiProperty({ description: 'Date when the record was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Date when the record was last updated' })
  updatedAt: Date;

  static fromEntity(
    inventoryLocation: InventoryLocation,
    totalQuantity: string,
    sku: string,
  ): InventoryLocationResponseDto {
    return {
      id: inventoryLocation.id,
      inventoryId: inventoryLocation.inventoryId,
      sku,
      binNumber: inventoryLocation.binNumber,
      location: inventoryLocation.location,
      quantity: inventoryLocation.quantity,
      totalQuantity,
      createdAt: inventoryLocation.createdAt,
      updatedAt: inventoryLocation.updatedAt,
    };
  }
}
