import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  InventoryMovement,
  InventoryMovementTypeEnums,
} from 'src/entities/inventory_movements.entity';
import { Repository } from 'typeorm';

interface QuarterMonthRange {
  startMonth: number;
  endMonth: number;
}

type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

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

  async getInboundVsOutboundSummary(
    period: string,
    year?: string,
    quarter?: string,
  ) {
    // Validate period parameter
    if (!['monthly', 'yearly', 'quarterly'].includes(period)) {
      throw new BadRequestException(
        "Period must be either 'monthly', 'quarterly' or 'yearly'",
      );
    }

    // Validate quarter parameter when period is quarterly
    if (period === 'quarterly' && !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      throw new BadRequestException('Quarter must be one of Q1, Q2, Q3, Q4');
    }

    switch (period) {
      case 'yearly':
        return await this.getYearlyData(year);
      case 'quarterly':
        return await this.getQuarterlyData(year, quarter);
      case 'monthly':
        return await this.getMonthlyData(year);
      default:
        throw new BadRequestException('Invalid period specified');
    }
  }

  private async getYearlyData(targetYear?: string) {
    const currentYear = new Date().getFullYear();
    const endYear = targetYear ? parseInt(targetYear) : currentYear;
    const startYear = endYear - 4; // Get 5 years of data

    const results = await this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .select('movement.type', 'type')
      .addSelect('EXTRACT(YEAR FROM movement.createdAt)', 'year')
      .addSelect('SUM(movement.quantity)', 'totalQuantity')
      .where('movement.type IN (:...types)', {
        types: [InventoryMovementTypeEnums.IN, InventoryMovementTypeEnums.OUT],
      })
      .andWhere(
        'EXTRACT(YEAR FROM movement.createdAt) BETWEEN :startYear AND :endYear',
        {
          startYear,
          endYear,
        },
      )
      .groupBy('movement.type')
      .addGroupBy('EXTRACT(YEAR FROM movement.createdAt)')
      .orderBy('year', 'ASC')
      .getRawMany();

    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i,
    );
    const inboundData: number[] = new Array(years.length).fill(0);
    const outboundData: number[] = new Array(years.length).fill(0);

    results.forEach((item) => {
      const yearIndex = years.indexOf(parseInt(item.year));
      if (yearIndex !== -1) {
        const quantity = Number(item.totalQuantity);
        if (item.type === InventoryMovementTypeEnums.IN) {
          inboundData[yearIndex] = quantity;
        } else if (item.type === InventoryMovementTypeEnums.OUT) {
          outboundData[yearIndex] = quantity;
        }
      }
    });

    return {
      success: true,
      data: {
        series: [
          { name: 'Stock In', data: inboundData },
          { name: 'Stock Out', data: outboundData },
        ],
        categories: years.map((y) => y.toString()),
        summary: {
          totalInbound: inboundData.reduce((sum, val) => sum + val, 0),
          totalOutbound: outboundData.reduce((sum, val) => sum + val, 0),
          netMovement:
            inboundData.reduce((sum, val) => sum + val, 0) -
            outboundData.reduce((sum, val) => sum + val, 0),
        },
      },
      period: 'yearly',
      year: targetYear || currentYear.toString(),
    };
  }

  private async getQuarterlyData(targetYear?: string, targetQuarter?: string) {
    const currentYear = targetYear
      ? parseInt(targetYear)
      : new Date().getFullYear();

    // If no specific quarter is provided, return all quarters data
    if (!targetQuarter) {
      return await this.getAllQuartersData(currentYear);
    }

    // Get the 3 months for the specific quarter
    const quarterMonths = this.getQuarterMonths(targetQuarter);
    const startMonth = quarterMonths.startMonth;
    const endMonth = quarterMonths.endMonth;

    const startDate = new Date(currentYear, startMonth, 1);
    const endDate = new Date(currentYear, endMonth + 1, 0, 23, 59, 59); // Last day of end month

    const results = await this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .select('movement.type', 'type')
      .addSelect('EXTRACT(MONTH FROM movement.createdAt)', 'month')
      .addSelect('SUM(movement.quantity)', 'totalQuantity')
      .where('movement.type IN (:...types)', {
        types: [InventoryMovementTypeEnums.IN, InventoryMovementTypeEnums.OUT],
      })
      .andWhere('movement.createdAt >= :startDate', {
        startDate: startDate.toISOString(),
      })
      .andWhere('movement.createdAt <= :endDate', {
        endDate: endDate.toISOString(),
      })
      .groupBy('movement.type')
      .addGroupBy('EXTRACT(MONTH FROM movement.createdAt)')
      .orderBy('month', 'ASC')
      .getRawMany();

    const monthNames = this.getMonthNamesForQuarter(targetQuarter);
    const inboundData: number[] = new Array(3).fill(0);
    const outboundData: number[] = new Array(3).fill(0);

    results.forEach((item) => {
      const monthIndex = parseInt(item.month) - startMonth - 1; // Convert to quarter-relative index
      if (monthIndex >= 0 && monthIndex < 3) {
        const quantity = Number(item.totalQuantity);

        if (item.type === InventoryMovementTypeEnums.IN) {
          inboundData[monthIndex] = quantity;
        } else if (item.type === InventoryMovementTypeEnums.OUT) {
          outboundData[monthIndex] = quantity;
        }
      }
    });

    return {
      success: true,
      data: {
        series: [
          { name: 'Stock In', data: inboundData },
          { name: 'Stock Out', data: outboundData },
        ],
        categories: monthNames,
        summary: {
          totalInbound: inboundData.reduce((sum, val) => sum + val, 0),
          totalOutbound: outboundData.reduce((sum, val) => sum + val, 0),
          netMovement:
            inboundData.reduce((sum, val) => sum + val, 0) -
            outboundData.reduce((sum, val) => sum + val, 0),
        },
      },
      period: 'quarterly',
      year: currentYear.toString(),
      quarter: targetQuarter,
    };
  }

  private async getAllQuartersData(currentYear: number) {
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

    const results = await this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .select('movement.type', 'type')
      .addSelect('EXTRACT(QUARTER FROM movement.createdAt)', 'quarter')
      .addSelect('SUM(movement.quantity)', 'totalQuantity')
      .where('movement.type IN (:...types)', {
        types: [InventoryMovementTypeEnums.IN, InventoryMovementTypeEnums.OUT],
      })
      .andWhere('movement.createdAt >= :startDate', {
        startDate: startDate.toISOString(),
      })
      .andWhere('movement.createdAt <= :endDate', {
        endDate: endDate.toISOString(),
      })
      .groupBy('movement.type')
      .addGroupBy('EXTRACT(QUARTER FROM movement.createdAt)')
      .orderBy('quarter', 'ASC')
      .getRawMany();

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const inboundData: number[] = new Array(4).fill(0);
    const outboundData: number[] = new Array(4).fill(0);

    results.forEach((item) => {
      const quarterIndex = parseInt(item.quarter) - 1;
      const quantity = Number(item.totalQuantity);

      if (item.type === InventoryMovementTypeEnums.IN) {
        inboundData[quarterIndex] = quantity;
      } else if (item.type === InventoryMovementTypeEnums.OUT) {
        outboundData[quarterIndex] = quantity;
      }
    });

    return {
      success: true,
      data: {
        series: [
          { name: 'Stock In', data: inboundData },
          { name: 'Stock Out', data: outboundData },
        ],
        categories: quarters,
        summary: {
          totalInbound: inboundData.reduce((sum, val) => sum + val, 0),
          totalOutbound: outboundData.reduce((sum, val) => sum + val, 0),
          netMovement:
            inboundData.reduce((sum, val) => sum + val, 0) -
            outboundData.reduce((sum, val) => sum + val, 0),
        },
      },
      period: 'quarterly',
      year: currentYear.toString(),
    };
  }

  private getQuarterMonths(quarter: string): QuarterMonthRange {
    const quarterMap: Record<QuarterKey, QuarterMonthRange> = {
      Q1: { startMonth: 0, endMonth: 2 }, // Jan-Mar (0-2)
      Q2: { startMonth: 3, endMonth: 5 }, // Apr-Jun (3-5)
      Q3: { startMonth: 6, endMonth: 8 }, // Jul-Sep (6-8)
      Q4: { startMonth: 9, endMonth: 11 }, // Oct-Dec (9-11)
    };

    // Type guard to ensure quarter is a valid QuarterKey
    if (!this.isValidQuarter(quarter)) {
      throw new BadRequestException(
        `Invalid quarter: ${quarter}. Must be one of Q1, Q2, Q3, Q4`,
      );
    }

    return quarterMap[quarter];
  }

  private getMonthNamesForQuarter(quarter: string): string[] {
    const quarterMonths: Record<QuarterKey, string[]> = {
      Q1: ['Jan', 'Feb', 'Mar'],
      Q2: ['Apr', 'May', 'Jun'],
      Q3: ['Jul', 'Aug', 'Sep'],
      Q4: ['Oct', 'Nov', 'Dec'],
    };

    // Type guard to ensure quarter is a valid QuarterKey
    if (!this.isValidQuarter(quarter)) {
      throw new BadRequestException(
        `Invalid quarter: ${quarter}. Must be one of Q1, Q2, Q3, Q4`,
      );
    }

    return quarterMonths[quarter];
  }

  private isValidQuarter(quarter: string): quarter is QuarterKey {
    return ['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter);
  }

  private async getMonthlyData(targetYear?: string) {
    const currentYear = targetYear
      ? parseInt(targetYear)
      : new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

    const results = await this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .select('movement.type', 'type')
      .addSelect('EXTRACT(MONTH FROM movement.createdAt)', 'month')
      .addSelect('SUM(movement.quantity)', 'totalQuantity')
      .where('movement.type IN (:...types)', {
        types: [InventoryMovementTypeEnums.IN, InventoryMovementTypeEnums.OUT],
      })
      .andWhere('movement.createdAt >= :startDate', {
        startDate: startDate.toISOString(),
      })
      .andWhere('movement.createdAt <= :endDate', {
        endDate: endDate.toISOString(),
      })
      .groupBy('movement.type')
      .addGroupBy('EXTRACT(MONTH FROM movement.createdAt)')
      .orderBy('month', 'ASC')
      .getRawMany();

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const inboundData: number[] = new Array(12).fill(0);
    const outboundData: number[] = new Array(12).fill(0);

    results.forEach((item) => {
      const monthIndex = parseInt(item.month) - 1; // Convert to 0-based index
      const quantity = Number(item.totalQuantity);

      if (item.type === InventoryMovementTypeEnums.IN) {
        inboundData[monthIndex] = quantity;
      } else if (item.type === InventoryMovementTypeEnums.OUT) {
        outboundData[monthIndex] = quantity;
      }
    });

    return {
      success: true,
      data: {
        series: [
          { name: 'Stock In', data: inboundData },
          { name: 'Stock Out', data: outboundData },
        ],
        categories: months,
        summary: {
          totalInbound: inboundData.reduce((sum, val) => sum + val, 0),
          totalOutbound: outboundData.reduce((sum, val) => sum + val, 0),
          netMovement:
            inboundData.reduce((sum, val) => sum + val, 0) -
            outboundData.reduce((sum, val) => sum + val, 0),
        },
      },
      period: 'monthly',
      year: currentYear.toString(),
    };
  }
}
