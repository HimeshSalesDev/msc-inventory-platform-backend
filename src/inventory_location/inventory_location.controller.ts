import { Controller } from '@nestjs/common';
import { InventoryLocationService } from './inventory_location.service';

@Controller('inventory-location')
export class InventoryLocationController {
  constructor(private readonly inventoryLocationService: InventoryLocationService) {}
}
