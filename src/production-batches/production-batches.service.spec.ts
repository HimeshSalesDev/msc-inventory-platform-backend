import { Test, TestingModule } from '@nestjs/testing';
import { ProductionBatchesService } from './production-batches.service';

describe('ProductionBatchesService', () => {
  let service: ProductionBatchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductionBatchesService],
    }).compile();

    service = module.get<ProductionBatchesService>(ProductionBatchesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
