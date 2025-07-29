import { Test, TestingModule } from '@nestjs/testing';
import { InventoryLocationService } from './inventory_location.service';

describe('InventoryLocationService', () => {
  let service: InventoryLocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryLocationService],
    }).compile();

    service = module.get<InventoryLocationService>(InventoryLocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
