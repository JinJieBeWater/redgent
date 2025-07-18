import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { RedditService } from '../src/reddit/reddit.service'
import { RedditSort, RedditLinkInfoUntrusted } from '@redgent/types/reddit'

// Helper to create a mock link
const createMockLink = (
  id: string,
  subreddit: string,
): RedditLinkInfoUntrusted => ({
  id,
  title: `Title for ${id}`,
  author: 'test-author',
  author_fullname: 't2_test-author',
  created_utc: Date.now() / 1000,
  subreddit,
  subreddit_name_prefixed: `r/${subreddit}`,
  subreddit_subscribers: 1000,
  url: `https://www.reddit.com/r/${subreddit}/comments/${id}/`,
  is_video: false,
  over_18: false,
  permalink: `/r/${subreddit}/comments/${id}/`,
  score: 100,
  num_comments: 50,
  upvote_ratio: 0.9,
  num_crossposts: 1,
  thumbnail: 'self',
  archived: false,
  locked: false,
})

// Helper to create a mock API response
const createMockResponse = (links: RedditLinkInfoUntrusted[]) => ({
  kind: 'Listing',
  data: {
    after: 't3_xyz',
    before: null,
    dist: links.length,
    modhash: 'mock_modhash',
    geo_filter: null,
    children: links.map((link) => ({ kind: 't3', data: link })),
  },
})

describe('RedditService', () => {
  let app: INestApplication
  let redditService: RedditService
  jest.setTimeout(30000)

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication()
    await app.init()
    redditService = app.get<RedditService>(RedditService)
  })

  afterAll(async () => {
    await app.close()
  })

  describe('getSubredditsByQuery', () => {
    it('should fetch subreddits by query from the real Reddit API', async () => {
      const query = 'programming'
      const result = await redditService.getSubredditsByQuery(query)

      expect(result).toBeDefined()
      expect(Array.isArray(result.children)).toBe(true)

      expect(result.children.length).toBeGreaterThan(0)
    })
  })

  describe('getHotLinksBySubreddit', () => {
    it('should fetch hot links by subreddit from a real subreddit API', async () => {
      const subreddit = 'typescript'
      const result = await redditService.getHotLinksBySubreddit(
        subreddit,
        RedditSort.Hot,
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result.children)).toBe(true)
      expect(result.children.length).toBeGreaterThan(0)

      const firstLink = result.children[0]
      expect(firstLink.kind).toBe('t3') // t3 kind represents a link link
      expect(firstLink.data).toBeDefined()
      expect(firstLink.data.subreddit).toBe(subreddit)
    })
  })

  describe('getHotLinksBySubreddits', () => {
    describe('Mocked', () => {
      let getHotLinksBySubredditSpy: jest.SpyInstance

      beforeEach(() => {
        // Mock the dependency to control its behavior
        getHotLinksBySubredditSpy = jest.spyOn(
          redditService,
          'getHotLinksBySubreddit',
        )
      })

      afterEach(() => {
        // Restore the original implementation after each test
        getHotLinksBySubredditSpy.mockRestore()
      })

      it('should fetch links from multiple subreddits and remove duplicates', async () => {
        const link1 = createMockLink('link1', 'typescript')
        const link2 = createMockLink('link2', 'javascript')
        const link3Shared = createMockLink('link3', 'shared') // This link is in both responses

        const tsResponse = createMockResponse([link1, link3Shared])
        const jsResponse = createMockResponse([link2, link3Shared])

        getHotLinksBySubredditSpy.mockImplementation(async (subreddit) => {
          if (subreddit === 'typescript') {
            return tsResponse.data
          }
          if (subreddit === 'javascript') {
            return jsResponse.data
          }
          return createMockResponse([]).data
        })

        const result = await redditService.getHotLinksBySubreddits([
          'typescript',
          'javascript',
        ])

        expect(result).toBeDefined()
        expect(result.length).toBe(3) // link1, link2, link3 (deduplicated)
        expect(result.map((p) => p.id).sort()).toEqual([
          'link1',
          'link2',
          'link3',
        ])
        expect(getHotLinksBySubredditSpy).toHaveBeenCalledTimes(2)
      })

      it('should handle partial failures gracefully', async () => {
        const link1 = createMockLink('link1', 'nestjs')
        const nestjsResponse = createMockResponse([link1])

        const loggerErrorSpy = jest
          .spyOn(redditService['logger'], 'error')
          .mockImplementation(() => {})

        getHotLinksBySubredditSpy.mockImplementation(async (subreddit) => {
          if (subreddit === 'nestjs') {
            return nestjsResponse.data
          }
          if (subreddit === 'failing') {
            throw new Error('API Error: Subreddit not found')
          }
          return createMockResponse([]).data
        })

        const result = await redditService.getHotLinksBySubreddits([
          'nestjs',
          'failing',
        ])

        expect(result).toBeDefined()
        expect(result.length).toBe(1)
        expect(result[0].id).toBe('link1')
        expect(getHotLinksBySubredditSpy).toHaveBeenCalledTimes(2)

        expect(loggerErrorSpy).toHaveBeenCalledTimes(1)

        loggerErrorSpy.mockRestore()
      })
    })

    it('should fetch hot links for multiple subreddits and deduplicate results', async () => {
      const result = await redditService.getHotLinksBySubreddits([
        'nestjs',
        'javascript',
      ])

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Check if there are no duplicate links
      const uniqueLinks = new Set(result.map((link) => link.id))
      expect(uniqueLinks.size).toBe(result.length)
    })
  })

  describe('getHotLinksByQuery', () => {
    it('should fetch hot links by search query from the real Reddit API', async () => {
      const query = 'nestjs'
      const result = await redditService.getHotLinksByQuery(query)

      expect(result).toBeDefined()
      expect(Array.isArray(result.children)).toBe(true)
      expect(result.children.length).toBeGreaterThan(0)
    })
  })

  describe('getHotLinksByQueries', () => {
    it('should fetch hot links for multiple queries and deduplicate results', async () => {
      const query1 = 'nestjs'
      const query2 = 'Nestjs_framework' // Same query to test deduplication
      const result = await redditService.getHotLinksByQueries([query1, query2])

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Check if there are no duplicate links
      const uniqueLinks = new Set(result.map((link) => link.id))
      expect(uniqueLinks.size).toBe(result.length)
    })
  })

  describe('getHotLinksByQueriesAndSubreddits', () => {
    it('should fetch hot links for multiple queries and subreddits and deduplicate results', async () => {
      const query1 = 'nestjs'
      const subreddit1 = 'javascript'
      const result = await redditService.getHotLinksByQueriesAndSubreddits(
        [query1],
        [subreddit1],
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Check if there are no duplicate links
      const uniqueLinks = new Set(result.map((link) => link.id))
      expect(uniqueLinks.size).toBe(result.length)
    })
  })

  describe('getCommentsByLinkId', () => {
    it('should fetch comments by link id from the real Reddit API', async () => {
      const linkId = '1lwstfd'
      const result = await redditService.getCommentsByLinkId(linkId)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
