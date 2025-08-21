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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PreOrdersService } from './pre-orders.service';
import { CreatePreOrderDto, MoveToProductionDto } from './dto/pre-order.dto';
import { PreOrderResponseDto } from './dto/pre-order-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/roles.enum';
import { PreOrdersQueryDto } from './dto/pre-orders-query.dto';

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
}
