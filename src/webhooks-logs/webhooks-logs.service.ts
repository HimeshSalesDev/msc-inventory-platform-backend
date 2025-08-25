import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  WebhookLog,
  WebHookLogType,
  WebHookStatusType,
} from 'src/entities/webhook_logs.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateWebhookLogDto } from './dto/create-webhook-log.dto';
import { FilterWebhookLogsDto } from './dto/filter-webhook-logs.dto';
import { UpdateWebhookLogDto } from './dto/update-webhook-log.dto';

@Injectable()
export class WebhooksLogsService {
  private readonly logger = new Logger(WebhooksLogsService.name);

  constructor(
    @InjectRepository(WebhookLog)
    private readonly webhookLogRepo: Repository<WebhookLog>,
  ) {}

  /**
   * Creates a new webhook log entry.
   */
  async create(dto: CreateWebhookLogDto): Promise<WebhookLog> {
    const log = this.webhookLogRepo.create({
      ...dto,
    });
    return await this.webhookLogRepo.save(log);
  }

  async updateById(
    logId: string,
    dto: UpdateWebhookLogDto,
  ): Promise<WebhookLog> {
    if (!logId) {
      throw new Error('Log ID is required for update operation');
    }

    const existingLog = await this.webhookLogRepo.findOne({
      where: { id: logId },
    });

    if (!existingLog) {
      this.logger.error(`Webhook log with ID ${logId} not found`);
      return;
    }

    await this.webhookLogRepo.update(logId, dto);

    return await this.webhookLogRepo.findOne({
      where: { id: logId },
    });
  }

  async markAsStored(
    logId: string,
    response?: Record<string, any>,
    description?: string,
  ): Promise<WebhookLog> {
    return this.updateById(logId, {
      status: WebHookStatusType.STORED,
      response,
      description: description || 'Webhook processed successfully',
    });
  }

  async markAsError(logId: string, errorMessage: string): Promise<WebhookLog> {
    return this.updateById(logId, {
      status: WebHookStatusType.ERROR,
      response: { errorMessage: errorMessage },
      description: `Error: ${errorMessage}`,
    });
  }

  async findAll(queryDto: FilterWebhookLogsDto): Promise<{
    data: WebhookLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      type,
      startDate,
      endDate,
      page = 1,
      limit = 100,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.webhookLogRepo.createQueryBuilder('webhook_logs');

    this.applyFilters(queryBuilder, {
      type,
      startDate,
      endDate,
    });

    queryBuilder.orderBy(`webhook_logs.${sortBy}`, sortOrder);

    const [data, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<WebhookLog>,
    filters: {
      type?: WebHookLogType;
      startDate?: string;
      endDate?: string;
    },
  ): void {
    const { type, startDate, endDate } = filters;

    if (type) {
      queryBuilder.andWhere('webhook_logs.type = :type', { type });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'webhook_logs.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    } else if (startDate) {
      queryBuilder.andWhere('webhook_logs.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('webhook_logs.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }
  }
}
