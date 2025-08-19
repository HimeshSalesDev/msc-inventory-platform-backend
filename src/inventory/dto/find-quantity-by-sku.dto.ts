import { ApiProperty } from '@nestjs/swagger';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Inbound } from 'src/entities/inbound.entity';
import { Inventory } from 'src/entities/inventory.entity';

// Custom validator function
function IsStringOrStringArray(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStringOrStringArray',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value === 'string' && value.length > 0) {
            return true;
          }
          if (Array.isArray(value) && value.length > 0) {
            return value.every(
              (item) => typeof item === 'string' && item.length > 0,
            );
          }
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return 'sku must be a non-empty string or an array of non-empty strings';
        },
      },
    });
  };
}

export class FindQuantityBySkuDto {
  @ApiProperty({
    description: 'A single SKU or an array of SKUs',
    example: ['SKU-001', 'SKU-002'], // or just 'SKU-001'
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  @IsStringOrStringArray()
  sku: string | string[];
}

export class FindQuantityResponseDto {
  @ApiProperty({ type: [Inventory] })
  inventory: Inventory[];

  @ApiProperty({ type: [Inbound] })
  inbound: Inbound[];
}
