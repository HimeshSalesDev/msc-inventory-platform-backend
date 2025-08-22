import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductionBatchResponseDto } from './dto/production-batch-response.dto';
import { ProductionBatch } from 'src/entities/production_batches.entity';
import { PreOrder, PreOrderStatusEnums } from 'src/entities/pre_orders.entity';
import { Inbound } from 'src/entities/inbound.entity';
import { MoveToShippedDto } from './dto/production-batch.dto';
import { AuditEventService } from 'src/audit-log/audit-event.service';

@Injectable()
export class ProductionBatchesService {
  private readonly logger = new Logger(ProductionBatchesService.name);
  constructor(
    @InjectRepository(ProductionBatch)
    private productionBatchRepository: Repository<ProductionBatch>,
    @InjectRepository(PreOrder)
    private preOrderRepository: Repository<PreOrder>,

    @InjectRepository(Inbound)
    private inboundRepository: Repository<Inbound>,
    private auditEventService: AuditEventService,
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

    const savedInbound = await this.inboundRepository.save(inboundRecord);

    // Check if all quantities for this pre-order have been shipped
    await this.checkAndUpdatePreOrderStatus(productionBatch.preOrder.id);

    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };

      this.auditEventService.emitInboundCreated(
        requestContext,
        savedInbound,
        savedInbound.id,
      );
    }

    return savedInbound;
  }

  private async checkAndUpdatePreOrderStatus(
    preOrderId: string,
  ): Promise<void> {
    try {
      // Get pre-order total quantity
      const preOrder = await this.preOrderRepository.findOne({
        where: { id: preOrderId },
        select: ['quantity', 'status'],
      });

      if (!preOrder) {
        return; // Pre-order not found, nothing to update
      }

      // Get all production batch IDs for this pre-order
      const productionBatchResults: ProductionBatch[] =
        await this.productionBatchRepository
          .createQueryBuilder('pb')
          .select(['pb.id as id'])
          .where('pb.preOrderId = :preOrderId', { preOrderId })
          .getRawMany();

      const productionBatchIds = productionBatchResults.map(
        (batch) => batch.id,
      );

      // Get total quantity shipped for all production batches
      let totalShipped = 0;
      if (productionBatchIds.length > 0) {
        const shippedResult = await this.inboundRepository
          .createQueryBuilder('inbound')
          .select(
            'COALESCE(SUM(CONVERT(inbound.quantity, SIGNED)), 0)',
            'total',
          )
          .where('inbound.productionBatchId IN (:...batchIds)', {
            batchIds: productionBatchIds,
          })
          .getRawOne();

        totalShipped = parseInt(shippedResult?.total || '0');
      }

      // Check if all quantities have been shipped
      // Check against original pre-order quantity
      const isFullyShipped = totalShipped >= preOrder.quantity;

      // Update pre-order status to completed if fully shipped
      if (
        isFullyShipped &&
        preOrder.status !== PreOrderStatusEnums.Completed.toString()
      ) {
        await this.preOrderRepository.update(
          { id: preOrderId },
          { status: PreOrderStatusEnums.Completed },
        );
      }
    } catch (error) {
      // Log the error but don't throw to avoid breaking the main flow
      this.logger.error('Failed to update pre-order status:', error);
    }
  }
}
