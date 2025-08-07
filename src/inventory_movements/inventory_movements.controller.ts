import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { InventoryMovementsService } from './inventory_movements.service';
import { FindOutboundInventoryMovementsDto } from './dto/find-outbound-inventory-movements.dto';

import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/roles.enum';

@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  @Get('/top')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Get top 10 outbound inventory movements by SKU' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOkResponse({
    description: 'Top 10 outbound SKUs with total quantities',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          totalQuantity: { type: 'number' },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inventory Manager role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch inventory movements',
  })
  async findTopOutboundInventoryMovements(
    @Query() filterDto: FindOutboundInventoryMovementsDto,
  ): Promise<{ data: { sku: string; totalQuantity: number }[] }> {
    try {
      const { startDate, endDate } = filterDto;
      const data =
        await this.inventoryMovementsService.findTopOutboundMovements(
          startDate,
          endDate,
        );
      return { data };
    } catch {
      throw new HttpException(
        'Failed to fetch inventory movements',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
