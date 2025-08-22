import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class MoveToShippedDto {
  @ApiProperty({
    description: 'Quantity of items to move to production',
    example: 10,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number) // transforms "10" -> 10
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @ApiProperty({
    description: 'Container number where items are stored',
    example: '1515151515',
  })
  @IsString()
  @IsNotEmpty({ message: 'Container number is required' })
  containerNumber: string;

  @ApiProperty({
    description: 'Estimated time of arrival (ETA)',
    example: '2025-08-22',
    required: false,
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  eta?: string | null;

  @ApiProperty({
    description: 'Purchase order number',
    example: 'PO-12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  poNumber?: string | null;
}
