import { Controller, Get, Param, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductionBatchesService } from './production-batches.service';
import { ProductionBatchResponseDto } from './dto/production-batch-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/enums/roles.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Production Batches')
@Controller('production-batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductionBatchesController {
  constructor(
    private readonly productionBatchesService: ProductionBatchesService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Get all production batches' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all production batches with remaining quantities',
    type: [ProductionBatchResponseDto],
  })
  async findAll() {
    return this.productionBatchesService.findAll();
  }

  @Get('order/:orderId')
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Get production batches for a specific pre-order' })
  @ApiParam({
    name: 'orderId',
    description: 'Pre-order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Production batches for the specified pre-order',
    type: [ProductionBatchResponseDto],
  })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.productionBatchesService.findByOrderId(orderId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.INBOUND_MANAGER)
  @ApiOperation({ summary: 'Get a specific production batch' })
  @ApiParam({
    name: 'id',
    description: 'Production batch ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Production batch details with remaining quantity',
    type: ProductionBatchResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Production batch not found',
  })
  async findOne(@Param('id') id: string) {
    return this.productionBatchesService.findOne(id);
  }
}
