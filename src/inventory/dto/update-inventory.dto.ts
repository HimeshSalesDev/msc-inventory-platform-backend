import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { CreateInventoryDto } from './create-inventory.dto';

export class UpdateInventoryDto extends CreateInventoryDto {
  @ApiProperty({
    description: 'Unique identifier for the inventory item to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsString()
  id: string;
}
