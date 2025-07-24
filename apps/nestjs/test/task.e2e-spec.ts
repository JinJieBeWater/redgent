import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { lastValueFrom, tap, toArray } from 'rxjs'
import { App } from 'supertest/types'

import { PrismaClient } from '@redgent/db'
import { TaskProgress, TaskProgressStatus } from '@redgent/types'

import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { TaskExecutionService } from '../src/task-execution/task-execution.service'
import { createMockTaskConfig } from './data-factory'

const mockTaskConfig = createMockTaskConfig({
  id: 'task-1',
  name: '监测 ReactJs 动态',
  prompt: '帮我每天6点监测一次有关 ReactJs 生态圈的动态',
  keywords: ['reactjs', 'react'],
  subreddits: ['react', 'reactjs'],
})

describe('analysis-task (e2e)', () => {
  let app: INestApplication<App>
  let analysisTaskExecutionService: TaskExecutionService
  let prismaService: PrismaClient

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    analysisTaskExecutionService = moduleFixture.get(TaskExecutionService)
    prismaService = moduleFixture.get(PrismaService)
    await app.init()

    // 确保测试任务不存在
    const existingTask = await prismaService.task.findUnique({
      where: {
        id: mockTaskConfig.id,
      },
    })
    if (!existingTask) {
      await prismaService.task.create({
        data: mockTaskConfig,
      })
    }
  })

  afterAll(async () => {
    await app.close()
  })

  describe('execute', () => {
    it('应该正常完成 Reddit 抓取到 AI 分析的整个流程', async () => {
      // 由于 Reddit 的数据是动态的，当前无法实现 AI-SDK 模拟 只能 mock
      jest
        .spyOn(analysisTaskExecutionService, 'selectMostRelevantLinks')
        .mockImplementation(async (_, links) => {
          return links.slice(0, 10).map(link => link.id)
        })

      const progressObservable =
        analysisTaskExecutionService.execute(mockTaskConfig)

      const progressEvents = await lastValueFrom<TaskProgress[]>(
        progressObservable.pipe(tap(console.log), toArray()),
      )

      const finalEvent = progressEvents[progressEvents.length - 1]

      expect([
        TaskProgressStatus.TASK_COMPLETE,
        TaskProgressStatus.TASK_CANCEL,
      ]).toContain(finalEvent.status)

      if (finalEvent.status === TaskProgressStatus.TASK_COMPLETE) {
        expect(finalEvent.message).toBe('任务成功执行完毕')
      }
    }, 30000)
  })
})
