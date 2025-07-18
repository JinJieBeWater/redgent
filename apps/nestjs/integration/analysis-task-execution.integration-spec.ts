import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager'
import { AnalysisTaskExecutionService } from '../src/analysis-task/analysis-task-execution.service'
import { RedditService } from '../src/reddit/reddit.service'
import { AiSdkService } from '../src/ai-sdk/ai-sdk.service'
import {
  TaskCompleteProgress,
  TaskConfig,
  TaskStatus,
} from '@redgent/types/analysis-task'
import { RedditLinkInfoUntrusted } from '@redgent/types/reddit'
import { lastValueFrom, toArray } from 'rxjs'
import { AnalysisReportService } from '../src/analysis-report/analysis-report.service'
import { createMockContext } from '../src/prisma/context'
import { PrismaService } from '../src/prisma/prisma.service'

describe('AnalysisTaskExecutionService', () => {
  let app: INestApplication
  let taskExecutionService: AnalysisTaskExecutionService
  let cacheManager: Cache
  let mockRedditService: RedditService
  let mockAiSdkService: AiSdkService

  const mockRedditLinks: RedditLinkInfoUntrusted[] = [
    { id: 'link-1', title: 'Test Post 1' } as RedditLinkInfoUntrusted,
    { id: 'link-2', title: 'Test Post 2' } as RedditLinkInfoUntrusted,
    { id: 'link-3', title: 'Test Post 3' } as RedditLinkInfoUntrusted,
  ]

  const mockTaskConfig: TaskConfig = {
    id: 'task-1',
    name: 'Test Task',
    ownerId: 'user-1',
    cron: '0 0 * * *',
    prompt: 'test prompt',
    keywords: ['test'],
    subreddits: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    enableFiltering: true,
    llmModel: 'test-model',
  }

  beforeEach(async () => {
    const mockRedditServiceProvider = {
      provide: RedditService,
      useValue: {
        getHotLinksByQueriesAndSubreddits: jest
          .fn()
          .mockResolvedValue(mockRedditLinks),
      },
    }

    const mockAiSdkServiceProvider = {
      provide: AiSdkService,
      useValue: {
        analyze: jest.fn().mockResolvedValue('AI Analysis Result'),
      },
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({
          isGlobal: true,
          ttl: 60 * 60 * 1000, // 1 hour
        }),
      ],
      providers: [
        AnalysisTaskExecutionService,
        AnalysisReportService,
        mockRedditServiceProvider,
        mockAiSdkServiceProvider,
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    taskExecutionService = moduleFixture.get<AnalysisTaskExecutionService>(
      AnalysisTaskExecutionService,
    )
    cacheManager = moduleFixture.get<Cache>(CACHE_MANAGER)
    mockRedditService = moduleFixture.get<RedditService>(RedditService)
    mockAiSdkService = moduleFixture.get<AiSdkService>(AiSdkService)

    // 确保每个测试开始前缓存是干净的
    await cacheManager.clear()
  })

  afterEach(async () => {
    await app.close()
  })

  it('should fetch links, filter none (all new), and cache them', async () => {
    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')

    const progressObservable = taskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(toArray()),
    )

    // 1. 验证 Reddit 服务被调用
    expect(
      mockRedditService.getHotLinksByQueriesAndSubreddits,
    ).toHaveBeenCalled()

    // 2. 验证过滤状态和结果
    const filterStart = progressEvents.find(
      (p) => p.status === TaskStatus.FILTER_START,
    )
    const filterComplete = progressEvents.find(
      (p) => p.status === TaskStatus.FILTER_COMPLETE,
    )!
    expect(filterStart).toBeDefined()
    expect(filterComplete).toBeDefined()
    expect(filterComplete.data.uniqueCount).toBe(3)
    expect(filterComplete.data.originalCount).toBe(3)

    // 3. 验证 cacheManager.mset 被调用，并且缓存了所有 3 个链接
    expect(cacheMsetSpy).toHaveBeenCalledTimes(1)
    const msetArgs = cacheMsetSpy.mock.calls[0][0]
    expect(msetArgs).toHaveLength(3)
    expect(msetArgs[0].key).toContain('redgent:link:link-1')

    // 4. 验证 AI 服务被调用
    expect(mockAiSdkService.analyze).toHaveBeenCalledWith(
      mockTaskConfig,
      mockRedditLinks,
    )

    // 5. 验证任务最后走到了 TASK_COMPLETE 状态
    const lastEvent = progressEvents[
      progressEvents.length - 1
    ] as TaskCompleteProgress
    expect(lastEvent.status).toBe(TaskStatus.TASK_COMPLETE)
  })

  it('should fetch links, filter out cached links, and cache only new ones', async () => {
    // 预先缓存 link1
    await cacheManager.set('redgent:link:link-1', 1)

    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')

    const progressObservable = taskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(toArray()),
    )

    // 1. 验证过滤结果
    const filterComplete = progressEvents.find(
      (p) => p.status === TaskStatus.FILTER_COMPLETE,
    )!
    expect(filterComplete).toBeDefined()
    expect(filterComplete.data.uniqueCount).toBe(2)
    expect(filterComplete.data.originalCount).toBe(3)

    // 2. 验证 cacheManager.mset 只为新链接调用
    expect(cacheMsetSpy).toHaveBeenCalledTimes(1)
    const msetArgs = cacheMsetSpy.mock.calls[0][0]
    expect(msetArgs).toHaveLength(2)
    expect(msetArgs[0].key).toContain('redgent:link:link-2')
    expect(msetArgs[1].key).toContain('redgent:link:link-3')

    // 3. 验证 AI 分析的是过滤后的链接
    const analyzeStart = progressEvents.find(
      (p) => p.status === TaskStatus.ANALYZE_START,
    )!
    expect(analyzeStart.data.count).toBe(2)
    const expectedLinksForAi = mockRedditLinks.slice(1) // link2 and link3
    expect(mockAiSdkService.analyze).toHaveBeenCalledWith(
      mockTaskConfig,
      expectedLinksForAi,
    )

    // 4. 验证任务最后走到了 TASK_COMPLETE 状态
    const lastEvent = progressEvents[progressEvents.length - 1]
    expect(lastEvent.status).toBe(TaskStatus.TASK_COMPLETE)
  })

  it('should stop execution if all fetched links are already in cache', async () => {
    // 预先缓存所有链接
    await cacheManager.mset([
      { key: 'redgent:link:link-1', value: 1 },
      { key: 'redgent:link:link-2', value: 1 },
      { key: 'redgent:link:link-3', value: 1 },
    ])

    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')

    const progressObservable = taskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(toArray()),
    )

    // 1. 验证过滤结果
    const filterComplete = progressEvents.find(
      (p) => p.status === TaskStatus.FILTER_COMPLETE,
    )!
    expect(filterComplete).toBeDefined()
    expect(filterComplete.data.uniqueCount).toBe(0)

    // 2. 验证 mset 没有被调用
    expect(cacheMsetSpy).not.toHaveBeenCalled()

    // 3. 验证 AI 分析步骤没有被执行
    const analyzeStart = progressEvents.find(
      (p) => p.status === TaskStatus.ANALYZE_START,
    )
    expect(analyzeStart).toBeUndefined()
    expect(mockAiSdkService.analyze).not.toHaveBeenCalled()

    // 4. 验证任务因为没有新帖子而提前取消
    const cancelEvent = progressEvents.find(
      (p) => p.status === TaskStatus.TASK_CANCEL,
    )!
    expect(cancelEvent).toBeDefined()
    expect(cancelEvent.message).toContain('所有帖子都已被处理过')

    // 5. 验证最后一个事件是 TASK_CANCEL
    const lastEvent = progressEvents[progressEvents.length - 1]
    expect(lastEvent.status).toBe(TaskStatus.TASK_CANCEL)
  })
})
