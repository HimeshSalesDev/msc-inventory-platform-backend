import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductionBatchResponseDto } from './dto/production-batch-response.dto';
import { ProductionBatch } from 'src/entities/production_batches.entity';
import { PreOrder } from 'src/entities/pre_orders.entity';

@Injectable()
export class ProductionBatchesService {
  constructor(
    @InjectRepository(ProductionBatch)
    private productionBatchRepository: Repository<ProductionBatch>,
    @InjectRepository(PreOrder)
    private preOrderRepository: Repository<PreOrder>,
  ) {}

  async findAll(): Promise<ProductionBatchResponseDto[]> {
    const batches = await this.productionBatchRepository.find({
      relations: ['preOrder'],
      order: { movedAt: 'DESC' },
    });

    return Promise.all(
      batches.map(async (batch) => {
        const { totalDispatched, quantityPendingDispatch } =
          await this.calculateDispatchCounts(
            batch.id,
            batch.quantityInProduction,
          );
        return {
          ...batch,
          totalDispatched,
          quantityPendingDispatch,
          preOrder: batch.preOrder,
        };
      }),
    );
  }

  async findByOrderId(
    preOrderId: string,
  ): Promise<ProductionBatchResponseDto[]> {
    const batches = await this.productionBatchRepository.find({
      where: { preOrderId },
      relations: ['preOrder'],
      order: { movedAt: 'DESC' },
    });

    return Promise.all(
      batches.map(async (batch) => {
        const { totalDispatched, quantityPendingDispatch } =
          await this.calculateDispatchCounts(
            batch.id,
            batch.quantityInProduction,
          );
        return {
          ...batch,
          totalDispatched,
          quantityPendingDispatch,
          preOrder: batch.preOrder,
        };
      }),
    );
  }

  async findOne(id: string): Promise<ProductionBatchResponseDto> {
    const batch = await this.productionBatchRepository.findOne({
      where: { id },
      relations: ['preOrder'],
    });

    if (!batch) {
      throw new NotFoundException('Production batch not found');
    }

    const { totalDispatched, quantityPendingDispatch } =
      await this.calculateDispatchCounts(id, batch.quantityInProduction);

    return {
      ...batch,
      totalDispatched,
      quantityPendingDispatch,
      preOrder: batch.preOrder,
    };
  }

  private async calculateDispatchCounts(
    batchId: string,
    quantityInProduction: number,
  ): Promise<{
    totalDispatched: number;
    quantityPendingDispatch: number;
  }> {
    // const dispatchedResult = await this.dispatchedPreOrderRepository
    //   .createQueryBuilder('dpo')
    //   .select('COALESCE(SUM(dpo.quantityDispatched), 0)', 'total')
    //   .where('dpo.productionBatchId = :batchId', { batchId })
    //   .getRawOne();

    // const totalDispatched = parseInt(dispatchedResult?.total || '0', 10);

    const totalDispatched = 0;
    const quantityPendingDispatch = quantityInProduction - totalDispatched;

    return { totalDispatched, quantityPendingDispatch };
  }
}
