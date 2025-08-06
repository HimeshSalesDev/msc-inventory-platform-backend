import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
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
    } catch (error) {
      throw new HttpException(
        'Failed to fetch inventory',
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

  // @Post('csv/preview')
  // @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  // @UseInterceptors(FileInterceptor('file'))
  // @ApiConsumes('multipart/form-data')
  // @ApiOperation({ summary: 'Preview CSV data before import' })
  // @ApiOkResponse({
  //   description: 'CSV preview data with validation results',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       data: {
  //         type: 'array',
  //         description: 'Processed CSV data with validation flags',
  //       },
  //       totalRows: { type: 'number', example: 100 },
  //       validationErrors: {
  //         type: 'array',
  //         description: 'List of validation errors by row',
  //       },
  //       columns: { type: 'array', description: 'Detected CSV columns' },
  //       filename: { type: 'string', example: 'inventory.csv' },
  //       hasErrors: { type: 'boolean', example: false },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Invalid CSV content or missing required columns',
  // })
  // @ApiResponse({
  //   status: HttpStatus.FORBIDDEN,

  //   description: 'Forbidden - Admin or Inventory Manager role required',
  // })
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: {
  //         type: 'string',
  //         format: 'binary',
  //         description: 'CSV file to preview',
  //       },
  //     },
  //     required: ['file'],
  //   },
  // })
  // async previewCsv(@UploadedFile() file: Express.Multer.File): Promise<any> {
  //   if (!file || !file.buffer) {
  //     throw new BadRequestException('CSV file is required');
  //   }
  //   const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];
  //   if (!allowedMimeTypes.includes(file.mimetype)) {
  //     throw new BadRequestException('Only CSV files are allowed');
  //   }

  //   const csvContent = file.buffer.toString('utf-8');
  //   const filename = file.originalname;

  //   try {
  //     return await this.inventoryService.previewCsv(csvContent, filename);
  //   } catch (error) {
  //     if (error instanceof BadRequestException) {
  //       throw error;
  //     }
  //     throw new HttpException(
  //       'Failed to process CSV content',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Post('csv/import')
  // @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  // @ApiOperation({ summary: 'Import inventory data from CSV' })
  // @ApiOkResponse({
  //   description: 'CSV import results',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean', example: true },
  //       filename: { type: 'string', example: 'inventory.csv' },
  //       totalProcessed: { type: 'number', example: 100 },
  //       imported: { type: 'number', example: 95 },
  //       failed: { type: 'number', example: 5 },
  //       failures: {
  //         type: 'array',
  //         description: 'Details of failed imports',
  //       },
  //       importedItems: {
  //         type: 'array',
  //         description: 'Successfully imported items',
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Invalid data provided or no valid data to import',
  // })
  // @ApiResponse({
  //   status: HttpStatus.FORBIDDEN,
  //   description: 'Forbidden - Admin or Inventory Manager role required',
  // })
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       data: {
  //         type: 'array',
  //         description: 'Validated CSV data from preview step',
  //       },
  //       filename: { type: 'string', example: 'inventory.csv' },
  //       skipErrors: { type: 'boolean', example: true },
  //     },
  //     required: ['data', 'filename'],
  //   },
  // })
  // async importCsv(
  //   @Body() body: { data: any[]; filename: string; skipErrors?: boolean },
  //   @Request() req,
  // ): Promise<any> {
  //   try {
  //     const { data, filename, skipErrors } = body;

  //     if (!data || !Array.isArray(data)) {
  //       throw new BadRequestException('Invalid data provided');
  //     }

  //     return await this.inventoryService.importCsv(
  //       data,
  //       filename,
  //       skipErrors,
  //       req.user,
  //     );
  //   } catch (error) {
  //     if (error instanceof BadRequestException) {
  //       throw error;
  //     }
  //     throw new HttpException(
  //       'Failed to import data',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

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
  ): Promise<OrderConfirmationResponseDto> {
    return await this.inventoryService.orderConfirmation(orderConfirmationDto);
  }
}
