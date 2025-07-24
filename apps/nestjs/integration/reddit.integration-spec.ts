import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { RedditSort } from '@redgent/types'

import { AppModule } from '../src/app.module'
import { RedditService } from '../src/reddit/reddit.service'
import { createMockLinks, createMockResponse } from '../test/data-factory'

describe(RedditService.name, () => {
  let app: INestApplication
  let redditService: RedditService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication()
    await app.init()
    redditService = app.get<RedditService>(RedditService)
  }, 30000)

  afterAll(async () => {
    await app.close()
  })

  describe(RedditService.prototype.getSubredditsByQuery.name, () => {
    it('应该通过查询从真实的 Reddit API 获取子版块', async () => {
      const query = 'programming'
      const result = await redditService.getSubredditsByQuery(query)

      expect(result).toBeDefined()
      expect(Array.isArray(result.children)).toBe(true)

      expect(result.children.length).toBeGreaterThan(0)
    })
  })

  describe(RedditService.prototype.getHotLinksBySubreddit.name, () => {
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
    }, 15000)
  })

  describe(RedditService.prototype.getHotLinksBySubreddits.name, () => {
    it('应该优雅地处理部分失败', async () => {
      const mockLinks = createMockLinks(1, 'nestjs', 'link')
      const nestjsResponse = createMockResponse(mockLinks)

      const loggerErrorSpy = jest
        .spyOn(redditService['logger'], 'error')
        .mockImplementation(() => {})

      jest
        .spyOn(redditService, 'getHotLinksBySubreddit')
        .mockImplementation(async subreddit => {
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
      expect(result[0].id).toBe('link-1')
      expect(redditService.getHotLinksBySubreddit).toHaveBeenCalledTimes(2)

      expect(loggerErrorSpy).toHaveBeenCalledTimes(1)

      loggerErrorSpy.mockRestore()
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
      const uniqueLinks = new Set(result.map(link => link.id))
      expect(uniqueLinks.size).toBe(result.length)
    })
  })

  describe(RedditService.prototype.getHotLinksByQuery.name, () => {
    it('应该通过搜索查询从真实的 Reddit API 获取热门链接', async () => {
      const query = 'nestjs'
      const result = await redditService.getHotLinksByQuery(query)

      expect(result).toBeDefined()
      expect(Array.isArray(result.children)).toBe(true)
      expect(result.children.length).toBeGreaterThan(0)
    })
  })

  describe(RedditService.prototype.getHotLinksByQueries.name, () => {
    it('应该为多个查询获取热门链接并去重结果', async () => {
      const query1 = 'nestjs'
      const query2 = 'Nestjs_framework' // Same query to test deduplication
      const result = await redditService.getHotLinksByQueries([query1, query2])

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Check if there are no duplicate links
      const uniqueLinks = new Set(result.map(link => link.id))
      expect(uniqueLinks.size).toBe(result.length)
    })
  })

  describe(
    RedditService.prototype.getHotLinksByQueriesAndSubreddits.name,
    () => {
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
        const uniqueLinks = new Set(result.map(link => link.id))
        expect(uniqueLinks.size).toBe(result.length)
      })
    },
  )

  describe(RedditService.prototype.getCommentsByLinkId.name, () => {
    it('应该通过链接 ID 从真实的 Reddit API 获取评论', async () => {
      // 先获取真实的链接，再用其 ID 获取评论
      const subredditResult = await redditService.getHotLinksByQueries([
        'reactjs',
      ])

      // 确保我们有链接数据
      expect(subredditResult.length).toBeGreaterThan(0)

      // 获取有评论的链接 ID
      const linkWithComments = subredditResult.find(
        link => link.num_comments > 0,
      )
      expect(linkWithComments).toBeDefined()

      const realLinkId = linkWithComments!.id
      const result = await redditService.getCommentsByLinkId(realLinkId)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    }, 30000)
  })
})
