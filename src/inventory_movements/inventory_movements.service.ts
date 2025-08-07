import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  InventoryMovement,
  InventoryMovementTypeEnums,
} from 'src/entities/inventory_movements.entity';
import { Repository } from 'typeorm';

@Injectable()
export class InventoryMovementsService {
  constructor(
    @InjectRepository(InventoryMovement)
    private inventoryMovementRepository: Repository<InventoryMovement>,
  ) {}

  async findTopOutboundMovements(
    startDate?: string,
    endDate?: string,
  ): Promise<
    {
      sku: string;
      totalQuantity: number;
    }[]
  > {
    const query = this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .select('movement.sku', 'sku')
      .addSelect('SUM(movement.quantity)', 'totalQuantity')
      .where('movement.type = :type', { type: InventoryMovementTypeEnums.OUT });

    if (startDate) {
      query.andWhere('movement.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('movement.createdAt <= :endDate', { endDate });
    }

    query.groupBy('movement.sku').orderBy('totalQuantity', 'DESC').limit(10);

    const results = await query.getRawMany();

    // Map string "totalQuantity" to number
    return results.map((item) => ({
      sku: item.sku,
      totalQuantity: Number(item.totalQuantity),
    }));
  }
}
