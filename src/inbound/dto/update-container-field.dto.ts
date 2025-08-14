import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class UpdateContainerFieldDto {
  @ApiProperty({
    description: 'Container number to update',
    example: 'CONT1234567',
  })
  @IsNotEmpty()
  @IsString()
  containerNumber: string;

  @ApiProperty({
    description: 'Estimated Time of Departure (YYYY-MM-DD)',
    example: '2025-08-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  etd?: string;

  @ApiProperty({
    description: 'Estimated Time of Arrival (YYYY-MM-DD)',
    example: '2025-08-20',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  eta?: string;

  @ApiProperty({
    description: 'Shipped Yes or No',
    example: 'Yes',
    required: false,
  })
  @IsOptional()
  @IsString()
  shipped?: string;

  @ApiProperty({
    description: 'Offloaded Date (YYYY-MM-DD)',
    example: '2025-08-25',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  offloadedDate?: string;
}
