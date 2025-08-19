import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomOrders } from 'src/entities/custom_orders.entity';
import { Repository } from 'typeorm';
import { QueryCustomOrdersDto } from './dto/query-custom-orders.dto';

@Injectable()
export class CustomOrdersService {
  constructor(
    @InjectRepository(CustomOrders)
    private readonly customOrdersRepo: Repository<CustomOrders>,
  ) {}

  async findAll(query: QueryCustomOrdersDto) {
    const { page, limit, status, sku, sortBy, sortOrder } = query;

    const qb = this.customOrdersRepo.createQueryBuilder('order');

    if (status) qb.andWhere('order.status = :status', { status });
    if (sku) qb.andWhere('order.sku LIKE :sku', { sku: `%${sku}%` });

    qb.orderBy(`order.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, totalCount] = await qb.getManyAndCount();

    return {
      data,
      page,
      limit,
      totalCount,
    };
  }
}
