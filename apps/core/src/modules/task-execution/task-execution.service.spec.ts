import { EeModule } from '@core/processors/ee/ee.module'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Test, TestingModule } from '@nestjs/testing'
import { ModelMessage } from 'ai'
import { Cache } from 'cache-manager'
import { lastValueFrom, toArray } from 'rxjs'
import { createMockContext } from 'test/mocks'
import { Mocked } from 'vitest'

import { TaskProgressStatus } from '@redgent/shared'

import {
  createMockLinkWithComments,
  createMockTaskConfig,
  createTooManyLinks,
  TEST_DATA_PRESETS,
} from '../../../test/data-factory'
import { selectMostRelevantLinksPrompt } from '../../ai-sdk/prompts'
import {
  addCustomResponseHandler,
  clearCustomHandlers,
  compareMessages,
} from '../../ai-sdk/utils'
import { PrismaService } from '../../processors/prisma/prisma.service'
import { RedditService } from '../reddit/reddit.service'
import { TaskExecutionService } from './task-execution.service'

// 使用数据工厂创建测试数据
const mockTaskConfig = createMockTaskConfig()
const mockRedditLinks = TEST_DATA_PRESETS.fewLinks
const mockCompleteLinkData = mockRedditLinks.map(link =>
  createMockLinkWithComments(link.id),
)

describe(TaskExecutionService.name, () => {
  let service: TaskExecutionService
  let redditService: Mocked<RedditService>
  let cacheManager: Mocked<Cache>

  beforeEach(async () => {
    // 清理之前的自定义处理器
    clearCustomHandlers()

    const module: TestingModule = await Test.createTestingModule({
      imports: [EeModule],
      providers: [
        TaskExecutionService,
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
        {
          provide: RedditService,
          useValue: {
            getHotLinksByQueriesAndSubreddits: vi
              .fn()
              .mockResolvedValue(mockRedditLinks),
            getCommentsByLinkIds: vi
              .fn()
              .mockResolvedValue(mockCompleteLinkData),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: vi.fn().mockResolvedValue(undefined),
            set: vi.fn().mockResolvedValue(undefined),
            mget: vi.fn().mockResolvedValue([]),
            mset: vi.fn().mockResolvedValue(undefined),
            del: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile()

    service = module.get(TaskExecutionService)
    redditService = module.get(RedditService)
    cacheManager = module.get(CACHE_MANAGER)
  })

  afterEach(() => {
    // 测试后清理自定义处理器
    clearCustomHandlers()
  })

  it('应该被正确定义', () => {
    expect(service).toBeDefined()
  })

  describe(TaskExecutionService.prototype.execute.name, () => {
    beforeEach(() => {
      // Mock Reddit service to return test data
      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        mockRedditLinks,
      )
      redditService.getCommentsByLinkIds.mockResolvedValue(mockCompleteLinkData)
    })

    it('应该在不过滤的情况下成功执行任务', async () => {
      const taskConfig = { ...mockTaskConfig, enableCache: false }

      const progressObservable = service.executeObservable(taskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map(p => p.status)).toEqual([
        TaskProgressStatus.TASK_START,
        TaskProgressStatus.FETCH_START,
        TaskProgressStatus.FETCH_COMPLETE,
        TaskProgressStatus.FETCH_CONTENT_START,
        TaskProgressStatus.FETCH_CONTENT_COMPLETE,
        TaskProgressStatus.ANALYZE_START,
        TaskProgressStatus.ANALYZE_COMPLETE,
        TaskProgressStatus.TASK_COMPLETE,
      ])
      const completeEvent = progressEvents.pop()
      expect(completeEvent?.status).toBe(TaskProgressStatus.TASK_COMPLETE)
    })

    it('应该在过滤新链接的情况下成功执行任务', async () => {
      const taskConfig = { ...mockTaskConfig, enableCache: true }

      // Mock mget to return one cached link and one new one
      cacheManager.mget.mockResolvedValue([1, undefined])

      const progressObservable = service.executeObservable(taskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map(p => p.status)).toEqual([
        TaskProgressStatus.TASK_START,
        TaskProgressStatus.FETCH_START,
        TaskProgressStatus.FETCH_COMPLETE,
        TaskProgressStatus.FILTER_START,
        TaskProgressStatus.FILTER_COMPLETE,
        TaskProgressStatus.FETCH_CONTENT_START,
        TaskProgressStatus.FETCH_CONTENT_COMPLETE,
        TaskProgressStatus.ANALYZE_START,
        TaskProgressStatus.ANALYZE_COMPLETE,
        TaskProgressStatus.TASK_COMPLETE,
      ])

      // 验证缓存调用使用了正确的链接ID（从mockRedditLinks获取）
      const expectedCacheKeys = mockRedditLinks.map(
        link => `redgent:link:${link.id}`,
      )
      expect(cacheManager.mget).toHaveBeenCalledWith(expectedCacheKeys)
      expect(cacheManager.mset).toHaveBeenCalled()

      const completeEvent = progressEvents.pop()
      expect(completeEvent?.status).toBe(TaskProgressStatus.TASK_COMPLETE)
    })

    it('应该在启用过滤且没有找到新链接时取消任务', async () => {
      const taskConfig = { ...mockTaskConfig, enableCache: true }

      // Mock mget to return all links as cached
      cacheManager.mget.mockResolvedValue(mockRedditLinks.map(() => 1))

      const progressObservable = service.executeObservable(taskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map(p => p.status)).toEqual([
        TaskProgressStatus.TASK_START,
        TaskProgressStatus.FETCH_START,
        TaskProgressStatus.FETCH_COMPLETE,
        TaskProgressStatus.FILTER_START,
        TaskProgressStatus.TASK_CANCEL,
      ])
      expect(progressEvents.pop()?.status).toBe(TaskProgressStatus.TASK_CANCEL)
    })

    it('应该在从 Reddit 获取不到链接时取消任务', async () => {
      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue([])

      const progressObservable = service.executeObservable(mockTaskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map(p => p.status)).toEqual([
        TaskProgressStatus.TASK_START,
        TaskProgressStatus.FETCH_START,
        TaskProgressStatus.TASK_CANCEL,
      ])
      expect(progressEvents.pop()?.status).toBe(TaskProgressStatus.TASK_CANCEL)
    })

    it('应该正确处理 RedditService 的错误', async () => {
      const errorMessage = '测试预期的报错 Reddit API error'
      redditService.getHotLinksByQueriesAndSubreddits.mockRejectedValue(
        new Error(errorMessage),
      )

      const progressObservable = service.executeObservable(mockTaskConfig)

      await expect(
        lastValueFrom(progressObservable.pipe(toArray())),
      ).rejects.toMatchObject({
        status: TaskProgressStatus.TASK_ERROR,
        message: `任务 "${mockTaskConfig.name}" 执行失败 测试预期的报错 Reddit API error`,
      })
    })

    it('应该在链接数量超过 MAX_LINKS_PER_TASK 时使用 AI 过滤链接', async () => {
      const tooManyLinks = createTooManyLinks(15)
      const inputLinkData = tooManyLinks.map(link => ({
        id: link.id,
        title: link.title,
        selftext: link.selftext,
      }))

      // 创建期望的测试 prompt
      const expectedPrompt: ModelMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: selectMostRelevantLinksPrompt(
              mockTaskConfig.prompt,
              inputLinkData,
              10,
            ),
          },
        ],
      }

      // 动态生成链接选择响应，使用前10个实际的链接ID
      const selectedLinkIds = {
        relevant_link_ids: tooManyLinks.slice(0, 10).map(link => link.id),
      }

      // 注册基于精确消息匹配的响应处理器
      addCustomResponseHandler(
        prompt => compareMessages(prompt.at(-1)!, expectedPrompt),
        () => JSON.stringify(selectedLinkIds),
      )

      vi.spyOn(service, 'selectMostRelevantLinks')

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        tooManyLinks,
      )
      cacheManager.mget.mockResolvedValue(inputLinkData.map(() => undefined))

      const progressObservable = service.executeObservable(mockTaskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map(p => p.status)).toEqual([
        TaskProgressStatus.TASK_START,
        TaskProgressStatus.FETCH_START,
        TaskProgressStatus.FETCH_COMPLETE,
        TaskProgressStatus.FILTER_START,
        TaskProgressStatus.FILTER_COMPLETE,
        TaskProgressStatus.SELECT_START,
        TaskProgressStatus.SELECT_COMPLETE,
        TaskProgressStatus.FETCH_CONTENT_START,
        TaskProgressStatus.FETCH_CONTENT_COMPLETE,
        TaskProgressStatus.ANALYZE_START,
        TaskProgressStatus.ANALYZE_COMPLETE,
        TaskProgressStatus.TASK_COMPLETE,
      ])

      expect(service.selectMostRelevantLinks).toHaveBeenCalledWith(
        mockTaskConfig,
        inputLinkData,
      )
    })

    it('应该在链接数量未超过 MAX_LINKS_PER_TASK 时不使用 AI 过滤链接', async () => {
      const fewLinks = mockRedditLinks.slice(0, 2)

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        fewLinks,
      )
      cacheManager.mget.mockResolvedValue([undefined, undefined])
      vi.spyOn(service, 'selectMostRelevantLinks')

      const progressObservable = service.executeObservable(mockTaskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map(p => p.status)).toEqual([
        TaskProgressStatus.TASK_START,
        TaskProgressStatus.FETCH_START,
        TaskProgressStatus.FETCH_COMPLETE,
        TaskProgressStatus.FILTER_START,
        TaskProgressStatus.FILTER_COMPLETE,
        TaskProgressStatus.FETCH_CONTENT_START,
        TaskProgressStatus.FETCH_CONTENT_COMPLETE,
        TaskProgressStatus.ANALYZE_START,
        TaskProgressStatus.ANALYZE_COMPLETE,
        TaskProgressStatus.TASK_COMPLETE,
      ])

      expect(service.selectMostRelevantLinks).not.toHaveBeenCalled()
    })

    it('应该正确处理获取完整内容时的错误', async () => {
      redditService.getCommentsByLinkIds.mockRejectedValueOnce(
        new Error('测试预期的报错 Failed to fetch comments'),
      )

      const progressObservable = service.executeObservable(mockTaskConfig)

      await expect(
        lastValueFrom(progressObservable.pipe(toArray())),
      ).rejects.toMatchObject({
        status: TaskProgressStatus.TASK_ERROR,
        message: `任务 "${mockTaskConfig.name}" 执行失败 测试预期的报错 Failed to fetch comments`,
      })
    })
  })
})
