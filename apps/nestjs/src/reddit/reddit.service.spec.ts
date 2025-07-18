import { Test, TestingModule } from '@nestjs/testing'
import { RedditService, CommentNode } from './reddit.service'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { of } from 'rxjs'
import { AxiosResponse } from 'axios'
import {
  RedditCommentInfoUntrusted,
  RedditCommentWrapper,
  RedditListingResponse,
} from '@redgent/types/reddit'

describe('RedditService', () => {
  let service: RedditService
  let httpService: HttpService
  let configService: ConfigService

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
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getRedditToken', () => {
    it('should return an access token', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          access_token: 'mock_token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: '*',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      }
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse))

      const token = await service.getRedditToken()
      expect(token).toBe('mock_token')
    })
  })

  describe('extractCommentNodes', () => {
    it('should extract comment bodies and authors from a flat list of comments', () => {
      const comments: RedditCommentInfoUntrusted[] = [
        {
          author: 'user1',
          body: 'This is comment 1',
          replies: '',
        } as RedditCommentInfoUntrusted,
        {
          author: 'user2',
          body: 'This is comment 2',
          replies: '',
        } as RedditCommentInfoUntrusted,
      ]

      const result = service.extractCommentNodes(comments)

      expect(result).toEqual([
        { author: 'user1', body: 'This is comment 1' },
        { author: 'user2', body: 'This is comment 2' },
      ])
    })

    it('should extract comment bodies and authors with nested replies', () => {
      const comments: RedditCommentInfoUntrusted[] = [
        {
          author: 'user1',
          body: 'Parent comment 1',
          replies: {
            kind: 'Listing',
            data: {
              children: [
                {
                  kind: 't1',
                  data: {
                    author: 'user1_1',
                    body: 'Child comment 1.1',
                    replies: '',
                  } as RedditCommentInfoUntrusted,
                } as RedditCommentWrapper,
                {
                  kind: 't1',
                  data: {
                    author: 'user1_2',
                    body: 'Child comment 1.2',
                    replies: {
                      kind: 'Listing',
                      data: {
                        children: [
                          {
                            kind: 't1',
                            data: {
                              author: 'user1_2_1',
                              body: 'Grandchild comment 1.2.1',
                              replies: '',
                            } as RedditCommentInfoUntrusted,
                          } as RedditCommentWrapper,
                        ],
                      },
                    },
                  } as RedditCommentInfoUntrusted,
                } as RedditCommentWrapper,
              ],
            },
          } as RedditListingResponse<RedditCommentWrapper>,
        } as RedditCommentInfoUntrusted,
        {
          author: 'user2',
          body: 'Parent comment 2',
          replies: '',
        } as RedditCommentInfoUntrusted,
      ]

      const result = service.extractCommentNodes(comments)

      expect(result).toEqual([
        {
          author: 'user1',
          body: 'Parent comment 1',
          replies: [
            { author: 'user1_1', body: 'Child comment 1.1' },
            {
              author: 'user1_2',
              body: 'Child comment 1.2',
              replies: [
                { author: 'user1_2_1', body: 'Grandchild comment 1.2.1' },
              ],
            },
          ],
        },
        { author: 'user2', body: 'Parent comment 2' },
      ])
    })
  })
})
