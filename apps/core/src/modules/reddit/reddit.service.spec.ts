import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

import { RedditService } from './reddit.service'

describe('RedditService', () => {
  let service: RedditService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedditService,
        {
          provide: HttpService,
          useValue: {
            post: vi.fn(),
            get: vi.fn(),
            axiosRef: { defaults: { headers: { common: {} } } },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'REDDIT_CLIENT_ID') return 'test_client_id'
              if (key === 'REDDIT_SECRET') return 'test_secret'
              return null
            }),
          },
        },
      ],
    }).compile()

    service = module.get<RedditService>(RedditService)
  })

  it('应该被正确定义', () => {
    expect(service).toBeDefined()
  })
})
