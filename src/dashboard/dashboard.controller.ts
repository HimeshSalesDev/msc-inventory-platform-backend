import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';

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
import { InventoryMovementsService } from 'src/inventory_movements/inventory_movements.service';
import { FindOutboundInventoryMovementsDto } from 'src/inventory_movements/dto/find-outbound-inventory-movements.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private inventoryMovementService: InventoryMovementsService,

    private dashboardService: DashboardService,
  ) {}

  @Get('inbound-vs-outbound-summary')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({
    summary: 'Get inbound vs outbound inventory movement summary',
    description:
      'Retrieve inventory movement data for inbound and outbound transactions with flexible period filtering (monthly, quarterly, yearly) OR custom date range using startDate and endDate. Returns data formatted for chart visualization.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    description:
      'Time period for data aggregation. For quarterly period with a specific quarter, returns monthly breakdown within that quarter. If startDate and endDate are provided, period is optional.',
    example: 'quarterly',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: String,
    description:
      'Target year for data filtering. Defaults to current year if not provided. Ignored when startDate and endDate are provided.',
    example: '2025',
  })
  @ApiQuery({
    name: 'quarter',
    required: false,
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4'],
    description:
      'Specific quarter when period is "quarterly". If provided, returns monthly data within that quarter (Q1: Jan-Mar, Q2: Apr-Jun, etc.). Ignored when startDate and endDate are provided.',
    example: 'Q2',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description:
      'Start date for custom date range filtering in YYYY-MM-DD format. Must be used with endDate. Overrides year/period/quarter filters when provided.',
    example: '2025-04-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description:
      'End date for custom date range filtering in YYYY-MM-DD format. Must be used with startDate. Overrides year/period/quarter filters when provided.',
    example: '2025-06-30',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved inbound vs outbound summary data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
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
                'Time period labels (months, quarters, or years based on period parameter, or custom dates when using date range)',
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
        year: { type: 'string', example: '2025' },
        quarter: {
          type: 'string',
          enum: ['Q1', 'Q2', 'Q3', 'Q4'],
          example: 'Q2',
        },
        startDate: { type: 'string', example: '2025-04-01' },
        endDate: { type: 'string', example: '2025-06-30' },
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
            'startDate and endDate must be provided together in YYYY-MM-DD format',
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
    @Query('period') period?: string,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const params = { period, year, quarter, startDate, endDate };
      return await this.inventoryMovementService.getInboundVsOutboundSummary(
        params,
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
          quantity: { type: 'number' },
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
      const data = await this.inventoryMovementService.findTopOutboundMovements(
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

  @Get('/stats')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({
    summary: 'Get overall inventory statistics',
    description:
      'Returns aggregated inventory statistics, including total inbound quantity, total outbound quantity, current in-stock quantity, total containers, and total inbound stock count. No query parameters are required.',
  })
  @ApiOkResponse({
    description: 'Overall inventory statistics successfully retrieved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalInbound: {
              type: 'number',
              description: 'Total quantity of inbound stock',
              example: 12500,
            },
            totalOutbound: {
              type: 'number',
              description: 'Total quantity of outbound stock',
              example: 9800,
            },
            totalInStock: {
              type: 'number',
              description: 'Total quantity currently in stock',
              example: 2700,
            },
            totalContainers: {
              type: 'number',
              description: 'Total number of stock containers',
              example: 320,
            },
            totalInboundStocks: {
              type: 'number',
              description: 'Total number of inbound stock entries recorded',
              example: 540,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden — Admin or Inventory Manager role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch inventory statistics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Failed to fetch inventory statistics',
        },
        error: { type: 'string', example: 'Database connection failed' },
      },
    },
  })
  async getInventoryStatistics(): Promise<{
    success: boolean;
    data: {
      totalInbound: number;
      totalOutbound: number;
      totalInStock: number;
      totalContainers: number;
      totalInboundStocks: number;
    };
  }> {
    try {
      const stats = await this.dashboardService.getDashboardStats();

      return {
        success: true,
        data: {
          totalInbound: stats.data.todayInbound,
          totalOutbound: stats.data.todayOutbound,
          totalInStock: stats.data.totalInStock,
          totalContainers: stats.data.totalContainersThisMonth,
          totalInboundStocks: stats.data.totalQuantityInContainersThisMonth,
        },
      };
    } catch {
      throw new HttpException(
        'Failed to fetch inventory statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
