import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
} from '@nestjs/swagger';
import { PreOrdersService } from './pre-orders.service';
import { CreatePreOrderDto, MoveToProductionDto } from './dto/pre-order.dto';
import { PreOrderResponseDto } from './dto/pre-order-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/roles.enum';
import { PreOrdersQueryDto } from './dto/pre-orders-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Pre Orders')
@Controller('pre-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreOrdersController {
  constructor(private readonly preOrdersService: PreOrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new pre-order' })
  @ApiBody({ type: CreatePreOrderDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pre-order created successfully',
    type: PreOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(
    @Body() createPreOrderDto: CreatePreOrderDto,
    @Request() req: Request,
  ) {
    return this.preOrdersService.create(createPreOrderDto, req);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Get all pre-orders with counts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all pre-orders with production and dispatch counts',
    type: [PreOrderResponseDto],
  })
  async findAll(@Query() { status }: PreOrdersQueryDto) {
    return this.preOrdersService.findAllWithCounts(status);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Get a specific pre-order with counts' })
  @ApiParam({
    name: 'id',
    description: 'Pre-order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pre-order details with counts',
    type: PreOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pre-order not found',
  })
  async findOne(@Param('id') id: string) {
    return this.preOrdersService.findOneWithCounts(id);
  }

  @Post(':id/move-to-production')
  @Roles(UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Move a pre-order to production' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pre-order successfully moved to production',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input (e.g. non-numeric or negative quantity)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pre-order not found',
  })
  async moveToProduction(
    @Param('id') id: string,
    @Body() dto: MoveToProductionDto,
    @Request() req: Request,
  ) {
    return this.preOrdersService.moveToProduction(id, dto.quantity, req);
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
        filename: { type: 'string', example: 'preOrder.csv' },
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
      return await this.preOrdersService.previewCsv(csvContent, filename);
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
        filename: { type: 'string', example: 'preOrder.csv' },
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
        filename: { type: 'string', example: 'preOrder.csv' },
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
      return await this.preOrdersService.importCsv(
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
}
