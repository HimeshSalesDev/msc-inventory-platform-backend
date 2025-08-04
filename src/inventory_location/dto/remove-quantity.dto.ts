import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { InventoryLocation } from 'src/entities/inventory_location.entity';

export class RemoveQuantityDto {
  @ApiProperty({
    description:
      'UUID of the inventory location from which quantity will be removed',
    example: 'e7b81046-8df6-4831-ab0d-0786541f0e21',
  })
  @IsString()
  @IsNotEmpty({ message: 'inventoryLocationId is required' })
  @Transform(({ value }: { value: string }) => value?.trim())
  inventoryLocationId: string;

  @ApiProperty({
    description: 'Quantity to remove (BigInt as string)',
    example: '5',
  })
  @IsString({ message: 'quantity must be a string' })
  @Matches(/^\d+$/, {
    message: 'quantity must be a positive integer in string format',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  quantity: string;
}

export class RemoveQuantityResponseDto {
  @ApiProperty({
    description: 'UUID of the inventory location after the operation',
    example: 'e7b81046-8df6-4831-ab0d-0786541f0e21',
  })
  id: string;

  @ApiProperty({
    description:
      'Remaining quantity at this inventory location (BigInt as string)',
    example: '10',
  })
  remainingQuantity: string;

  @ApiProperty({
    description:
      'Total quantity across all locations for this SKU (BigInt as string)',
    example: '50',
  })
  totalInventoryQuantity: string;

  @ApiProperty({
    description: 'SKU of the inventory item',
    example: 'E4E4-55-M1-1104',
  })
  sku: string;

  @ApiProperty({
    description: 'Physical location or warehouse section',
    example: 'Warehouse-A, Section-1, Row-5',
  })
  location: string;

  @ApiProperty({
    description: 'Bin number where the inventory is stored',
    example: 'BIN-A001',
  })
  binNumber: string;

  static fromData(
    inventoryLocation: InventoryLocation,
    totalQuantity: string,
    sku: string,
  ): RemoveQuantityResponseDto {
    const response = new RemoveQuantityResponseDto();
    response.id = inventoryLocation.id;
    response.remainingQuantity = inventoryLocation.quantity;
    response.totalInventoryQuantity = totalQuantity;
    response.sku = sku;
    response.location = inventoryLocation.location;
    response.binNumber = inventoryLocation.binNumber;
    return response;
  }
}
