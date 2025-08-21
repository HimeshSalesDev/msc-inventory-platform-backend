import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePreOrderDto } from './dto/pre-order.dto';
import {
  PreOrderResponseDto,
  PreOrderCountsDto,
} from './dto/pre-order-response.dto';
import { PreOrder, PreOrderStatusEnums } from 'src/entities/pre_orders.entity';
import { ProductionBatch } from 'src/entities/production_batches.entity';

@Injectable()
export class PreOrdersService {
  constructor(
    @InjectRepository(PreOrder)
    private preOrderRepository: Repository<PreOrder>,
    @InjectRepository(ProductionBatch)
    private productionBatchRepository: Repository<ProductionBatch>,
  ) {}

  async create(
    createPreOrderDto: CreatePreOrderDto,
    req: any,
  ): Promise<PreOrderResponseDto> {
    const preOrder = this.preOrderRepository.create({
      ...createPreOrderDto,
      createdBy: req?.user?.id || '',
    });
    const savedPreOrder = await this.preOrderRepository.save(preOrder);

    return {
      ...savedPreOrder,
      counts: {
        inProduction: 0,
        dispatched: 0,
        remaining: savedPreOrder.totalQuantity,
      },
    };
  }

  async findAllWithCounts(
    status?: PreOrderStatusEnums,
  ): Promise<PreOrderResponseDto[]> {
    const whereClause = status ? { status } : undefined;

    const preOrders = await this.preOrderRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    const preOrdersWithCounts = await Promise.all(
      preOrders.map(async (preOrder) => {
        const counts = await this.calculateCounts(preOrder.id);
        return {
          ...preOrder,
          counts,
        };
      }),
    );

    return preOrdersWithCounts;
  }

  async findOneWithCounts(id: string): Promise<PreOrderResponseDto> {
    const preOrder = await this.preOrderRepository.findOne({
      where: { id },
    });

    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }

    const counts = await this.calculateCounts(id);

    return {
      ...preOrder,
      counts,
    };
  }

  async moveToProduction(
    preOrderId: string,
    quantity: number,
    req: any,
  ): Promise<ProductionBatch> {
    const preOrder = await this.preOrderRepository.findOne({
      where: { id: preOrderId },
      select: ['id', 'totalQuantity'],
    });

    if (!preOrder) {
      throw new NotFoundException('Pre-order not found');
    }

    // Calculate current counts
    const counts = await this.calculateCounts(preOrderId);

    // ✅ Validation checks
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (quantity > counts.remaining) {
      throw new Error(
        `Invalid quantity. Only ${counts.remaining} items remaining to move into production`,
      );
    }

    const productionBatch = this.productionBatchRepository.create({
      preOrderId,
      quantityInProduction: quantity,
      movedBy: req?.user?.id || '',
    });

    return this.productionBatchRepository.save(productionBatch);
  }

  private async calculateCounts(
    preOrderId: string,
  ): Promise<PreOrderCountsDto> {
    // Get total quantity in production
    const inProductionResult = await this.productionBatchRepository
      .createQueryBuilder('pb')
      .select('COALESCE(SUM(pb.quantityInProduction), 0)', 'total')
      .where('pb.preOrderId = :preOrderId', { preOrderId })
      .getRawOne();

    const inProduction = parseInt(inProductionResult?.total || '0');

    // Get total quantity dispatched
    // const dispatchedResult = await this.dispatchedPreOrderRepository
    //   .createQueryBuilder('dpo')
    //   .innerJoin('dpo.productionBatch', 'pb')
    //   .select('COALESCE(SUM(dpo.quantityDispatched), 0)', 'total')
    //   .where('pb.preOrderId = :preOrderId', { preOrderId })
    //   .getRawOne();

    // const dispatched = parseInt(dispatchedResult?.total || '0');
    const dispatched = 0;
    // Get pre-order total quantity to calculate remaining
    const preOrder = await this.preOrderRepository.findOne({
      where: { id: preOrderId },
      select: ['totalQuantity'],
    });

    const remaining = (preOrder?.totalQuantity || 0) - inProduction;

    return {
      inProduction,
      dispatched,
      remaining,
    };
  }
}
