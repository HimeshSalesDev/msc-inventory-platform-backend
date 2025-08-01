import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetLocationByNumberOrSkuDto {
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  skuOrNumber: string;
}
