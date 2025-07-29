import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { CreateInboundDto } from './create-inbound.dto';

export class UpdateInboundDto extends CreateInboundDto {
  @ApiProperty({
    description: 'Unique identifier for the inbound record to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsString()
  id: string;
}
