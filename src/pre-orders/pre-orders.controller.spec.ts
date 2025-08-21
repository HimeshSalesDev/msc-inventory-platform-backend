import { Test, TestingModule } from '@nestjs/testing';
import { PreOrdersController } from './pre-orders.controller';
import { PreOrdersService } from './pre-orders.service';

describe('PreOrdersController', () => {
  let controller: PreOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreOrdersController],
      providers: [PreOrdersService],
    }).compile();

    controller = module.get<PreOrdersController>(PreOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
