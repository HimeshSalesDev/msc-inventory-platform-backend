import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InventoryReferenceService } from './inventory_reference.service';
import { CreateInventoryReferenceDto } from './dto/create_inventory_reference.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { InventoryReferenceResponseDto } from './dto/inventory_reference_response.dto';
import { UserRole } from 'src/enums/roles.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  InventoryReferenceQueryDto,
  PaginatedInventoryReferenceResponseDto,
  UpdateQuantityDto,
} from './dto/query_inventory_reference.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('inventory-reference')
export class InventoryReferenceController {
  constructor(
    private readonly inventoryReferenceService: InventoryReferenceService,
  ) {}

  @Post()
  @ApiBody({
    type: CreateInventoryReferenceDto,
    description: 'Inventory reference data from trends',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Inventory reference created or updated successfully',
    type: InventoryReferenceResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createInventoryReference(
    @Body() createInventoryReferenceDto: CreateInventoryReferenceDto,
    @Request() req: Request,
  ) {
    try {
      if (
        !createInventoryReferenceDto.sku ||
        !createInventoryReferenceDto.number ||
        !createInventoryReferenceDto.type
      ) {
        throw new BadRequestException('Required fields are missing.');
      }

      return await this.inventoryReferenceService.create(
        createInventoryReferenceDto,
        req,
      );
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.MOBILE_APP)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all inventory reference orders with pagination and filtering',
  })
  @ApiOkResponse({
    type: PaginatedInventoryReferenceResponseDto,
    description: 'Inventory reference retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin, inventory and mobile role required',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch records',
  })
  async findAll(@Query() queryDto: InventoryReferenceQueryDto) {
    return await this.inventoryReferenceService.findAll(queryDto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.MOBILE_APP)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: InventoryReferenceResponseDto,
    description: 'Inventory reference quantity updated to zero successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid request data or inventory reference already has zero quantity',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Inventory reference 550e8400-e29b-41d4-a716-446655440000 already has zero quantity',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inventory reference not found',
    schema: {
      example: {
        statusCode: 404,
        message:
          'Inventory reference with ID 550e8400-e29b-41d4-a716-446655440000 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin or inventory manager role required',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Validation failed',
    schema: {
      example: {
        statusCode: 422,
        message: ['ID must be a valid UUID'],
        error: 'Unprocessable Entity',
      },
    },
  })
  async updateQuantityToZero(
    @Body() updateQuantityDto: UpdateQuantityDto,
    @Request() req: Request,
  ): Promise<InventoryReferenceResponseDto> {
    return await this.inventoryReferenceService.updateQuantityToZero(
      updateQuantityDto,
      req,
    );
  }
}
