import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/enums/roles.enum';
import {
  CreateInventoryLocationDto,
  CreateScannerInventoryLocationDto,
} from './dto/create-inventory-location.dto';
import { GetLocationByNumberOrSkuDto } from './dto/get-inventory.dto';
import {
  FindBySkuOrNumberResponseDto,
  InventoryLocationResponseDto,
} from './dto/inventory-location-response.dto';
import { QueryInventoryLocationDto } from './dto/query-inventory-location.dto';
import {
  RemoveQuantityDto,
  RemoveQuantityResponseDto,
} from './dto/remove-quantity.dto';
import { InventoryLocationService } from './inventory_location.service';

@ApiTags('Inventory Locations')
@Controller('inventory-locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryLocationController {
  constructor(
    private readonly inventoryLocationService: InventoryLocationService,
  ) {}

  @Post()
  @Roles(UserRole.MOBILE_APP, UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({
    summary: 'Create or update inventory location from mobile scan in',
    description: `
      This endpoint handles mobile app barcode scanning workflow:
      1. If SKU doesn't exist, creates new inventory record and location
      2. If SKU exists but bin doesn't exist, creates new location
      3. If both SKU and bin exist, updates existing location by adding quantities
      4. Automatically recalculates total inventory quantity across all locations
    `,
  })
  @ApiBody({
    type: CreateScannerInventoryLocationDto,
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
    @Body() createInventoryLocationDto: CreateScannerInventoryLocationDto,
    @Request() req: Request,
  ) {
    return await this.inventoryLocationService.createFromScanner(
      createInventoryLocationDto,
      req,
    );
  }

  @Post('add')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
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
  async addInventoryLocation(
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
        // proNumber: {
        //   type: 'string',
        //   example: 'SH1023',
        //   description: 'Pro number',
        // },
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

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Get all inventory locations with filtering and optional pagination',
    description:
      'Retrieve inventory locations with optional filtering by SKU, bin number, or location. Pagination is only applied when both page and limit parameters are provided.',
  })
  @ApiQuery({
    name: 'sku',
    required: false,
    description: 'Filter by SKU (partial match, case-insensitive)',
    example: 'SKU-001',
  })
  @ApiQuery({
    name: 'binNumber',
    required: false,
    description: 'Filter by bin number (partial match, case-insensitive)',
    example: 'BIN-A001',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location (partial match, case-insensitive)',
    example: 'Warehouse-A',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description:
      'Page number for pagination (must be used with limit parameter)',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description:
      'Items per page for pagination (max: 100, must be used with page parameter)',
    example: 10,
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'List of inventory locations retrieved successfully with pagination (when both page and limit are provided)',
    schema: {
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Inventory location ID',
                example: '550e8400-e29b-41d4-a716-446655440001',
              },
              inventoryId: {
                type: 'string',
                format: 'uuid',
                description: 'Referenced inventory ID',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              sku: {
                type: 'string',
                description: 'Inventory SKU',
                example: 'SKU-001',
              },
              binNumber: {
                type: 'string',
                description: 'Bin number',
                example: 'BIN-A001',
              },
              location: {
                type: 'string',
                description: 'Physical location',
                example: 'Warehouse-A, Section-1, Row-5',
              },
              quantity: {
                type: 'string',
                description: 'Quantity at this location',
                example: '150000',
              },
              totalQuantity: {
                type: 'string',
                description:
                  'Total quantity across all locations for this inventory',
                example: '500000',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp',
                example: '2024-01-15T10:30:00Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Last update timestamp',
                example: '2024-01-15T10:30:00Z',
              },
            },
          },
        },
        pagination: {
          type: 'object',
          required: ['page', 'limit', 'total', 'totalPages'],
          properties: {
            page: {
              type: 'number',
              description: 'Current page number',
              example: 1,
            },
            limit: {
              type: 'number',
              description: 'Items per page',
              example: 10,
            },
            total: {
              type: 'number',
              description: 'Total number of items',
              example: 42,
            },
            totalPages: {
              type: 'number',
              description: 'Total number of pages',
              example: 5,
            },
          },
        },
      },
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            inventoryId: '550e8400-e29b-41d4-a716-446655440000',
            sku: 'SKU-001',
            binNumber: 'BIN-A001',
            location: 'Warehouse-A, Section-1, Row-5',
            quantity: '150000',
            totalQuantity: '500000',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 42,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'List of inventory locations retrieved successfully without pagination (when page or limit is missing)',
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Inventory location ID',
                example: '550e8400-e29b-41d4-a716-446655440001',
              },
              inventoryId: {
                type: 'string',
                format: 'uuid',
                description: 'Referenced inventory ID',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              sku: {
                type: 'string',
                description: 'Inventory SKU',
                example: 'SKU-001',
              },
              binNumber: {
                type: 'string',
                description: 'Bin number',
                example: 'BIN-A001',
              },
              location: {
                type: 'string',
                description: 'Physical location',
                example: 'Warehouse-A, Section-1, Row-5',
              },
              quantity: {
                type: 'string',
                description: 'Quantity at this location',
                example: '150000',
              },
              totalQuantity: {
                type: 'string',
                description:
                  'Total quantity across all locations for this inventory',
                example: '500000',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp',
                example: '2024-01-15T10:30:00Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Last update timestamp',
                example: '2024-01-15T10:30:00Z',
              },
            },
          },
        },
      },
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            inventoryId: '550e8400-e29b-41d4-a716-446655440000',
            sku: 'SKU-001',
            binNumber: 'BIN-A001',
            location: 'Warehouse-A, Section-1, Row-5',
            quantity: '150000',
            totalQuantity: '500000',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            inventoryId: '550e8400-e29b-41d4-a716-446655440000',
            sku: 'SKU-001',
            binNumber: 'BIN-A002',
            location: 'Warehouse-B, Section-2, Row-1',
            quantity: '250000',
            totalQuantity: '500000',
            createdAt: '2024-01-15T11:00:00Z',
            updatedAt: '2024-01-15T11:00:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description:
      'Internal server error occurred while retrieving inventory locations',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 500,
        },
        message: {
          type: 'string',
          example: 'Failed to retrieve inventory locations',
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@Query() queryDto: QueryInventoryLocationDto) {
    return await this.inventoryLocationService.findAll(queryDto);
  }

  @Post('csv/preview')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview CSV data before import' })
  @ApiOkResponse({
    description: 'CSV preview data with validation results',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'Processed CSV data with validation flags',
        },
        totalRows: { type: 'number', example: 100 },
        validationErrors: {
          type: 'array',
          description: 'List of validation errors by row',
        },
        columns: { type: 'array', description: 'Detected CSV columns' },
        filename: { type: 'string', example: 'inventory.csv' },
        hasErrors: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid CSV content or missing required columns',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,

    description: 'Forbidden - Admin or Inventory Manager role required',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file to preview',
        },
      },
      required: ['file'],
    },
  })
  async previewCsv(@UploadedFile() file: Express.Multer.File): Promise<any> {
    if (!file || !file.buffer) {
      throw new BadRequestException('CSV file is required');
    }
    const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    const csvContent = file.buffer.toString('utf-8');
    const filename = file.originalname;
    try {
      return await this.inventoryLocationService.previewCsv(
        csvContent,
        filename,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        'Failed to process CSV content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('csv/import')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Import inventory location data from CSV' })
  @ApiOkResponse({
    description: 'CSV import results',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        filename: { type: 'string', example: 'inventory.csv' },
        totalProcessed: { type: 'number', example: 100 },
        imported: { type: 'number', example: 95 },
        failed: { type: 'number', example: 5 },
        failures: {
          type: 'array',
          description: 'Details of failed imports',
        },
        importedItems: {
          type: 'array',
          description: 'Successfully imported items',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data provided or no valid data to import',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inventory Manager role required',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'Validated CSV data from preview step',
        },
        filename: { type: 'string', example: 'inventory.csv' },
        skipErrors: { type: 'boolean', example: true },
      },
      required: ['data', 'filename'],
    },
  })
  async importCsv(
    @Body() body: { data: any[]; filename: string; skipErrors?: boolean },
    @Request() req,
  ): Promise<any> {
    try {
      const { data, filename, skipErrors } = body;

      if (!data || !Array.isArray(data)) {
        throw new BadRequestException('Invalid data provided');
      }

      return await this.inventoryLocationService.importCsv(
        data,
        filename,
        skipErrors,
        req.user,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        'Failed to import data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
