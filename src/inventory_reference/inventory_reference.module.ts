import { Module } from '@nestjs/common';
import { InventoryReferenceService } from './inventory_reference.service';
import { InventoryReferenceController } from './inventory_reference.controller';

@Module({
  controllers: [InventoryReferenceController],
  providers: [InventoryReferenceService],
})
export class InventoryReferenceModule {}
