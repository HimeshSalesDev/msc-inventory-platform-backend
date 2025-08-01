import { ApiProperty } from '@nestjs/swagger';

export class OrderConfirmationResponseDto {
  @ApiProperty({
    description: 'Status of the order confirmation request',
    example: 'OK',
  })
  status: string;

  @ApiProperty({
    description: 'Number of rows updated in the inventory',
    example: 3,
  })
  updatedRows: number;
}
