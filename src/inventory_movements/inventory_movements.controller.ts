import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryMovementsService } from './inventory_movements.service';
import { FindOutboundInventoryMovementsDto } from './dto/find-outbound-inventory-movements.dto';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/roles.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Inventory Movements')
@Controller('inventory-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
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

  @Get('inbound-vs-outbound-summary')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({
    summary: 'Get inbound vs outbound inventory movement summary',
    description:
      'Retrieve inventory movement data for inbound and outbound transactions with flexible period filtering (monthly, quarterly, yearly). Returns data formatted for chart visualization.',
  })
  @ApiQuery({
    name: 'period',
    required: true,
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    description:
      'Time period for data aggregation. For quarterly period with specific quarter, returns monthly breakdown within that quarter.',
    example: 'quarterly',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: String,
    description:
      'Target year for data filtering. Defaults to current year if not provided.',
    example: '2025',
  })
  @ApiQuery({
    name: 'quarter',
    required: false,
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4'],
    description:
      'Specific quarter when period is "quarterly". If provided, returns monthly data within the quarter (Q1: Jan-Mar, Q2: Apr-Jun, etc.). If not provided with quarterly period, returns all quarters.',
    example: 'Q2',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved inbound vs outbound summary data',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'object',
          properties: {
            series: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    enum: ['Stock In', 'Stock Out'],
                    example: 'Stock In',
                  },
                  data: {
                    type: 'array',
                    items: { type: 'number' },
                    example: [120, 150, 180],
                  },
                },
              },
              example: [
                { name: 'Stock In', data: [120, 150, 180] },
                { name: 'Stock Out', data: [100, 130, 160] },
              ],
            },
            categories: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Time period labels (months, quarters, or years based on period parameter)',
              example: ['Apr', 'May', 'Jun'],
            },
            summary: {
              type: 'object',
              properties: {
                totalInbound: {
                  type: 'number',
                  description: 'Total inbound quantity for the period',
                  example: 450,
                },
                totalOutbound: {
                  type: 'number',
                  description: 'Total outbound quantity for the period',
                  example: 390,
                },
                netMovement: {
                  type: 'number',
                  description: 'Net movement (inbound - outbound)',
                  example: 60,
                },
              },
            },
          },
        },
        period: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'yearly'],
          example: 'quarterly',
        },
        year: {
          type: 'string',
          example: '2025',
        },
        quarter: {
          type: 'string',
          enum: ['Q1', 'Q2', 'Q3', 'Q4'],
          example: 'Q2',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          examples: [
            "Period must be either 'monthly', 'quarterly' or 'yearly'",
            'Quarter must be one of Q1, Q2, Q3, Q4',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch inventory movement data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Failed to fetch inventory movement data',
        },
        error: { type: 'string', example: 'Database connection failed' },
      },
    },
  })
  async getInboundVsOutboundSummary(
    @Query('period') period: string,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
  ) {
    try {
      return await this.inventoryMovementsService.getInboundVsOutboundSummary(
        period,
        year,
        quarter,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch inventory movement data',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
