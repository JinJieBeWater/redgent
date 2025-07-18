import { Test, TestingModule } from '@nestjs/testing'
import { RedditService } from './reddit.service'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { of } from 'rxjs'

describe('RedditService', () => {
  const axiosResponse = {
    status: 200,
    statusText: 'OK',
    headers: {},
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    config: { headers: {} as any },
  }

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

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getRedditToken', () => {
    it('should return an access token', async () => {
      const mockTokenResponse = { access_token: 'new_mock_token' }
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: mockTokenResponse,
          ...axiosResponse,
        }),
      )

      const token = await service.getRedditToken()
      expect(token).toEqual('new_mock_token')
    })
  })

  describe('getHotLinksBySubreddit', () => {
    it('should return hot links for a given subreddit', async () => {
      const subreddit = 'nestjs'
      const mockLinksResponse = {
        data: { children: [{ data: { title: 'Link 1' } }] },
      }
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: mockLinksResponse,
          ...axiosResponse,
        }),
      )

      const result = await service.getHotLinksBySubreddit(subreddit)

      expect(result).toEqual(mockLinksResponse.data)
    })
  })

  describe('getHotLinksByQueriesAndSubreddits', () => {
    it('should return links sorted by score in descending order', async () => {
      const mockQueryResponse = {
        data: {
          children: [
            { data: { id: '1', title: 'Query Link 1', score: 100 } },
            { data: { id: '2', title: 'Query Link 2', score: 50 } },
          ],
        },
      }

      const mockSubredditResponse = {
        data: {
          children: [
            { data: { id: '3', title: 'Subreddit Link 1', score: 200 } },
            { data: { id: '4', title: 'Subreddit Link 2', score: 75 } },
          ],
        },
      }

      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ data: mockQueryResponse, ...axiosResponse }))
        .mockReturnValueOnce(
          of({ data: mockSubredditResponse, ...axiosResponse }),
        )

      const result = await service.getHotLinksByQueriesAndSubreddits(
        ['test-query'],
        ['test-subreddit'],
      )

      expect(result).toHaveLength(4)
      expect(result[0].score).toBe(200) // Highest score first
      expect(result[1].score).toBe(100)
      expect(result[2].score).toBe(75)
      expect(result[3].score).toBe(50) // Lowest score last
    })

    it('should deduplicate links by id', async () => {
      const mockResponse1 = {
        data: {
          children: [
            { data: { id: '1', title: 'Duplicate Link', score: 100 } },
            { data: { id: '2', title: 'Unique Link 1', score: 50 } },
          ],
        },
      }

      const mockResponse2 = {
        data: {
          children: [
            { data: { id: '1', title: 'Duplicate Link', score: 100 } }, // Same ID
            { data: { id: '3', title: 'Unique Link 2', score: 75 } },
          ],
        },
      }

      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ data: mockResponse1, ...axiosResponse }))
        .mockReturnValueOnce(of({ data: mockResponse2, ...axiosResponse }))

      const result = await service.getHotLinksByQueriesAndSubreddits(
        ['test-query'],
        ['test-subreddit'],
      )

      expect(result).toHaveLength(3) // Should deduplicate the link with id '1'
      const ids = result.map((link) => link.id)
      expect(ids).toEqual(['1', '3', '2']) // Sorted by score: 100, 75, 50
    })

    it('should handle empty queries and subreddits', async () => {
      const result = await service.getHotLinksByQueriesAndSubreddits([], [])
      expect(result).toEqual([])
    })

    it('should handle partial failures gracefully', async () => {
      const mockSuccessfulResponse = {
        data: {
          children: [
            { data: { id: '1', title: 'Successful Link', score: 100 } },
          ],
        },
      }

      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(
          of({ data: mockSuccessfulResponse, ...axiosResponse }),
        )
        .mockImplementationOnce(() => {
          throw new Error('测试预期 Network error')
        })

      const result = await service.getHotLinksByQueriesAndSubreddits(
        ['test-query'],
        ['failing-subreddit'],
      )

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })
  })
})
