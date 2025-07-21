import { NestFactory } from '@nestjs/core'
import { lastValueFrom, tap } from 'rxjs'

import { TaskConfig } from '@redgent/types/analysis-task'

import { AnalysisTaskExecutionService } from '../../analysis-task/analysis-task-execution.service'
import { AppModule } from '../../app.module'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * 该脚本用于在真实环境中评估和调试 `selectMostRelevantLinks` 方法的 AI 提示词。
 * 它会加载 NestJS 应用，获取服务实例，并调用该方法，
 * 然后将 AI 的真实输出打印到控制台，以便进行人工评估。
 *
 * 使用方法：
 *  npx ts-node src\ai-sdk\prompt-evaluation\task-execution.ts
 */
async function evaluateTaskExecutionPrompt() {
  // 1. 创建一个独立的 NestJS 应用上下文
  const app = await NestFactory.createApplicationContext(AppModule)

  // 2. 从容器中获取服务实例
  const executionService = app.get(AnalysisTaskExecutionService)
  const prismaService = app.get(PrismaService)
  console.log('🚀 服务已加载，开始准备测试数据...')

  // 3. 准备用于测试的模拟数据
  // 您可以修改这里的 prompt 和 links 来测试不同的场景
  const mockTaskConfig: TaskConfig = {
    id: 'task-1',
    name: 'React 生态',
    cron: '0 0 * * *',
    prompt: '每天早上6点抓取reactjs生态圈的最新动态',
    keywords: ['react', 'reactjs'],
    subreddits: ['react', 'reactjs'],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    enableFiltering: true,
  }
  // 插入任务
  const taskConfig = await prismaService.analysisTask.create({
    data: mockTaskConfig,
  })

  try {
    await lastValueFrom(
      executionService.execute(taskConfig).pipe(
        tap({
          next: (progress) => {
            console.log(`🔄 任务进度: ${progress.status} - ${progress.message}`)
          },
          error: (err) => {
            console.error('❌ 任务执行出错:', err)
          },
          complete: () => {
            console.log('✅ 任务执行完成')
          },
        }),
      ),
    )
  } catch (error) {
    console.error('❌ 执行过程中发生错误:', error)
  } finally {
    await prismaService.analysisTask.delete({
      where: {
        id: taskConfig.id,
      },
    })
    await app.close()
    console.log('\n👋 评估脚本执行完毕。')
  }
}

// 运行评估函数
evaluateTaskExecutionPrompt()
