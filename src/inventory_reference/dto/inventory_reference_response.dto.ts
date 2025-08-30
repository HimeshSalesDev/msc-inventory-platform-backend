import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class InventoryReferenceResponseDto {
  @ApiProperty({ example: 'GRN', description: 'Type of the reference' })
  @Expose()
  type: string;

  @ApiProperty({ example: 'REF-123456', description: 'Reference number' })
  @Expose()
  number: string;

  @ApiProperty({
    example: 'sku',
    description: 'sku',
  })
  @Expose()
  sku: string;

  @ApiProperty({
    example: 'lifter plate',
    description: 'Add on',
  })
  @Expose()
  addOn: string;

  @ApiProperty({
    description: 'Date when the record was created',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the record was last updated',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  updatedAt: Date;
}
