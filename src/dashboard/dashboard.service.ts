import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { Inbound } from 'src/entities/inbound.entity';
import { Inventory } from 'src/entities/inventory.entity';
import {
  InventoryMovement,
  InventoryMovementTypeEnums,
} from 'src/entities/inventory_movements.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(InventoryMovement)
    private readonly inventoryMovementRepo: Repository<InventoryMovement>,

    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,

    @InjectRepository(Inbound)
    private readonly inboundRepo: Repository<Inbound>,
  ) {}

  async getDashboardStats() {
    try {
      // Dates for today
      const todayStart = dayjs().startOf('day').toDate();
      const todayEnd = dayjs().endOf('day').toDate();

      // 1️⃣ Today's total inbound
      const { totalInboundToday } = await this.inventoryMovementRepo
        .createQueryBuilder('im')
        .select('COALESCE(SUM(im.quantity), 0)', 'totalInboundToday')
        .where('im.type = :type', { type: InventoryMovementTypeEnums.IN })
        .andWhere('im.createdAt BETWEEN :start AND :end', {
          start: todayStart,
          end: todayEnd,
        })
        .getRawOne();

      // 2️⃣ Today's total outbound
      const { totalOutboundToday } = await this.inventoryMovementRepo
        .createQueryBuilder('im')
        .select('COALESCE(SUM(im.quantity), 0)', 'totalOutboundToday')
        .where('im.type = :type', { type: InventoryMovementTypeEnums.OUT })
        .andWhere('im.createdAt BETWEEN :start AND :end', {
          start: todayStart,
          end: todayEnd,
        })
        .getRawOne();

      // 3️⃣ Total in-stock from inventory table
      const { totalInStock } = await this.inventoryRepo
        .createQueryBuilder('inv')
        .select('COALESCE(SUM(inv.quantity), 0)', 'totalInStock')
        .getRawOne();

      // Dates for current month
      const monthStart = dayjs().startOf('month').toDate();
      const monthEnd = dayjs().endOf('month').toDate();

      // 4️⃣ Total distinct containers this month
      const totalContainersThisMonth = await this.inboundRepo
        .createQueryBuilder('ib')
        .select('COUNT(DISTINCT ib.containerNumber)', 'count')
        .where('ib.eta BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        })
        .getRawOne();

      // 5️⃣ Total quantity in those containers this month
      const totalQuantityInContainers = await this.inboundRepo
        .createQueryBuilder('ib')
        .select('COALESCE(SUM(ib.quantity), 0)', 'totalQuantity')
        .where('ib.eta BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        })
        .getRawOne();

      return {
        success: true,
        data: {
          todayInbound: Number(totalInboundToday) || 0,
          todayOutbound: Number(totalOutboundToday) || 0,
          totalInStock: Number(totalInStock) || 0,
          totalContainersThisMonth: Number(totalContainersThisMonth.count) || 0,
          totalQuantityInContainersThisMonth:
            Number(totalQuantityInContainers.totalQuantity) || 0,
        },
      };
    } catch {
      throw new HttpException(
        'Failed to fetch inventory stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
