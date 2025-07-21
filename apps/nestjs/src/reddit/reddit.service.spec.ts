import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

import { RedditService } from './reddit.service'

describe('RedditService', () => {
  let service: RedditService
  let httpService: HttpService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedditService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            axiosRef: { defaults: { headers: { common: {} } } },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDDIT_CLIENT_ID') return 'test_client_id'
              if (key === 'REDDIT_SECRET') return 'test_secret'
              return null
            }),
          },
        },
      ],
    }).compile()

    service = module.get<RedditService>(RedditService)
    httpService = module.get<HttpService>(HttpService)
  })

  it('应该被正确定义', () => {
    expect(service).toBeDefined()
  })
})
