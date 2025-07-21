import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaClient } from '@prisma/client'
import { lastValueFrom, tap, toArray } from 'rxjs'
import { App } from 'supertest/types'

import { AnalysisReportContent } from '@redgent/types/analysis-report'
import { TaskConfig, TaskStatus } from '@redgent/types/analysis-task'

import { AnalysisTaskExecutionService } from '../src/analysis-task/analysis-task-execution.service'
import { PrismaService } from '../src/prisma/prisma.service'
import { AppModule } from './../src/app.module'

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

    // 确保测试任务不存在
    await prismaService.analysisTask.delete({
      where: {
        id: mockTaskConfig.id,
      },
    })
    await prismaService.analysisTask.create({
      data: mockTaskConfig,
    })
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
          return links.slice(0, 10).map((link) => link.id)
        })
      jest
        .spyOn(analysisTaskExecutionService, 'analyze')
        .mockImplementation(async () => mockAnalysisReport)

      const progressObservable =
        analysisTaskExecutionService.execute(mockTaskConfig)

      const progressEvents = await lastValueFrom(
        progressObservable.pipe(tap(console.log), toArray()),
      )

      const finalEvent = progressEvents[progressEvents.length - 1]

      expect([TaskStatus.TASK_COMPLETE, TaskStatus.TASK_CANCEL]).toContain(
        finalEvent.status,
      )

      if (finalEvent.status === TaskStatus.TASK_COMPLETE) {
        expect(finalEvent.message).toBe('任务成功执行完毕')
      }
    }, 30000)
  })
})
