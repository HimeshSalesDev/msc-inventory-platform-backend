import { Module } from '@nestjs/common';
import { InventoryMovementsService } from './inventory_movements.service';
import { InventoryMovementsController } from './inventory_movements.controller';

@Module({
  controllers: [InventoryMovementsController],
  providers: [InventoryMovementsService],
})
export class InventoryMovementsModule {}
