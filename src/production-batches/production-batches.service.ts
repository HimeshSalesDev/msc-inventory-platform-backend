import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductionBatchResponseDto } from './dto/production-batch-response.dto';
import { ProductionBatch } from 'src/entities/production_batches.entity';
import { PreOrder } from 'src/entities/pre_orders.entity';
import { Inbound } from 'src/entities/inbound.entity';
import { MoveToShippedDto } from './dto/production-batch.dto';

@Injectable()
export class ProductionBatchesService {
  constructor(
    @InjectRepository(ProductionBatch)
    private productionBatchRepository: Repository<ProductionBatch>,
    @InjectRepository(PreOrder)
    private preOrderRepository: Repository<PreOrder>,

    @InjectRepository(Inbound)
    private inboundRepository: Repository<Inbound>,
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
    const dispatchedResult = await this.inboundRepository
      .createQueryBuilder('inbound')
      .select('COALESCE(SUM(inbound.quantity), 0)', 'total')
      .where('inbound.productionBatchId = :batchId', { batchId })
      .getRawOne();

    const totalDispatched = parseInt(dispatchedResult?.total || '0', 10);

    const quantityPendingDispatch = quantityInProduction - totalDispatched;

    return { totalDispatched, quantityPendingDispatch };
  }

  async moveToShipped(
    id: string,
    dto: MoveToShippedDto,
    req: any,
  ): Promise<Inbound> {
    // Find the production batch with related preOrder
    const productionBatch = await this.productionBatchRepository.findOne({
      where: { id: id },
      relations: ['preOrder'],
    });

    if (!productionBatch?.preOrder) {
      throw new NotFoundException('Related pre-order not found');
    }

    const { quantityPendingDispatch } = await this.calculateDispatchCounts(
      productionBatch.id,
      productionBatch.quantityInProduction,
    );

    // Validate quantity against available quantity in production
    if (dto.quantity > quantityPendingDispatch) {
      throw new BadRequestException(
        `Invalid quantity. Only ${quantityPendingDispatch} items pending in production batch`,
      );
    }

    // Validate ETA if provided
    if (dto.eta) {
      const etaDate = new Date(dto.eta);
      if (isNaN(etaDate.getTime())) {
        throw new BadRequestException('Invalid ETA date format');
      }

      // Optional: Validate ETA is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (etaDate < today) {
        throw new BadRequestException('ETA cannot be in the past');
      }
    }

    // Create the inbound record
    const inboundRecord = this.inboundRepository.create({
      quantity: dto.quantity.toString(),
      containerNumber: dto.containerNumber.trim(),
      poNumber: dto.poNumber ? dto.poNumber.trim() : null,
      eta: dto.eta ? new Date(dto.eta) : null,
      productionBatchId: id,
      sku: productionBatch.preOrder.sku,
      vendorDescription: null, // Set if available
      length: productionBatch.preOrder.length,
      width: productionBatch.preOrder.width,
      radius: productionBatch.preOrder.radius,
      skirt: productionBatch.preOrder.skirt,
      taper: productionBatch.preOrder.taper,
      foamDensity: productionBatch.preOrder.foamDensity,
      stripInsert: productionBatch.preOrder.stripInsert,
      shape: productionBatch.preOrder.shape,
      materialNumber: productionBatch.preOrder.materialNumber,
      materialType: productionBatch.preOrder.materialType,
      materialColor: productionBatch.preOrder.materialColor,

      preBookedQuantity: '0',
      etd: null,
      shipped: 'shipped',
      offloadedDate: null,
    });

    try {
      // Save the inbound record
      const savedInbound = await this.inboundRepository.save(inboundRecord);

      return savedInbound;
    } catch {
      throw new InternalServerErrorException('Failed to create shipped record');
    }
  }
}
