import { Controller } from '@nestjs/common';
import { InventoryMovementsService } from './inventory_movements.service';

@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}
}
