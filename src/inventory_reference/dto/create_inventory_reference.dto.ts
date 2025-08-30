import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateInventoryReferenceDto {
  @ApiProperty({
    description: 'Type',
    example: 'PRO',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  type: string;

  @ApiProperty({
    description: 'Stock Keeping Unit - unique identifier for the product',
    example: 'SKU-001',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  sku: string;

  @ApiProperty({
    description: 'Pro Number',
    example: '001',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  number: string;

  @ApiProperty({
    description: 'Add Ons',
    example: 'Heavy-duty lifter plate with reinforced steel',
  })
  @IsString()
  @Optional()
  addOn: string;
}
