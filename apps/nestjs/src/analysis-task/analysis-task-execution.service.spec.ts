import { Test, TestingModule } from '@nestjs/testing'
import { AnalysisTaskExecutionService } from './analysis-task-execution.service'
import { RedditService } from '../reddit/reddit.service'
import { AiSdkService } from '../ai-sdk/ai-sdk.service'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { lastValueFrom, toArray } from 'rxjs'
import {
  TaskCompleteProgress,
  TaskConfig,
  TaskStatus,
} from '@redgent/types/analysis-task'
import { RedditLinkInfoUntrusted } from '@redgent/types/reddit'
import { AnalysisReport } from '@redgent/types/analysis-report'
import { AnalysisReportService } from '../analysis-report/analysis-report.service'
import { PrismaService } from '../prisma/prisma.service'
import { createMockContext } from '../prisma/context'
import { CommentNode } from '../reddit/reddit.service'

// Mock data for testing
const mockTaskConfig: TaskConfig = {
  id: 'task-1',
  name: 'Test Task',
  ownerId: 'user-1',
  cron: '0 0 * * *',
  prompt: 'Analyze these posts',
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

const mockAnalysisReport: AnalysisReport = {
  title: '测试分析报告',
  overallSummary: '这是一个测试分析报告的总结',
  findings: [
    {
      point: '测试要点1',
      elaboration: '这是要点1的详细阐述',
      supportingPostIds: ['link-1'],
    },
  ],
}

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
  let aisdkService: jest.Mocked<AiSdkService>
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
            getHotLinksByQueriesAndSubreddits: jest.fn(),
            getCommentsByLinkIds: jest
              .fn()
              .mockResolvedValue(mockCompleteLinkData),
          },
        },
        {
          provide: AiSdkService,
          useValue: {
            analyze: jest.fn(),
            selectMostRelevantLinks: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            mget: jest.fn(),
            mset: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(AnalysisTaskExecutionService)
    redditService = module.get(RedditService)
    aisdkService = module.get(AiSdkService)
    cacheManager = module.get(CACHE_MANAGER)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('execute', () => {
    it('should execute a task successfully without filtering', async () => {
      const taskConfig = { ...mockTaskConfig, enableFiltering: false }
      const analysisResult: AnalysisReport = mockAnalysisReport

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        mockRedditLinks,
      )
      aisdkService.analyze.mockResolvedValue(analysisResult)

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
      expect(
        redditService.getHotLinksByQueriesAndSubreddits,
      ).toHaveBeenCalledWith(taskConfig.keywords, taskConfig.subreddits)
      expect(aisdkService.analyze).toHaveBeenCalledWith(
        taskConfig,
        mockCompleteLinkData,
      )
      expect(cacheManager.mget).not.toHaveBeenCalled()
      const completeEvent = progressEvents.pop() as TaskCompleteProgress
      expect(completeEvent.status).toBe(TaskStatus.TASK_COMPLETE)
    })

    it('should execute a task successfully with filtering for new links', async () => {
      const taskConfig = { ...mockTaskConfig, enableFiltering: true }
      const analysisResult: AnalysisReport = mockAnalysisReport

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        mockRedditLinks,
      )
      // Mock mget to return one cached link and one new one
      cacheManager.mget.mockResolvedValue([1, undefined])
      aisdkService.analyze.mockResolvedValue(analysisResult)

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

      const newLinks = [mockRedditLinks[1]]
      expect(cacheManager.mget).toHaveBeenCalledWith([
        'redgent:link:link-1',
        'redgent:link:link-2',
      ])
      expect(cacheManager.mset).toHaveBeenCalled()
      expect(aisdkService.analyze).toHaveBeenCalledWith(
        taskConfig,
        mockCompleteLinkData,
      )
      const completeEvent = progressEvents.pop() as TaskCompleteProgress
      expect(completeEvent.status).toBe(TaskStatus.TASK_COMPLETE)
    })

    it('should cancel the task if filtering is enabled and no new links are found', async () => {
      const taskConfig = { ...mockTaskConfig, enableFiltering: true }

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        mockRedditLinks,
      )
      // Mock mget to return all links as cached
      cacheManager.mget.mockResolvedValue(mockRedditLinks.map(() => 1))

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
        TaskStatus.TASK_CANCEL,
      ])
      expect(aisdkService.analyze).not.toHaveBeenCalled()
      expect(progressEvents.pop()?.status).toBe(TaskStatus.TASK_CANCEL)
    })

    it('should cancel the task if no links are fetched from Reddit', async () => {
      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue([])

      const progressObservable = service.execute(mockTaskConfig)
      const progressEvents = await lastValueFrom(
        progressObservable.pipe(toArray()),
      )

      expect(progressEvents.map((p) => p.status)).toEqual([
        TaskStatus.TASK_START,
        TaskStatus.FETCH_START,
        TaskStatus.FETCH_COMPLETE,
        TaskStatus.TASK_CANCEL,
      ])
      expect(aisdkService.analyze).not.toHaveBeenCalled()
      expect(progressEvents.pop()?.status).toBe(TaskStatus.TASK_CANCEL)
    })

    it('should handle errors from RedditService', async () => {
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

    it('should handle errors from AiSdkService', async () => {
      const errorMessage = 'AI analysis failed'
      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        mockRedditLinks,
      )
      cacheManager.mget.mockResolvedValue([undefined, undefined]) // All links are new
      aisdkService.analyze.mockRejectedValue(new Error(errorMessage))

      const progressObservable = service.execute(mockTaskConfig)

      await expect(
        lastValueFrom(progressObservable.pipe(toArray())),
      ).rejects.toMatchObject({
        status: TaskStatus.TASK_ERROR,
        message: `任务 "${mockTaskConfig.name}" 执行失败`,
      })
    })

    it('should filter links with AI if they exceed MAX_LINKS_PER_TASK', async () => {
      const tooManyLinks = Array.from({ length: 15 }, (_, i) => ({
        id: `link-${i}`,
        title: `Post ${i}`,
      })) as RedditLinkInfoUntrusted[]
      const filteredLinks = tooManyLinks.slice(0, 5)

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        tooManyLinks,
      )
      cacheManager.mget.mockResolvedValue(tooManyLinks.map(() => undefined))
      aisdkService.selectMostRelevantLinks.mockResolvedValue(filteredLinks)
      aisdkService.analyze.mockResolvedValue(mockAnalysisReport)

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

      expect(aisdkService.selectMostRelevantLinks).toHaveBeenCalledWith(
        mockTaskConfig,
        tooManyLinks,
      )
      expect(aisdkService.analyze).toHaveBeenCalledWith(
        mockTaskConfig,
        mockCompleteLinkData,
      )
    })

    it('should not filter links with AI if they do not exceed MAX_LINKS_PER_TASK', async () => {
      const fewLinks = mockRedditLinks.slice(0, 2)

      redditService.getHotLinksByQueriesAndSubreddits.mockResolvedValue(
        fewLinks,
      )
      cacheManager.mget.mockResolvedValue([undefined, undefined])
      aisdkService.analyze.mockResolvedValue(mockAnalysisReport)

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

      expect(aisdkService.selectMostRelevantLinks).not.toHaveBeenCalled()
      expect(aisdkService.analyze).toHaveBeenCalledWith(
        mockTaskConfig,
        mockCompleteLinkData,
      )
    })

    it('should handle error during fetching complete content', async () => {
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
