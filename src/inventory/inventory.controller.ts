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
  ConflictException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../enums/roles.enum';
import { Inventory } from 'src/entities/inventory.entity';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Create a new inventory item' })
  @ApiCreatedResponse({
    type: Inventory,
    description: 'Inventory item created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or required fields missing',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Inventory with SKU already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inventory Manager role required',
  })
  async create(
    @Body() createInventoryDto: CreateInventoryDto,
  ): Promise<Inventory> {
    try {
      // Validate required fields
      if (
        !createInventoryDto.sku ||
        !createInventoryDto.length ||
        !createInventoryDto.skirt ||
        !createInventoryDto.foamDensity
      ) {
        throw new BadRequestException('Required fields are missing.');
      }

      return await this.inventoryService.create(createInventoryDto);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to create inventory item',
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

  @Delete()
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  @ApiOperation({ summary: 'Delete an inventory item' })
  @ApiOkResponse({
    description: 'Inventory item deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Inventory deleted' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Inventory ID is required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inventory item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inventory Manager role required',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
      },
      required: ['id'],
    },
  })
  async delete(
    @Body() body: { id: string },
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!body.id) {
        throw new BadRequestException('Inventory ID is required');
      }

      await this.inventoryService.delete(body.id);
      return { success: true, message: 'Inventory deleted' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete inventory item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      return await this.inventoryService.previewCsv(csvContent, filename);
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
  @ApiOperation({ summary: 'Import inventory data from CSV' })
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

      return await this.inventoryService.importCsv(
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
