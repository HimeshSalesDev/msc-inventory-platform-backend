import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';

import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../enums/roles.enum';
import { Inventory } from 'src/entities/inventory.entity';

import { FindQuantityBySkuDto } from './dto/find-quantity-by-sku.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { OrderConfirmationDto } from './dto/order-confirmation.dto';
import { OrderConfirmationResponseDto } from './dto/order-confirmation-response.dto';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.MOBILE_APP)
  @ApiOperation({ summary: 'Get all inventory items with optional filtering' })
  @ApiOkResponse({
    type: [Inventory],
    description: 'List of inventory items',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inventory Manager role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch inventory',
  })
  async findAll(
    @Query() queryDto: QueryInventoryDto,
  ): Promise<{ items: Inventory[] }> {
    try {
      const items = await this.inventoryService.findAll(queryDto);
      return { items };
    } catch {
      throw new HttpException(
        'Failed to fetch inventory',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('by-sku/:sku')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.MOBILE_APP)
  @ApiOperation({
    summary:
      'Get a single inventory item by SKU with its locations and references',
  })
  @ApiParam({
    name: 'sku',
    description: 'Stock Keeping Unit identifier for the inventory item',
    example: 'E4E4-85-M1',
    type: 'string',
  })
  @ApiOkResponse({
    type: Inventory,
    description:
      'Inventory item successfully retrieved with related inventory locations and references',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid SKU format provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inventory item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'Forbidden - Admin, Inventory Manager, or Mobile App role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error occurred while fetching inventory item',
  })
  async findOneBySku(@Param('sku') sku: string): Promise<{ data: Inventory }> {
    try {
      const data = await this.inventoryService.findOneBySku(sku);

      if (!data) {
        throw new NotFoundException(`Inventory item with SKU ${sku} not found`);
      }

      return { data };
    } catch {
      // Throw generic internal server error for unexpected exceptions
      throw new HttpException(
        'Failed to fetch inventory item due to server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Update an existing inventory item' })
  @ApiOkResponse({
    type: Inventory,
    description: 'Inventory item updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or ID is required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inventory item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inventory Manager role required',
  })
  async update(
    @Body() updateInventoryDto: UpdateInventoryDto,
    @Request() req: Request,
  ): Promise<Inventory> {
    try {
      if (!updateInventoryDto.id) {
        throw new BadRequestException('Id is required');
      }

      return await this.inventoryService.update(updateInventoryDto, req);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to update inventory item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('inhand-quantity')
  @Public()
  @ApiOperation({ summary: 'Get inventory in-hand quantity by SKU(s)' })
  @ApiBody({
    description:
      'Provide a single SKU as string or multiple SKUs as an array of strings.',
    type: FindQuantityBySkuDto,
  })
  @ApiOkResponse({
    type: [Inventory],
    description:
      'Returns the available in-hand quantity for the provided SKU(s)',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format or missing SKU(s)',
  })
  @ApiNotFoundResponse({
    description: 'Inventory record(s) not found for the given SKU(s)',
  })
  async findQuantityBySKU(
    @Body() body: FindQuantityBySkuDto,
  ): Promise<Inventory[]> {
    return await this.inventoryService.findQuantityBySKU(body.sku);
  }

  @Post('order-confirmation')
  @Public()
  @ApiOperation({
    summary: 'Confirm order and update inventory quantity',
    description: `
    This endpoint is used to confirm an order by SKU and adjust the inventory quantity.
    - Validates the SKU
    - Deducts or updates the quantity
    - Returns confirmation with updated row count
  `,
  })
  @ApiBody({
    type: OrderConfirmationDto,
    description: 'Order confirmation payload containing SKU and quantity',
  })
  @ApiOkResponse({
    description: 'Order confirmed and inventory updated successfully',
    type: OrderConfirmationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input (missing or malformed SKU/quantity)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Failed to confirm order' },
      },
    },
  })
  async orderConfirmation(
    @Body() orderConfirmationDto: OrderConfirmationDto,
    @Request() req: Request,
  ): Promise<OrderConfirmationResponseDto> {
    return await this.inventoryService.orderConfirmation(
      orderConfirmationDto,
      req,
    );
  }
}
