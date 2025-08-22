import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  UseInterceptors,
  UploadedFile,
  UsePipes,
  ValidationPipe,
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../enums/roles.enum';

import { FileInterceptor } from '@nestjs/platform-express';
import { InboundService } from './inbound.service';
import { Inbound } from 'src/entities/inbound.entity';
import { QueryInboundDto } from './dto/query-inbound.dto';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { UpdateInboundDto } from './dto/update-inbound.dto';
import { UpdateContainerFieldDto } from './dto/update-container-field.dto';

@ApiTags('inbound')
@Controller('inbound')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InboundController {
  constructor(private inboundService: InboundService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Get all inbound items with optional filtering' })
  @ApiOkResponse({
    type: [Inbound],
    description: 'List of inbound items',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inbound Manager role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch Inbound',
  })
  async findAll(
    @Query() queryDto: QueryInboundDto,
  ): Promise<{ items: Inbound[] }> {
    try {
      const items = await this.inboundService.findAll(queryDto);
      return { items };
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

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Create a new inbound item' })
  @ApiCreatedResponse({
    type: Inbound,
    description: 'Inbound item created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or required fields missing',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Inbound with SKU already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inbound Manager role required',
  })
  async create(
    @Body() createInboundDto: CreateInboundDto,
    @Request() req: Request,
  ): Promise<Inbound> {
    try {
      // Validate required fields
      if (!createInboundDto.sku) {
        throw new BadRequestException('Required fields are missing.');
      }

      return await this.inboundService.create(createInboundDto, req);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to create inbound item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('csv/preview')
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
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
        filename: { type: 'string', example: 'inbound.csv' },
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
    description: 'Forbidden - Admin or Inbound Manager role required',
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
      return await this.inboundService.previewCsv(csvContent, filename);
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
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Import inventory data from CSV' })
  @ApiOkResponse({
    description: 'CSV import results',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        filename: { type: 'string', example: 'inbound.csv' },
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
    description: 'Forbidden - Admin or Inbound Manager role required',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'Validated CSV data from preview step',
        },
        filename: { type: 'string', example: 'inbound.csv' },
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
      return await this.inboundService.importCsv(
        data,
        filename,
        skipErrors,
        req,
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

  @Put()
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Update an existing inbound item' })
  @ApiOkResponse({
    type: Inbound,
    description: 'Inbound item updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or ID is required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inbound item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inbound Manager role required',
  })
  async update(
    @Body() updateInboundDto: UpdateInboundDto,
    @Request() req: Request,
  ): Promise<Inbound> {
    try {
      if (!updateInboundDto.id) {
        throw new BadRequestException('Id is required');
      }

      return await this.inboundService.update(updateInboundDto, req);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to update inbound item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete()
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Delete an inbound item' })
  @ApiOkResponse({
    description: 'Inbound item deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Inbound deleted' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Inbound ID is required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inbound item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or Inbound Manager role required',
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
    @Request() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!body.id) {
        throw new BadRequestException('Inbound ID is required');
      }

      await this.inboundService.delete(body.id, req);
      return { success: true, message: 'Inbound deleted' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete inbound item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('update-by-container')
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({
    summary: 'Update fields for all inbounds with given container number',
    description:
      'Updates all inbound records that have the specified container number. At least one of etd, eta, shipped, or offloadedDate must be provided.',
  })
  @ApiResponse({ status: 200, description: 'Records updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or missing fields' })
  @ApiResponse({ status: 404, description: 'No matching records found' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateByContainer(
    @Body() dto: UpdateContainerFieldDto,
    @Request() req: Request,
  ) {
    return this.inboundService.updateByContainerNumber(dto, req);
  }
}
