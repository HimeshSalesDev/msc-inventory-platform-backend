import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PreOrderStatusEnums } from 'src/entities/pre_orders.entity';

export class PreOrdersQueryDto {
  @ApiPropertyOptional({
    enum: PreOrderStatusEnums,
    description: 'Filter by pre-order status',
  })
  @IsOptional()
  @IsEnum(PreOrderStatusEnums)
  status?: PreOrderStatusEnums;
}
