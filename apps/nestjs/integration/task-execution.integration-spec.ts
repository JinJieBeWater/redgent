import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Cache } from 'cache-manager'
import { lastValueFrom, toArray } from 'rxjs'

import {
  TaskCancelProgress,
  TaskCompleteProgress,
  TaskProgressStatus,
} from '@redgent/shared'

import { createMockContext } from '../src/prisma/context'
import { PrismaService } from '../src/prisma/prisma.service'
import { RedditService } from '../src/reddit/reddit.service'
import { ReportService } from '../src/report/report.service'
import { TaskExecutionService } from '../src/task-execution/task-execution.service'
import {
  createMockLinks,
  createMockLinkWithComments,
  createMockTaskConfig,
} from '../test/data-factory'

// 使用 data-factory 创建测试数据
const mockRedditLinks = createMockLinks(3, 'test')
const mockTaskConfig = createMockTaskConfig()
// 为集成测试创建匹配的完整链接数据
const mockCompleteLinkData = mockRedditLinks.map(link =>
  createMockLinkWithComments(link.id),
)

describe(TaskExecutionService.name, () => {
  let app: INestApplication
  let taskExecutionService: TaskExecutionService
  let cacheManager: Cache

  beforeEach(async () => {
    const mockRedditServiceProvider = {
      provide: RedditService,
      useValue: {
        getHotLinksByQueriesAndSubreddits: jest
          .fn()
          .mockResolvedValue(mockRedditLinks),
        getCommentsByLinkIds: jest.fn().mockImplementation((ids: string[]) => {
          return Promise.resolve(
            mockCompleteLinkData.filter(data => ids.includes(data.content.id)),
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
        TaskExecutionService,
        ReportService,
        mockRedditServiceProvider,
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    taskExecutionService =
      moduleFixture.get<TaskExecutionService>(TaskExecutionService)
    cacheManager = moduleFixture.get<Cache>(CACHE_MANAGER)

    // 确保每个测试开始前缓存是干净的
    await cacheManager.clear()
  })

  afterEach(async () => {
    await app.close()
  })

  it('应该获取链接，不过滤（全部为新链接），并缓存它们', async () => {
    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')

    const progressObservable = taskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(
        // tap((data) => console.log(data)),
        toArray(),
      ),
    )

    // 1. 验证过滤状态和结果
    const filterStart = progressEvents.find(
      p => p.status === TaskProgressStatus.FILTER_START,
    )
    const filterComplete = progressEvents.find(
      p => p.status === TaskProgressStatus.FILTER_COMPLETE,
    )!
    expect(filterStart).toBeDefined()
    expect(filterComplete).toBeDefined()
    expect(filterComplete.data.uniqueCount).toBe(3)
    expect(filterComplete.data.originalCount).toBe(3)

    // 2. 验证 cacheManager.mset 被调用，并且缓存了所有 3 个链接
    expect(cacheMsetSpy).toHaveBeenCalledTimes(1)
    const msetArgs = cacheMsetSpy.mock.calls[0][0]
    expect(msetArgs).toHaveLength(3)
    // 验证缓存键名包含第一个链接的ID
    expect(msetArgs[0].key).toContain(`redgent:link:${mockRedditLinks[0].id}`)

    // 5. 验证任务最后走到了 TASK_COMPLETE 状态
    const lastEvent = progressEvents.at(-1) as TaskCompleteProgress
    expect(lastEvent.status).toBe(TaskProgressStatus.TASK_COMPLETE)
  })

  it('应该获取链接，过滤掉已缓存的链接，只缓存新链接', async () => {
    // 预先缓存第一个链接
    await cacheManager.set(`redgent:link:${mockRedditLinks[0].id}`, 1)

    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')

    const progressObservable = taskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(
        // tap((data) => console.log(data)),
        toArray(),
      ),
    )

    // 1. 验证过滤结果
    const filterComplete = progressEvents.find(
      p => p.status === TaskProgressStatus.FILTER_COMPLETE,
    )!
    expect(filterComplete).toBeDefined()
    expect(filterComplete.data.uniqueCount).toBe(2)
    expect(filterComplete.data.originalCount).toBe(3)

    // 2. 验证 cacheManager.mset 只为新链接调用
    expect(cacheMsetSpy).toHaveBeenCalledTimes(1)
    const msetArgs = cacheMsetSpy.mock.calls[0][0]
    expect(msetArgs).toHaveLength(2)
    expect(msetArgs[0].key).toContain(`redgent:link:${mockRedditLinks[1].id}`)
    expect(msetArgs[1].key).toContain(`redgent:link:${mockRedditLinks[2].id}`)

    // 3. 验证 AI 分析的是过滤后的链接
    const analyzeStart = progressEvents.find(
      p => p.status === TaskProgressStatus.ANALYZE_START,
    )!
    expect(analyzeStart.data.count).toBe(2)

    // 4. 验证任务最后走到了 TASK_COMPLETE 状态
    const lastEvent = progressEvents[progressEvents.length - 1]
    expect(lastEvent.status).toBe(TaskProgressStatus.TASK_COMPLETE)
  })

  it('应该在所有获取的链接都已在缓存中时停止执行', async () => {
    // 预先缓存所有链接
    await cacheManager.mset([
      { key: `redgent:link:${mockRedditLinks[0].id}`, value: 1 },
      { key: `redgent:link:${mockRedditLinks[1].id}`, value: 1 },
      { key: `redgent:link:${mockRedditLinks[2].id}`, value: 1 },
    ])

    const cacheMsetSpy = jest.spyOn(cacheManager, 'mset')

    const progressObservable = taskExecutionService.execute(mockTaskConfig)
    const progressEvents = await lastValueFrom(
      progressObservable.pipe(
        // tap((data) => console.log(data)),
        toArray(),
      ),
    )

    // 1. 验证最后一个事件是 TASK_CANCEL
    const lastEvent = progressEvents.at(-1) as TaskCancelProgress
    expect(lastEvent.status).toBe(TaskProgressStatus.TASK_CANCEL)

    // 2. 验证 mset 没有被调用
    expect(cacheMsetSpy).not.toHaveBeenCalled()

    // 3. 验证 AI 分析步骤没有被执行
    const analyzeStart = progressEvents.find(
      p => p.status === TaskProgressStatus.ANALYZE_START,
    )
    expect(analyzeStart).toBeUndefined()
  })
})
