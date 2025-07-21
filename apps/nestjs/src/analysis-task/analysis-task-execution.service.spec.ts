import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Test, TestingModule } from '@nestjs/testing'
import { Cache } from 'cache-manager'
import { lastValueFrom, tap, toArray } from 'rxjs'

import {
  TaskCompleteProgress,
  TaskConfig,
  TaskStatus,
} from '@redgent/types/analysis-task'
import { RedditLinkInfoUntrusted } from '@redgent/types/reddit'

import { AnalysisReportService } from '../analysis-report/analysis-report.service'
import { createMockContext } from '../prisma/context'
import { PrismaService } from '../prisma/prisma.service'
import { CommentNode, RedditService } from '../reddit/reddit.service'
import { AnalysisTaskExecutionService } from './analysis-task-execution.service'

// Mock data for testing
const mockTaskConfig: TaskConfig = {
  id: 'task-1',
  name: 'Test Task',
  cron: '0 0 * * *',
  prompt: 'Test prompt for redgent',
  keywords: ['test'],
  subreddits: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'active',
  enableFiltering: true,
  llmModel: 'test-model',
}

const mockRedditLinks: RedditLinkInfoUntrusted[] = [
  { id: 'link-1', title: 'Test Post 1' } as RedditLinkInfoUntrusted,
  { id: 'link-2', title: 'Test Post 2' } as RedditLinkInfoUntrusted,
]

const mockCompleteLinkData: {
  content: RedditLinkInfoUntrusted
  comment: CommentNode[]
}[] = [
  {
    content: {
      id: 'link-1',
      title: 'Test Post 1',
    } as RedditLinkInfoUntrusted,
    comment: [
      {
        author: 'user1',
        body: 'This is comment 1',
        replies: [
          {
            author: 'user1_1',
            body: 'Child comment 1.1',
            replies: [
              {
                author: 'user1_1_1',
                body: 'Grandchild comment 1.1.1',
                replies: [],
              },
            ],
          },
          {
            author: 'user1_2',
            body: 'Child comment 1.2',
          },
        ],
      },
    ],
  },
  {
    content: {
      id: 'link-2',
      title: 'Test Post 2',
    } as RedditLinkInfoUntrusted,
    comment: [],
  },
  {
    content: {
      id: 'link-3',
      title: 'Test Post 3',
    } as RedditLinkInfoUntrusted,
    comment: [
      {
        author: 'user3',
        body: 'This is comment 3',
        replies: [],
      },
    ],
  },
]

describe('AnalysisTaskExecutionService', () => {
  let service: AnalysisTaskExecutionService
  let redditService: jest.Mocked<RedditService>
  let cacheManager: jest.Mocked<Cache>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisTaskExecutionService,
        AnalysisReportService,
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

    service = module.get(AnalysisTaskExecutionService)
    redditService = module.get(RedditService)
    cacheManager = module.get(CACHE_MANAGER)
  })

  it('应该被正确定义', () => {
    expect(service).toBeDefined()
  })

  describe('execute', () => {
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
      const tooManyLinks = Array.from({ length: 15 }, (_, i) => ({
        id: `link-${i}`,
        title: `link ${i}`,
        selftext: `Content of link ${i}`,
      })) as RedditLinkInfoUntrusted[]

      jest.spyOn(service, 'selectMostRelevantLinks')

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        tooManyLinks,
      )
      cacheManager.mget.mockResolvedValue(tooManyLinks.map(() => undefined))

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
        tooManyLinks,
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
