import { Test, TestingModule } from '@nestjs/testing';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';

describe('InboundController', () => {
  let controller: InboundController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InboundController],
      providers: [InboundService],
    }).compile();

    controller = module.get<InboundController>(InboundController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
