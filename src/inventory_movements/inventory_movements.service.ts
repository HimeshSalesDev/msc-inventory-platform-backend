import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs, { Dayjs } from 'dayjs';
import {
  InventoryMovement,
  InventoryMovementTypeEnums,
} from 'src/entities/inventory_movements.entity';
import { Repository } from 'typeorm';

interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

interface InboundOutboundSummaryParams extends DateRangeParams {
  period: string;
  year?: string;
  quarter?: string;
}

interface ChartDataPoint {
  name: string;
  data: number[];
}

interface SummaryData {
  totalInbound: number;
  totalOutbound: number;
  netMovement: number;
}

export interface ChartResponse {
  success: boolean;
  data: {
    series: ChartDataPoint[];
    categories: string[];
    summary: SummaryData;
  };
  period: string;
  year?: string;
  quarter?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface QuarterMonthRange {
  startMonth: number;
  endMonth: number;
}

@Injectable()
export class InventoryMovementsService {
  private readonly VALID_PERIODS = ['monthly', 'yearly', 'quarterly', 'custom'];
  private readonly VALID_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
  private readonly MONTH_NAMES = [
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
    params: InboundOutboundSummaryParams,
  ): Promise<ChartResponse> {
    this.validateParams(params);

    switch (params.period) {
      case 'yearly':
        return await this.getYearlyData(params.year);
      case 'quarterly':
        return await this.getQuarterlyData(params.year, params.quarter);
      case 'monthly':
        return await this.getMonthlyData(params.year);
      case 'custom':
        return await this.getCustomDateRangeData(
          params.startDate,
          params.endDate,
        );
      default:
        throw new BadRequestException('Invalid period specified');
    }
  }

  private validateParams(params: InboundOutboundSummaryParams): void {
    // Validate period parameter
    if (!this.VALID_PERIODS.includes(params.period)) {
      throw new BadRequestException(
        `Period must be one of: ${this.VALID_PERIODS.join(', ')}`,
      );
    }

    // Validate quarter parameter when period is quarterly
    if (
      params.period === 'quarterly' &&
      params.quarter &&
      !this.VALID_QUARTERS.includes(params.quarter)
    ) {
      throw new BadRequestException(
        `Quarter must be one of: ${this.VALID_QUARTERS.join(', ')}`,
      );
    }

    // Validate custom date range parameters
    if (params.period === 'custom') {
      if (!params.startDate || !params.endDate) {
        throw new BadRequestException(
          'Start date and end date are required for custom period',
        );
      }

      const startDate = dayjs(params.startDate);
      const endDate = dayjs(params.endDate);

      if (!startDate.isValid() || !endDate.isValid()) {
        throw new BadRequestException(
          'Invalid date format. Use YYYY-MM-DD format',
        );
      }

      if (startDate.isAfter(endDate)) {
        throw new BadRequestException(
          'Start date must be before or equal to end date',
        );
      }

      // Fix: Use positive difference calculation
      const daysDifference = endDate.diff(startDate, 'day');
      if (daysDifference > 365) {
        throw new BadRequestException('Date range cannot exceed 1 year');
      }
    }
  }

  private async getCustomDateRangeData(
    startDateStr: string,
    endDateStr: string,
  ): Promise<ChartResponse> {
    const startDate = dayjs(startDateStr).startOf('day');
    const endDate = dayjs(endDateStr).endOf('day');

    // Fix: Use positive difference calculation
    const daysDifference = endDate.diff(startDate, 'day');
    const monthsDifference = endDate.diff(startDate, 'month');

    // Determine grouping strategy based on date range
    if (daysDifference <= 31) {
      // Daily grouping for ranges up to 1 month
      return await this.getCustomDailyData(startDate, endDate);
    } else if (monthsDifference <= 12) {
      // Monthly grouping for ranges up to 1 years
      return await this.getCustomMonthlyData(startDate, endDate);
    } else {
      // Quarterly grouping for longer ranges
      return await this.getCustomQuarterlyData(startDate, endDate);
    }
  }

  private async getCustomDailyData(
    startDate: Dayjs,
    endDate: Dayjs,
  ): Promise<ChartResponse> {
    const results = await this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .select('movement.type', 'type')
      .addSelect('DATE(movement.createdAt)', 'date')
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
      .addGroupBy('DATE(movement.createdAt)')
      .orderBy('DATE(movement.createdAt)', 'ASC')
      .getRawMany();

    const categories: string[] = [];
    let currentDate = dayjs(startDate);

    while (
      currentDate.isBefore(endDate) ||
      currentDate.isSame(endDate, 'day')
    ) {
      categories.push(currentDate.format('MMM DD'));
      currentDate = currentDate.add(1, 'day'); // reassign
    }

    const { inboundData, outboundData } = this.processResults(
      results,
      categories,
      (item) => {
        const itemDate = dayjs(item.date).format('MMM DD');
        return categories.indexOf(itemDate);
      },
    );

    return this.buildResponse(
      inboundData,
      outboundData,
      categories,
      'custom',
      undefined,
      undefined,
      {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
      },
    );
  }

  private async getCustomMonthlyData(
    startDate: Dayjs,
    endDate: Dayjs,
  ): Promise<ChartResponse> {
    const results = await this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .select('movement.type', 'type')
      .addSelect('EXTRACT(YEAR FROM movement.createdAt)', 'year')
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
      .addGroupBy('EXTRACT(YEAR FROM movement.createdAt)')
      .addGroupBy('EXTRACT(MONTH FROM movement.createdAt)')
      .orderBy('year', 'ASC')
      .addOrderBy('month', 'ASC')
      .getRawMany();

    const categories: string[] = [];
    let currentDate = dayjs(startDate).startOf('month');
    const endMonth = dayjs(endDate).startOf('month');

    while (
      currentDate.isBefore(endMonth) ||
      currentDate.isSame(endMonth, 'month')
    ) {
      categories.push(currentDate.format('MMM YYYY'));
      currentDate = currentDate.add(1, 'month');
    }

    const { inboundData, outboundData } = this.processResults(
      results,
      categories,
      (item) => {
        const itemDate = dayjs()
          .year(parseInt(item.year))
          .month(parseInt(item.month) - 1)
          .format('MMM YYYY');
        return categories.indexOf(itemDate);
      },
    );

    return this.buildResponse(
      inboundData,
      outboundData,
      categories,
      'custom',
      undefined,
      undefined,
      {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
      },
    );
  }

  private async getCustomQuarterlyData(
    startDate: Dayjs,
    endDate: Dayjs,
  ): Promise<ChartResponse> {
    const results = await this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .select('movement.type', 'type')
      .addSelect('EXTRACT(YEAR FROM movement.createdAt)', 'year')
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
      .addGroupBy('EXTRACT(YEAR FROM movement.createdAt)')
      .addGroupBy('EXTRACT(QUARTER FROM movement.createdAt)')
      .orderBy('year', 'ASC')
      .addOrderBy('quarter', 'ASC')
      .getRawMany();

    const categories: string[] = [];
    const startYear = startDate.year();
    const endYear = endDate.year();
    const startQuarter = Math.ceil((startDate.month() + 1) / 3);
    const endQuarter = Math.ceil((endDate.month() + 1) / 3);

    for (let year = startYear; year <= endYear; year++) {
      const firstQ = year === startYear ? startQuarter : 1;
      const lastQ = year === endYear ? endQuarter : 4;

      for (let q = firstQ; q <= lastQ; q++) {
        categories.push(`Q${q} ${year}`);
      }
    }

    const { inboundData, outboundData } = this.processResults(
      results,
      categories,
      (item) => {
        const itemLabel = `Q${item.quarter} ${item.year}`;
        return categories.indexOf(itemLabel);
      },
    );

    return this.buildResponse(
      inboundData,
      outboundData,
      categories,
      'custom',
      undefined,
      undefined,
      {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
      },
    );
  }

  private processResults(
    results: any[],
    categories: string[],
    indexFinder: (item: any) => number,
  ): { inboundData: number[]; outboundData: number[] } {
    const inboundData: number[] = new Array(categories.length).fill(0);
    const outboundData: number[] = new Array(categories.length).fill(0);

    results.forEach((item) => {
      const index = indexFinder(item);
      if (index !== -1) {
        const quantity = Number(item.totalQuantity);
        if (item.type === InventoryMovementTypeEnums.IN) {
          inboundData[index] = quantity;
        } else if (item.type === InventoryMovementTypeEnums.OUT) {
          outboundData[index] = quantity;
        }
      }
    });

    return { inboundData, outboundData };
  }

  private buildResponse(
    inboundData: number[],
    outboundData: number[],
    categories: string[],
    period: string,
    year?: string,
    quarter?: string,
    dateRange?: { startDate: string; endDate: string },
  ): ChartResponse {
    const summary = this.calculateSummary(inboundData, outboundData);

    const response: ChartResponse = {
      success: true,
      data: {
        series: [
          { name: 'Stock In', data: inboundData },
          { name: 'Stock Out', data: outboundData },
        ],
        categories,
        summary,
      },
      period,
    };

    if (year) response.year = year;
    if (quarter) response.quarter = quarter;
    if (dateRange) response.dateRange = dateRange;

    return response;
  }

  private calculateSummary(
    inboundData: number[],
    outboundData: number[],
  ): SummaryData {
    const totalInbound = inboundData.reduce((sum, val) => sum + val, 0);
    const totalOutbound = outboundData.reduce((sum, val) => sum + val, 0);

    return {
      totalInbound,
      totalOutbound,
      netMovement: totalInbound - totalOutbound,
    };
  }

  private async getYearlyData(targetYear?: string): Promise<ChartResponse> {
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

    const categories = Array.from({ length: endYear - startYear + 1 }, (_, i) =>
      (startYear + i).toString(),
    );

    const { inboundData, outboundData } = this.processResults(
      results,
      categories,
      (item) => {
        return categories.indexOf(String(item.year));
      },
    );

    return this.buildResponse(
      inboundData,
      outboundData,
      categories,
      'yearly',
      targetYear || currentYear.toString(),
    );
  }

  private async getQuarterlyData(
    targetYear?: string,
    targetQuarter?: string,
  ): Promise<ChartResponse> {
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

    const { inboundData, outboundData } = this.processResults(
      results,
      monthNames,
      (item) => {
        return parseInt(item.month) - startMonth - 1;
      },
    );

    return this.buildResponse(
      inboundData,
      outboundData,
      monthNames,
      'quarterly',
      currentYear.toString(),
      targetQuarter,
    );
  }

  private async getAllQuartersData(
    currentYear: number,
  ): Promise<ChartResponse> {
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

    const { inboundData, outboundData } = this.processResults(
      results,
      quarters,
      (item) => {
        return parseInt(item.quarter) - 1;
      },
    );

    return this.buildResponse(
      inboundData,
      outboundData,
      quarters,
      'quarterly',
      currentYear.toString(),
    );
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

  private async getMonthlyData(targetYear?: string): Promise<ChartResponse> {
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

    const { inboundData, outboundData } = this.processResults(
      results,
      this.MONTH_NAMES,
      (item) => {
        return parseInt(item.month) - 1; // Convert to 0-based index
      },
    );

    return this.buildResponse(
      inboundData,
      outboundData,
      this.MONTH_NAMES,
      'monthly',
      currentYear.toString(),
    );
  }
}
