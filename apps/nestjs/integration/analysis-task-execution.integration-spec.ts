import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Cache } from 'cache-manager'
import { lastValueFrom, toArray } from 'rxjs'

import { AnalysisReportContent } from '@redgent/types/analysis-report'
import {
  TaskCancelProgress,
  TaskCompleteProgress,
  TaskConfig,
  TaskStatus,
} from '@redgent/types/analysis-task'
import { RedditLinkInfoUntrusted } from '@redgent/types/reddit'

import { AnalysisReportService } from '../src/analysis-report/analysis-report.service'
import { AnalysisTaskExecutionService } from '../src/analysis-task/analysis-task-execution.service'
import { createMockContext } from '../src/prisma/context'
import { PrismaService } from '../src/prisma/prisma.service'
import { CommentNode, RedditService } from '../src/reddit/reddit.service'

const mockAnalysisReport: AnalysisReportContent = {
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

const mockRedditLinks: RedditLinkInfoUntrusted[] = [
  {
    id: 'link-1',
    title: 'Test Post 1',
    ups: 10,
    num_comments: 5,
  } as RedditLinkInfoUntrusted,
  {
    id: 'link-2',
    title: 'Test Post 2',
    ups: 10,
    num_comments: 5,
  } as RedditLinkInfoUntrusted,
  {
    id: 'link-3',
    title: 'Test Post 3',
    ups: 10,
    num_comments: 5,
  } as RedditLinkInfoUntrusted,
]

const mockTaskConfig: TaskConfig = {
  id: 'task-1',
  name: 'Test Task',
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

describe('AnalysisTaskExecutionService (集成测试)', () => {
  let app: INestApplication
  let analysisTaskExecutionService: AnalysisTaskExecutionService
  let cacheManager: Cache
  let mockRedditService: RedditService

  beforeEach(async () => {
    const mockRedditServiceProvider = {
      provide: RedditService,
      useValue: {
        getHotLinksByQueriesAndSubreddits: jest
          .fn()
          .mockResolvedValue(mockRedditLinks),
        getCommentsByLinkIds: jest.fn().mockImplementation((ids: string[]) => {
          return Promise.resolve(
            mockCompleteLinkData.filter((data) =>
              ids.includes(data.content.id),
            ),
          )
        }),
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
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    analysisTaskExecutionService =
      moduleFixture.get<AnalysisTaskExecutionService>(
        AnalysisTaskExecutionService,
      )
    cacheManager = moduleFixture.get<Cache>(CACHE_MANAGER)
    mockRedditService = moduleFixture.get<RedditService>(RedditService)

    // 确保每个测试开始前缓存是干净的
    await cacheManager.clear()
  })

  afterEach(async () => {
    await app.close()
  })

  it('应该获取链接，不过滤（全部为新链接），并缓存它们', async () => {
    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')
    jest
      .spyOn(analysisTaskExecutionService, 'analyze')
      .mockResolvedValue(mockAnalysisReport)

    const progressObservable =
      analysisTaskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(
        // tap((data) => console.log(data)),
        toArray(),
      ),
    )

    // 1. 验证过滤状态和结果
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

    // 2. 验证 cacheManager.mset 被调用，并且缓存了所有 3 个链接
    expect(cacheMsetSpy).toHaveBeenCalledTimes(1)
    const msetArgs = cacheMsetSpy.mock.calls[0][0]
    expect(msetArgs).toHaveLength(3)
    expect(msetArgs[0].key).toContain('redgent:link:link-1')

    // 5. 验证任务最后走到了 TASK_COMPLETE 状态
    const lastEvent = progressEvents.at(-1) as TaskCompleteProgress
    expect(lastEvent.status).toBe(TaskStatus.TASK_COMPLETE)
  })

  it('应该获取链接，过滤掉已缓存的链接，只缓存新链接', async () => {
    // 预先缓存 link1
    await cacheManager.set('redgent:link:link-1', 1)

    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')

    const progressObservable =
      analysisTaskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(
        // tap((data) => console.log(data)),
        toArray(),
      ),
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

    // 4. 验证任务最后走到了 TASK_COMPLETE 状态
    const lastEvent = progressEvents[progressEvents.length - 1]
    expect(lastEvent.status).toBe(TaskStatus.TASK_COMPLETE)
  })

  it('应该在所有获取的链接都已在缓存中时停止执行', async () => {
    // 预先缓存所有链接
    await cacheManager.mset([
      { key: 'redgent:link:link-1', value: 1 },
      { key: 'redgent:link:link-2', value: 1 },
      { key: 'redgent:link:link-3', value: 1 },
    ])

    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')
    jest.spyOn(analysisTaskExecutionService, 'analyze')

    const progressObservable =
      analysisTaskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(
        // tap((data) => console.log(data)),
        toArray(),
      ),
    )

    // 1. 验证最后一个事件是 TASK_CANCEL
    const lastEvent = progressEvents.at(-1) as TaskCancelProgress
    expect(lastEvent.status).toBe(TaskStatus.TASK_CANCEL)

    // 2. 验证 mset 没有被调用
    expect(cacheMsetSpy).not.toHaveBeenCalled()

    // 3. 验证 AI 分析步骤没有被执行
    const analyzeStart = progressEvents.find(
      (p) => p.status === TaskStatus.ANALYZE_START,
    )
    expect(analyzeStart).toBeUndefined()
    expect(analysisTaskExecutionService.analyze).not.toHaveBeenCalled()
  })
})
