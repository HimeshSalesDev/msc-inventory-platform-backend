import { Test, TestingModule } from '@nestjs/testing';
import { InventoryLocationController } from './inventory_location.controller';
import { InventoryLocationService } from './inventory_location.service';

describe('InventoryLocationController', () => {
  let controller: InventoryLocationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryLocationController],
      providers: [InventoryLocationService],
    }).compile();

    controller = module.get<InventoryLocationController>(InventoryLocationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
