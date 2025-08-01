import { Test, TestingModule } from '@nestjs/testing';
import { InventoryReferenceService } from './inventory_reference.service';

describe('InventoryReferenceService', () => {
  let service: InventoryReferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryReferenceService],
    }).compile();

    service = module.get<InventoryReferenceService>(InventoryReferenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
