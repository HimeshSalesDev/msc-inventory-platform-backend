import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, ValidateIf } from 'class-validator';

export enum OrderTypeEnum {
  INVENTORY = 'inventory',
  CUSTOM = 'custom',
  INBOUND = 'inbound',
}

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

  @ApiProperty({
    description: 'Type of order',
    enum: OrderTypeEnum,
    example: OrderTypeEnum.INVENTORY,
  })
  @IsEnum(OrderTypeEnum, {
    message: `type must be one of: ${Object.values(OrderTypeEnum).join(', ')}`,
  })
  type: OrderTypeEnum;

  @ApiPropertyOptional({
    description: 'ID is required only when type = inbound',
    example: '12345',
  })
  @IsString()
  @ValidateIf((o) => o.type === OrderTypeEnum.INBOUND)
  id?: string;
}
