import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Test, TestingModule } from '@nestjs/testing'
import { ModelMessage } from 'ai'
import { Cache } from 'cache-manager'
import { lastValueFrom, toArray } from 'rxjs'

import { TaskCompleteProgress, TaskStatus } from '@redgent/types/analysis-task'

import {
  createMockTaskConfig,
  createTooManyLinks,
  TEST_DATA_PRESETS,
} from '../../test/data-factory'
import { selectMostRelevantLinksPrompt } from '../ai-sdk/prompts'
import {
  addCustomResponseHandler,
  clearCustomHandlers,
  compareMessages,
  MOCK_RESPONSES,
} from '../ai-sdk/utils'
import { createMockContext } from '../prisma/context'
import { PrismaService } from '../prisma/prisma.service'
import { RedditService } from '../reddit/reddit.service'
import { ReportService } from '../report/report.service'
import { TaskExecutionService } from './task-execution.service'

// 使用数据工厂创建测试数据
const mockTaskConfig = createMockTaskConfig()
const mockRedditLinks = TEST_DATA_PRESETS.fewLinks
const mockCompleteLinkData = TEST_DATA_PRESETS.completeLinkData

describe(TaskExecutionService.name, () => {
  let service: TaskExecutionService
  let redditService: jest.Mocked<RedditService>
  let cacheManager: jest.Mocked<Cache>

  beforeEach(async () => {
    // 清理之前的自定义处理器
    clearCustomHandlers()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskExecutionService,
        ReportService,
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
        {
          provide: RedditService,
          useValue: {
            getHotLinksByQueriesAndSubreddits: jest
              .fn()
              .mockResolvedValue(mockRedditLinks),
            getCommentsByLinkIds: jest
              .fn()
              .mockResolvedValue(mockCompleteLinkData),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn().mockResolvedValue(undefined),
            set: jest.fn().mockResolvedValue(undefined),
            mget: jest.fn().mockResolvedValue([]),
            mset: jest.fn().mockResolvedValue(undefined),
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
    it('应该在不过滤的情况下成功执行任务', async () => {
      const taskConfig = { ...mockTaskConfig, enableFiltering: false }

      const progressObservable = service.execute(taskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map((p) => p.status)).toEqual([
        TaskStatus.TASK_START,
        TaskStatus.FETCH_START,
        TaskStatus.FETCH_COMPLETE,
        TaskStatus.FETCH_CONTENT_START,
        TaskStatus.FETCH_CONTENT_COMPLETE,
        TaskStatus.ANALYZE_START,
        TaskStatus.ANALYZE_COMPLETE,
        TaskStatus.TASK_COMPLETE,
      ])
      const completeEvent = progressEvents.pop() as TaskCompleteProgress
      expect(completeEvent.status).toBe(TaskStatus.TASK_COMPLETE)
    })

    it('应该在过滤新链接的情况下成功执行任务', async () => {
      const taskConfig = { ...mockTaskConfig, enableFiltering: true }

      // Mock mget to return one cached link and one new one
      cacheManager.mget.mockResolvedValue([1, undefined])

      const progressObservable = service.execute(taskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map((p) => p.status)).toEqual([
        TaskStatus.TASK_START,
        TaskStatus.FETCH_START,
        TaskStatus.FETCH_COMPLETE,
        TaskStatus.FILTER_START,
        TaskStatus.FILTER_COMPLETE,
        TaskStatus.FETCH_CONTENT_START,
        TaskStatus.FETCH_CONTENT_COMPLETE,
        TaskStatus.ANALYZE_START,
        TaskStatus.ANALYZE_COMPLETE,
        TaskStatus.TASK_COMPLETE,
      ])

      expect(cacheManager.mget).toHaveBeenCalledWith([
        'redgent:link:link-1',
        'redgent:link:link-2',
      ])
      expect(cacheManager.mset).toHaveBeenCalled()

      const completeEvent = progressEvents.pop() as TaskCompleteProgress
      expect(completeEvent.status).toBe(TaskStatus.TASK_COMPLETE)
    })

    it('应该在启用过滤且没有找到新链接时取消任务', async () => {
      const taskConfig = { ...mockTaskConfig, enableFiltering: true }

      // Mock mget to return all links as cached
      cacheManager.mget.mockResolvedValue(mockRedditLinks.map(() => 1))

      jest.spyOn(service, 'analyze')

      const progressObservable = service.execute(taskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map((p) => p.status)).toEqual([
        TaskStatus.TASK_START,
        TaskStatus.FETCH_START,
        TaskStatus.FETCH_COMPLETE,
        TaskStatus.FILTER_START,
        TaskStatus.TASK_CANCEL,
      ])
      expect(service.analyze).not.toHaveBeenCalled()
      expect(progressEvents.pop()?.status).toBe(TaskStatus.TASK_CANCEL)
    })

    it('应该在从 Reddit 获取不到链接时取消任务', async () => {
      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue([])

      jest.spyOn(service, 'analyze')

      const progressObservable = service.execute(mockTaskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map((p) => p.status)).toEqual([
        TaskStatus.TASK_START,
        TaskStatus.FETCH_START,
        TaskStatus.TASK_CANCEL,
      ])
      expect(service.analyze).not.toHaveBeenCalled()
      expect(progressEvents.pop()?.status).toBe(TaskStatus.TASK_CANCEL)
    })

    it('应该正确处理 RedditService 的错误', async () => {
      const errorMessage = '测试预期的报错 Reddit API error'
      redditService.getHotLinksByQueriesAndSubreddits.mockRejectedValue(
        new Error(errorMessage),
      )

      const progressObservable = service.execute(mockTaskConfig)

      await expect(
        lastValueFrom(progressObservable.pipe(toArray())),
      ).rejects.toMatchObject({
        status: TaskStatus.TASK_ERROR,
        message: `任务 "${mockTaskConfig.name}" 执行失败`,
      })
    })

    it('应该正确处理 AiSdkService 的错误', async () => {
      const errorMessage = '测试预期的报错 AI analysis failed'

      cacheManager.mget.mockResolvedValue([undefined, undefined]) // All links are new
      jest.spyOn(service, 'analyze').mockRejectedValue(new Error(errorMessage))

      const progressObservable = service.execute(mockTaskConfig)

      await expect(
        lastValueFrom(progressObservable.pipe(toArray())),
      ).rejects.toMatchObject({
        status: TaskStatus.TASK_ERROR,
        message: `任务 "${mockTaskConfig.name}" 执行失败`,
      })
    })

    it('应该在链接数量超过 MAX_LINKS_PER_TASK 时使用 AI 过滤链接', async () => {
      const tooManyLinks = createTooManyLinks(15)
      const inputLinkData = tooManyLinks.map((link) => ({
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

      // 注册基于精确消息匹配的响应处理器
      addCustomResponseHandler(
        (prompt) => compareMessages(prompt.at(-1)!, expectedPrompt),
        () => JSON.stringify(MOCK_RESPONSES.linkSelection),
      )

      jest.spyOn(service, 'selectMostRelevantLinks')

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        tooManyLinks,
      )
      cacheManager.mget.mockResolvedValue(inputLinkData.map(() => undefined))

      const progressObservable = service.execute(mockTaskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map((p) => p.status)).toEqual([
        TaskStatus.TASK_START,
        TaskStatus.FETCH_START,
        TaskStatus.FETCH_COMPLETE,
        TaskStatus.FILTER_START,
        TaskStatus.FILTER_COMPLETE,
        TaskStatus.SELECT_START,
        TaskStatus.SELECT_COMPLETE,
        TaskStatus.FETCH_CONTENT_START,
        TaskStatus.FETCH_CONTENT_COMPLETE,
        TaskStatus.ANALYZE_START,
        TaskStatus.ANALYZE_COMPLETE,
        TaskStatus.TASK_COMPLETE,
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
      jest.spyOn(service, 'selectMostRelevantLinks')

      const progressObservable = service.execute(mockTaskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map((p) => p.status)).toEqual([
        TaskStatus.TASK_START,
        TaskStatus.FETCH_START,
        TaskStatus.FETCH_COMPLETE,
        TaskStatus.FILTER_START,
        TaskStatus.FILTER_COMPLETE,
        TaskStatus.FETCH_CONTENT_START,
        TaskStatus.FETCH_CONTENT_COMPLETE,
        TaskStatus.ANALYZE_START,
        TaskStatus.ANALYZE_COMPLETE,
        TaskStatus.TASK_COMPLETE,
      ])

      expect(service.selectMostRelevantLinks).not.toHaveBeenCalled()
    })

    it('应该正确处理获取完整内容时的错误', async () => {
      jest
        .spyOn(redditService, 'getCommentsByLinkIds')
        .mockRejectedValueOnce(new Error('Failed to fetch comments'))

      const progressObservable = service.execute(mockTaskConfig)

      await expect(
        lastValueFrom(progressObservable.pipe(toArray())),
      ).rejects.toMatchObject({
        status: TaskStatus.TASK_ERROR,
        message: `任务 "${mockTaskConfig.name}" 执行失败`,
      })
    })
  })
})
