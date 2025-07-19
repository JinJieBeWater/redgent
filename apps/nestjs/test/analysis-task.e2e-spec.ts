import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { AnalysisTaskExecutionService } from '../src/analysis-task/analysis-task-execution.service'
import { lastValueFrom, tap, toArray } from 'rxjs'
import { TaskConfig, TaskStatus } from '@redgent/types/analysis-task'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from '../src/prisma/prisma.service'

describe('analysis-task (e2e)', () => {
  let app: INestApplication<App>
  let analysisTaskExecutionService: AnalysisTaskExecutionService
  let prismaService: PrismaClient

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    analysisTaskExecutionService = moduleFixture.get(
      AnalysisTaskExecutionService,
    )
    prismaService = moduleFixture.get(PrismaService)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('execute', () => {
    const mockTaskConfig: TaskConfig = {
      id: 'task-1',
      name: '监测 ReactJs 动态',
      cron: '0 0 * * *',
      prompt: '帮我每天6点监测一次有关 ReactJs 生态圈的动态',
      keywords: ['reactjs', 'react'],
      subreddits: ['react', 'reactjs'],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      enableFiltering: true,
      llmModel: 'test-model',
    }
    it('应该正常完成 Reddit 抓取到 AI 分析的整个流程', async () => {
      const task = await prismaService.analysisTask.create({
        data: mockTaskConfig,
      })

      const progressObservable = analysisTaskExecutionService.execute(task)

      const progressEvents = await lastValueFrom(
        progressObservable.pipe(
          tap((progress) => {
            console.log('Progress:', JSON.stringify(progress, null, 2))
          }),
          toArray(),
        ),
      )

      const finalEvent = progressEvents[progressEvents.length - 1]

      expect([TaskStatus.TASK_COMPLETE, TaskStatus.TASK_CANCEL]).toContain(
        finalEvent.status,
      )

      if (finalEvent.status === TaskStatus.TASK_COMPLETE) {
        expect(finalEvent.message).toBe('任务成功执行完毕')
      }

      await prismaService.analysisTask.delete({
        where: {
          id: task.id,
        },
      })
    }, 30000)
  })
})
