import { Test, TestingModule } from '@nestjs/testing';
import { RedditController } from './reddit.controller';
import { RedditService } from './reddit.service';

describe('RedditController', () => {
  let controller: RedditController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedditController],
      providers: [
        {
          provide: RedditService,
          useValue: {
            getHotPosts: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RedditController>(RedditController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
