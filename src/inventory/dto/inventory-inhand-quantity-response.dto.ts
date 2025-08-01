import { ApiProperty } from '@nestjs/swagger';

export class InventoryInHandQuantityResponseDto {
  @ApiProperty({
    description:
      'Available in-hand quantity of the material (BIGINT as string)',
    example: '5000000000000001', // bigint represented as string
    type: String,
  })
  inHandQuantity: string;
}
