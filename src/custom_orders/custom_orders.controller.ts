import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomOrdersService } from './custom_orders.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/enums/roles.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  PaginatedCustomOrdersResponseDto,
  QueryCustomOrdersDto,
} from './dto/query-custom-orders.dto';

@ApiTags('Custom Orders')
@Controller('custom-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomOrdersController {
  constructor(private readonly customOrdersService: CustomOrdersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all custom orders with pagination and filtering',
  })
  @ApiOkResponse({
    type: PaginatedCustomOrdersResponseDto,
    description: 'Custom orders retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch records',
  })
  async findAll(@Query() queryDto: QueryCustomOrdersDto) {
    return await this.customOrdersService.findAll(queryDto);
  }
}
