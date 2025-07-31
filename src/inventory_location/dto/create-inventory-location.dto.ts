import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsNumberString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateInventoryLocationDto {
  @ApiProperty({
    description: 'Stock Keeping Unit - unique identifier for the product',
    example: 'SKU-001',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  @Length(1, 255, { message: 'SKU must be between 1 and 255 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  sku: string;

  @ApiProperty({
    description: 'Bin number where the inventory is stored',
    example: 'BIN-A001',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty({ message: 'Bin number is required' })
  // @Length(1, 10, { message: 'Bin number must be between 1 and 10 characters' })
  // @Matches(/^[A-Za-z0-9\-_]+$/, {
  //   message:
  //     'Bin number can only contain alphanumeric characters, hyphens, and underscores',
  // })
  @Transform(({ value }: { value: string }) => value?.trim())
  binNumber: string;

  @ApiProperty({
    description: 'Physical location or warehouse section',
    example: 'Warehouse-A, Section-1, Row-5',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  @Length(1, 200, { message: 'Location must be between 1 and 200 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  location: string;

  @ApiProperty({
    description: 'Quantity to add/update in this location',
    example: '150000',
    minimum: 0,
  })
  @IsNumberString({}, { message: 'Quantity must be a valid number' })
  @Transform(({ value }: { value: string | number }) => {
    const val = typeof value === 'number' ? value.toString() : value;
    const num = BigInt(val);
    if (num < 0n) {
      throw new Error('Quantity must be a non-negative number');
    }
    return val;
  })
  @ApiProperty({
    description: 'Quantity to add/update in this location',
    example: '150000',
    minimum: 0,
    type: String,
  })
  quantity: string;
}
