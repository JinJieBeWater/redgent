import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { RedditLinkInfoUntrusted, RedditSort } from '@redgent/types/reddit'

import { AppModule } from '../src/app.module'
import { RedditService } from '../src/reddit/reddit.service'

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
  ups: 100,
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

describe('RedditService (集成测试)', () => {
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
    it('应该通过查询从真实的 Reddit API 获取子版块', async () => {
      const query = 'programming'
      const result = await redditService.getSubredditsByQuery(query)

      expect(result).toBeDefined()
      expect(Array.isArray(result.children)).toBe(true)

      expect(result.children.length).toBeGreaterThan(0)
    })
  })

  describe('getHotLinksBySubreddit', () => {
    it('应该从真实的子版块 API 获取热门链接', async () => {
      const subreddit = 'typescript'
      const result = await redditService.getHotLinksBySubreddit(
        subreddit,
        RedditSort.Hot,
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result.children)).toBe(true)
      expect(result.children.length).toBeGreaterThan(0)

      const firstLink = result.children[0]
      expect(firstLink.kind).toBe('t3') // t3 类型表示链接
      expect(firstLink.data).toBeDefined()
      expect(firstLink.data.subreddit).toBe(subreddit)
    })
  })

  describe('getHotLinksBySubreddits', () => {
    describe('模拟测试', () => {
      let getHotLinksBySubredditSpy: jest.SpyInstance

      beforeEach(() => {
        // 模拟依赖以控制其行为
        getHotLinksBySubredditSpy = jest.spyOn(
          redditService,
          'getHotLinksBySubreddit',
        )
      })

      afterEach(() => {
        // 每个测试后恢复原始实现
        getHotLinksBySubredditSpy.mockRestore()
      })

      it('应该优雅地处理部分失败', async () => {
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

    it('应该为多个子版块获取热门链接并去重结果', async () => {
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
    it('应该通过搜索查询从真实的 Reddit API 获取热门链接', async () => {
      const query = 'nestjs'
      const result = await redditService.getHotLinksByQuery(query)

      expect(result).toBeDefined()
      expect(Array.isArray(result.children)).toBe(true)
      expect(result.children.length).toBeGreaterThan(0)
    })
  })

  describe('getHotLinksByQueries', () => {
    it('应该为多个查询获取热门链接并去重结果', async () => {
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
    it('应该为多个查询和子版块获取热门链接并去重结果', async () => {
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
    it('应该通过链接 ID 从真实的 Reddit API 获取评论', async () => {
      const linkId = '1lwstfd'
      const result = await redditService.getCommentsByLinkId(linkId)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
