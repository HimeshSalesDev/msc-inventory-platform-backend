import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  ParseUUIDPipe,
  UseGuards,
  Request,
  Req,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { UpdateInventoryLocationDto } from './dto/update-inventory-location.dto';
import { QueryInventoryLocationDto } from './dto/query-inventory-location.dto';
import {
  FindBySkuOrNumberResponseDto,
  InventoryLocationResponseDto,
} from './dto/inventory-location-response.dto';
import { InventoryLocationService } from './inventory_location.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/roles.enum';
import { GetLocationByNumberOrSkuDto } from './dto/get-inventory.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import {
  RemoveQuantityDto,
  RemoveQuantityResponseDto,
} from './dto/remove-quantity.dto';

@ApiTags('Inventory Locations')
@Controller('inventory-locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryLocationController {
  constructor(
    private readonly inventoryLocationService: InventoryLocationService,
  ) {}

  @Post()
  @Roles(UserRole.MOBILE_APP)
  @ApiOperation({
    summary: 'Create or update inventory location',
    description: `
      This endpoint handles mobile app barcode scanning workflow:
      1. If SKU doesn't exist, creates new inventory record and location
      2. If SKU exists but bin doesn't exist, creates new location
      3. If both SKU and bin exist, updates existing location by adding quantities
      4. Automatically recalculates total inventory quantity across all locations
    `,
  })
  @ApiBody({
    type: CreateInventoryLocationDto,
    description: 'Inventory location data from mobile scanning',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Inventory location created or updated successfully',
    type: InventoryLocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict with existing data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Bin number already exists for this inventory item',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() createInventoryLocationDto: CreateInventoryLocationDto,
    @Request() req: Request,
  ) {
    return await this.inventoryLocationService.create(
      createInventoryLocationDto,
      req,
    );
  }

  @Post('/find-by-sku-or-number')
  @Roles(UserRole.MOBILE_APP)
  @ApiOperation({
    summary: 'Get inventory locations by SKU or PRO number',
    description: `
    Fetches all inventory locations associated with a given SKU or PRO number.
    - Searches by SKU first; if not found, searches by PRO number.
    - Returns an array of location records for the matching inventory.
    - If no matching inventory is found, returns 404.
  `,
  })
  @ApiBody({
    description: 'Provide either SKU or PRO number in a single field',
    schema: {
      type: 'object',
      properties: {
        skuOrNumber: {
          type: 'string',
          example: 'SKU-001 or PRO-12345',
          description: 'The SKU or PRO number of the inventory item',
        },
      },
      required: ['skuOrNumber'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'List of inventory locations for the provided SKU or PRO number',
    type: FindBySkuOrNumberResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or missing SKU/PRO number',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No inventory found with provided SKU or PRO number',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example:
            'No inventory found for the provided SKU or number: "SKU-123".',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to fetch inventory location data.',
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getLocationBySkuOrPro(@Body() dto: GetLocationByNumberOrSkuDto) {
    return await this.inventoryLocationService.getLocationBySkuOrPro(dto);
  }

  @Post('remove-quantity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove quantity from inventory location',
    description:
      'Remove specified quantity from an inventory location and update total inventory quantity',
  })
  @ApiBody({
    description: 'Remove quantity request',
    schema: {
      type: 'object',
      properties: {
        inventoryLocationId: {
          type: 'string',
          example: 'uuid',
          description: 'ID of the inventory location',
        },
        quantity: {
          type: 'string',
          example: '10',
          description: 'Quantity to remove (as string to handle large numbers)',
        },
      },
      required: ['inventoryLocationId', 'quantity'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Quantity removed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        remainingQuantity: { type: 'string' },
        totalInventoryQuantity: { type: 'string' },
        sku: { type: 'string' },
        location: { type: 'string' },
        binNumber: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid quantity or insufficient stock',
  })
  @ApiResponse({
    status: 404,
    description: 'Inventory location not found',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async removeQuantity(
    @Body() removeDto: RemoveQuantityDto,
    @Req() req: any,
  ): Promise<RemoveQuantityResponseDto> {
    return this.inventoryLocationService.removeQuantity(removeDto, req);
  }

  // @Get()
  // @ApiOperation({
  //   summary: 'Get all inventory locations with filtering and pagination',
  //   description:
  //     'Retrieve inventory locations with optional filtering by SKU, bin number, or location',
  // })
  // @ApiQuery({
  //   name: 'sku',
  //   required: false,
  //   description: 'Filter by SKU (partial match)',
  //   example: 'SKU-001',
  // })
  // @ApiQuery({
  //   name: 'binNumber',
  //   required: false,
  //   description: 'Filter by bin number (partial match)',
  //   example: 'BIN-A001',
  // })
  // @ApiQuery({
  //   name: 'location',
  //   required: false,
  //   description: 'Filter by location (partial match)',
  //   example: 'Warehouse-A',
  // })
  // @ApiQuery({
  //   name: 'page',
  //   required: false,
  //   description: 'Page number (default: 1)',
  //   example: 1,
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   required: false,
  //   description:
  //     'Items per page (default: 10, max: 100). Leave empty to fetch all.',
  //   example: 10,
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'List of inventory locations retrieved successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       data: {
  //         type: 'array',
  //         items: { $ref: '#/components/schemas/InventoryLocationResponseDto' },
  //       },
  //       pagination: {
  //         type: 'object',
  //         required: [],
  //         properties: {
  //           page: { type: 'number', example: 1 },
  //           limit: { type: 'number', example: 10 },
  //           total: { type: 'number', example: 42 },
  //           totalPages: { type: 'number', example: 5 },
  //         },
  //       },
  //     },
  //   },
  // })
  // @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  // async findAll(@Query() queryDto: QueryInventoryLocationDto) {
  //   return await this.inventoryLocationService.findAll(queryDto);
  // }

  // @Get('/search')
  // @ApiOperation({
  //   summary: 'Search inventory location by SKU and bin number',
  //   description:
  //     'Find specific inventory location using SKU and bin number combination',
  // })
  // @ApiQuery({
  //   name: 'sku',
  //   required: true,
  //   description: 'Stock Keeping Unit',
  //   example: 'SKU-001',
  // })
  // @ApiQuery({
  //   name: 'binNumber',
  //   required: true,
  //   description: 'Bin number',
  //   example: 'BIN-A001',
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Inventory location found',
  //   type: InventoryLocationResponseDto,
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'Inventory location not found',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       statusCode: { type: 'number', example: 404 },
  //       message: { type: 'string', example: 'Inventory location not found' },
  //       error: { type: 'string', example: 'Not Found' },
  //     },
  //   },
  // })
  // async findBySkuAndBin(
  //   @Query('sku') sku: string,
  //   @Query('binNumber') binNumber: string,
  // ) {
  //   const result = await this.inventoryLocationService.findBySkuAndBin(
  //     sku,
  //     binNumber,
  //   );
  //   if (!result) {
  //     return {
  //       statusCode: HttpStatus.NOT_FOUND,
  //       message: 'Inventory location not found',
  //       data: null,
  //     };
  //   }
  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Inventory location found',
  //     data: result,
  //   };
  // }

  // @Get(':id')
  // @ApiOperation({
  //   summary: 'Get inventory location by ID',
  //   description:
  //     'Retrieve a specific inventory location by its unique identifier',
  // })
  // @ApiParam({
  //   name: 'id',
  //   description: 'Unique identifier of the inventory location',
  //   example: '550e8400-e29b-41d4-a716-446655440001',
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Inventory location retrieved successfully',
  //   type: InventoryLocationResponseDto,
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'Inventory location not found',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       statusCode: { type: 'number', example: 404 },
  //       message: {
  //         type: 'string',
  //         example: 'Inventory location with ID {id} not found',
  //       },
  //       error: { type: 'string', example: 'Not Found' },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Invalid UUID format',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       statusCode: { type: 'number', example: 400 },
  //       message: {
  //         type: 'string',
  //         example: 'Validation failed (uuid is expected)',
  //       },
  //       error: { type: 'string', example: 'Bad Request' },
  //     },
  //   },
  // })
  // async findOne(@Param('id', ParseUUIDPipe) id: string) {
  //   return await this.inventoryLocationService.findOne(id);
  // }

  // @Patch(':id')
  // @ApiOperation({
  //   summary: 'Update inventory location',
  //   description: `
  //     Update an existing inventory location.
  //     - Cannot update SKU (inventory association is immutable)
  //     - Updating bin number checks for uniqueness within the same inventory
  //     - Quantity changes trigger recalculation of total inventory quantity
  //   `,
  // })
  // @ApiParam({
  //   name: 'id',
  //   description: 'Unique identifier of the inventory location',
  //   example: '550e8400-e29b-41d4-a716-446655440001',
  // })
  // @ApiBody({
  //   type: UpdateInventoryLocationDto,
  //   description: 'Updated inventory location data',
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Inventory location updated successfully',
  //   type: InventoryLocationResponseDto,
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'Inventory location not found',
  // })
  // @ApiResponse({
  //   status: HttpStatus.CONFLICT,
  //   description: 'Bin number already exists for this inventory item',
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Invalid input data or UUID format',
  // })
  // @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  // async update(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() updateInventoryLocationDto: UpdateInventoryLocationDto,
  // ) {
  //   return await this.inventoryLocationService.update(
  //     id,
  //     updateInventoryLocationDto,
  //   );
  // }

  // @Delete(':id')
  // @ApiOperation({
  //   summary: 'Delete inventory location',
  //   description: `
  //     Delete an inventory location and automatically recalculate the total inventory quantity.
  //     This operation is irreversible and will immediately update the parent inventory's total quantity.
  //   `,
  // })
  // @ApiParam({
  //   name: 'id',
  //   description: 'Unique identifier of the inventory location to delete',
  //   example: '550e8400-e29b-41d4-a716-446655440001',
  // })
  // @ApiResponse({
  //   status: HttpStatus.NO_CONTENT,
  //   description: 'Inventory location deleted successfully',
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'Inventory location not found',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       statusCode: { type: 'number', example: 404 },
  //       message: {
  //         type: 'string',
  //         example: 'Inventory location with ID {id} not found',
  //       },
  //       error: { type: 'string', example: 'Not Found' },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Invalid UUID format',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       statusCode: { type: 'number', example: 400 },
  //       message: {
  //         type: 'string',
  //         example: 'Validation failed (uuid is expected)',
  //       },
  //       error: { type: 'string', example: 'Bad Request' },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: HttpStatus.INTERNAL_SERVER_ERROR,
  //   description: 'Internal server error during deletion',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       statusCode: { type: 'number', example: 500 },
  //       message: {
  //         type: 'string',
  //         example: 'Failed to delete inventory location',
  //       },
  //     },
  //   },
  // })
  // async remove(@Param('id', ParseUUIDPipe) id: string) {
  //   await this.inventoryLocationService.remove(id);
  //   return {
  //     statusCode: HttpStatus.NO_CONTENT,
  //     message: 'Inventory location deleted successfully',
  //   };
  // }

  // @Get('/inventory/:inventoryId/locations')
  // @ApiOperation({
  //   summary: 'Get all locations for a specific inventory item',
  //   description:
  //     'Retrieve all storage locations for a given inventory item by inventory ID',
  // })
  // @ApiParam({
  //   name: 'inventoryId',
  //   description: 'Unique identifier of the inventory item',
  //   example: '550e8400-e29b-41d4-a716-446655440000',
  // })
  // @ApiQuery({
  //   name: 'page',
  //   required: false,
  //   description: 'Page number (default: 1)',
  //   example: 1,
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   required: false,
  //   description: 'Items per page (default: 10, max: 100)',
  //   example: 10,
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Inventory locations retrieved successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       data: {
  //         type: 'array',
  //         items: { $ref: '#/components/schemas/InventoryLocationResponseDto' },
  //       },
  //       pagination: {
  //         type: 'object',
  //         properties: {
  //           page: { type: 'number' },
  //           limit: { type: 'number' },
  //           total: { type: 'number' },
  //           totalPages: { type: 'number' },
  //         },
  //       },
  //       summary: {
  //         type: 'object',
  //         properties: {
  //           totalQuantity: {
  //             type: 'string',
  //             description: 'Total quantity across all locations',
  //           },
  //           locationCount: {
  //             type: 'number',
  //             description: 'Number of storage locations',
  //           },
  //         },
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'Inventory item not found',
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Invalid UUID format',
  // })
  // async findLocationsByInventoryId(
  //   @Param('inventoryId', ParseUUIDPipe) inventoryId: string,
  //   @Query('page') page: string = '1',
  //   @Query('limit') limit: string = '10',
  // ) {
  //   return await this.inventoryLocationService.findLocationsByInventoryId(
  //     inventoryId,
  //     parseInt(page) || 1,
  //     Math.min(100, parseInt(limit) || 10),
  //   );
  // }

  // @Post('/bulk')
  // @ApiOperation({
  //   summary: 'Bulk create/update inventory locations',
  //   description: `
  //     Process multiple inventory location operations in a single transaction.
  //     Useful for batch processing from mobile app synchronization.
  //     All operations succeed or fail together to maintain data consistency.
  //   `,
  // })
  // @ApiBody({
  //   type: [CreateInventoryLocationDto],
  //   description: 'Array of inventory location data',
  // })
  // @ApiResponse({
  //   status: HttpStatus.CREATED,
  //   description: 'Bulk operation completed successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       statusCode: { type: 'number', example: 201 },
  //       message: {
  //         type: 'string',
  //         example: 'Bulk operation completed successfully',
  //       },
  //       data: {
  //         type: 'object',
  //         properties: {
  //           processed: {
  //             type: 'number',
  //             description: 'Number of items processed',
  //           },
  //           created: {
  //             type: 'number',
  //             description: 'Number of new locations created',
  //           },
  //           updated: {
  //             type: 'number',
  //             description: 'Number of existing locations updated',
  //           },
  //           results: {
  //             type: 'array',
  //             items: {
  //               $ref: '#/components/schemas/InventoryLocationResponseDto',
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Invalid input data in bulk operation',
  // })
  // @ApiResponse({
  //   status: HttpStatus.INTERNAL_SERVER_ERROR,
  //   description: 'Bulk operation failed - all changes rolled back',
  // })
  // @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  // async bulkCreateUpdate(
  //   @Body() createInventoryLocationDtos: CreateInventoryLocationDto[],
  // ) {
  //   if (
  //     !Array.isArray(createInventoryLocationDtos) ||
  //     createInventoryLocationDtos.length === 0
  //   ) {
  //     return {
  //       statusCode: HttpStatus.BAD_REQUEST,
  //       message:
  //         'Request body must be a non-empty array of inventory location data',
  //     };
  //   }

  //   if (createInventoryLocationDtos.length > 100) {
  //     return {
  //       statusCode: HttpStatus.BAD_REQUEST,
  //       message: 'Bulk operation limited to 100 items per request',
  //     };
  //   }

  //   return await this.inventoryLocationService.bulkCreateUpdate(
  //     createInventoryLocationDtos,
  //   );
  // }

  // @Get('/analytics/summary')
  // @ApiOperation({
  //   summary: 'Get inventory locations analytics summary',
  //   description:
  //     'Retrieve summary statistics for inventory locations including totals and distribution',
  // })
  // @ApiQuery({
  //   name: 'sku',
  //   required: false,
  //   description: 'Filter analytics by specific SKU',
  //   example: 'SKU-001',
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Analytics summary retrieved successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       statusCode: { type: 'number', example: 200 },
  //       message: {
  //         type: 'string',
  //         example: 'Analytics summary retrieved successfully',
  //       },
  //       data: {
  //         type: 'object',
  //         properties: {
  //           totalLocations: {
  //             type: 'number',
  //             description: 'Total number of storage locations',
  //           },
  //           totalInventoryItems: {
  //             type: 'number',
  //             description: 'Total unique inventory items',
  //           },
  //           totalQuantity: {
  //             type: 'string',
  //             description: 'Sum of all quantities across locations',
  //           },
  //           averageQuantityPerLocation: {
  //             type: 'string',
  //             description: 'Average quantity per location',
  //           },
  //           topLocations: {
  //             type: 'array',
  //             description: 'Top 10 locations by quantity',
  //             items: {
  //               type: 'object',
  //               properties: {
  //                 location: { type: 'string' },
  //                 totalQuantity: { type: 'string' },
  //                 itemCount: { type: 'number' },
  //               },
  //             },
  //           },
  //           topBins: {
  //             type: 'array',
  //             description: 'Top 10 bins by quantity',
  //             items: {
  //               type: 'object',
  //               properties: {
  //                 binNumber: { type: 'string' },
  //                 totalQuantity: { type: 'string' },
  //                 location: { type: 'string' },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // })
  // async getAnalyticsSummary(@Query('sku') sku?: string) {
  //   return await this.inventoryLocationService.getAnalyticsSummary(sku);
  // }
}
