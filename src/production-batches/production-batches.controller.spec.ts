import { Test, TestingModule } from '@nestjs/testing';
import { ProductionBatchesController } from './production-batches.controller';
import { ProductionBatchesService } from './production-batches.service';

describe('ProductionBatchesController', () => {
  let controller: ProductionBatchesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionBatchesController],
      providers: [ProductionBatchesService],
    }).compile();

    controller = module.get<ProductionBatchesController>(
      ProductionBatchesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
