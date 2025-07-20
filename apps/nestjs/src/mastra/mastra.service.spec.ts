import { Test, TestingModule } from '@nestjs/testing';
import { MastraService } from './mastra.service';

describe('MastraService', () => {
  let service: MastraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MastraService],
    }).compile();

    service = module.get<MastraService>(MastraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
