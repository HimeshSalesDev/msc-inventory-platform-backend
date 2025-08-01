import { Test, TestingModule } from '@nestjs/testing';
import { InventoryReferenceController } from './inventory_reference.controller';
import { InventoryReferenceService } from './inventory_reference.service';

describe('InventoryReferenceController', () => {
  let controller: InventoryReferenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryReferenceController],
      providers: [InventoryReferenceService],
    }).compile();

    controller = module.get<InventoryReferenceController>(InventoryReferenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
