import { Module } from '@nestjs/common';
import { InventoryLocationService } from './inventory_location.service';
import { InventoryLocationController } from './inventory_location.controller';

@Module({
  controllers: [InventoryLocationController],
  providers: [InventoryLocationService],
})
export class InventoryLocationModule {}
