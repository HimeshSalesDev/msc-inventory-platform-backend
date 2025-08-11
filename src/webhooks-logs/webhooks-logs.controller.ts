import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WebhooksLogsService } from './webhooks-logs.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  FilterWebhookLogsDto,
  PaginatedWebHookLogResponseDto,
} from './dto/filter-webhook-logs.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/roles.enum';

@ApiTags('webhook-logs')
@Controller('webhook-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WebhookLogsController {
  constructor(private readonly webhookLogsService: WebhooksLogsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all webhooks logs with pagination and filtering',
  })
  @ApiOkResponse({
    type: PaginatedWebHookLogResponseDto,
    description: 'Web hook logs retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin  role required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch logs',
  })
  async findAll(@Query() filter: FilterWebhookLogsDto) {
    return await this.webhookLogsService.findAll(filter);
  }
}
