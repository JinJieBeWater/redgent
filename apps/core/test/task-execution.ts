import { NestFactory } from '@nestjs/core'
import { lastValueFrom, tap } from 'rxjs'

import { Task } from '@redgent/db'

import { AppModule } from '../src/app.module'
import { TaskExecutionService } from '../src/modules/task-execution/task-execution.service'
import { PrismaService } from '../src/processors/prisma/prisma.service'
import { createMockTaskConfig } from './data-factory'

/**
 * 该脚本用于在真实环境中评估和调试 `selectMostRelevantLinks` 方法的 AI 提示词。
 * 它会加载 NestJS 应用，获取服务实例，并调用该方法，
 * 然后将 AI 的真实输出打印到控制台，以便进行人工评估。
 *
 * 使用方法：
 *  pnpm dlx ts-node src\ai-sdk\prompt-evaluation\task-execution.ts
 */
async function evaluateTaskExecutionPrompt() {
  // 创建一个独立的 NestJS 应用上下文
  const app = await NestFactory.createApplicationContext(AppModule)

  // 从容器中获取服务实例
  const executionService = app.get(TaskExecutionService)
  const prismaService = app.get(PrismaService)
  console.log('🚀 服务已加载，开始准备测试数据...')

  // 准备用于测试的模拟数据
  const mockTaskConfig: Task = createMockTaskConfig()

  let taskConfig = await prismaService.task.findUnique({
    where: {
      id: mockTaskConfig.id,
    },
  })
  if (taskConfig) {
    console.log('🚨 测试任务已存在，请先删除后重试')
    return
  } else {
    // 插入任务
    taskConfig = await prismaService.task.create({
      data: mockTaskConfig,
    })
  }

  try {
    await lastValueFrom(
      executionService.executeObservable(taskConfig).pipe(
        tap({
          next: progress => {
            console.log(`🔄 任务进度: ${JSON.stringify(progress, null, 2)}`)
          },
          error: err => {
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
    await prismaService.task.delete({
      where: {
        id: taskConfig.id,
      },
    })
    await app.close()
    console.log('\n👋 评估脚本执行完毕。')
  }
}

// 运行评估函数
evaluateTaskExecutionPrompt().catch(error => {
  console.error('❌ 评估脚本执行出错:', error)
  process.exit(1)
})
