import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class OrderConfirmationDto {
  @ApiProperty({
    description: 'SKU of the inventory item',
    example: 'SKU-12345',
  })
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  sku: string;

  @ApiProperty({
    description: 'Quantity to confirm (string to handle big numbers)',
    example: '1000',
  })
  @IsString()
  qty: string;
}
