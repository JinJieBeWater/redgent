# 任务调度模块设计文档

## 1. 目标

实现一个动态任务调度系统。该系统在 NestJS 应用启动时，从数据库中加载所有状态为“激活”的任务，并根据其定义的调度规则（CRON 表达式、时间间隔等）注册到任务调度器中。初期，任务的具体执行逻辑可以简化为日志打印。

## 2. 核心依赖分析

我们将利用 NestJS 官方提供的 `@nestjs/schedule` 包来处理任务调度。这个包底层封装了 `node-cron`，功能强大且与 NestJS 生态无缝集成。它允许我们动态地添加、删除和管理定时任务。

- **核心组件**: `SchedulerRegistry`
- **功能**: 动态注册和管理 Cron Jobs, Intervals, 和 Timeouts。这是实现我们需求的关键。

## 3. 数据模型 (Prisma)

为了支持灵活的调度模式，我建议在 `prisma/schema.prisma` 中更新 `Task` 模型，结构如下：

```prisma
// In prisma/schema.prisma

model Task {
  id                 String        @id @default(cuid())
  name               String        // 任务名称
  description        String?       // 任务描述

  // --- 调度相关字段 ---
  scheduleType       ScheduleType  // 调度类型 (CRON, INTERVAL)
  scheduleExpression String        // 调度表达式 (例如: "*/5 * * * * *" 或 "300000")
  status             TaskStatus    @default(INACTIVE) // 任务状态 (ACTIVE, INACTIVE)

  // --- 执行相关字段 ---
  payload            Json?         // 任务执行时需要的上下文数据

  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}

// 调度类型枚举
enum ScheduleType {
  CRON      // 基于 CRON 表达式
  INTERVAL  // 基于时间间隔 (毫秒)
}

// 任务状态枚举
enum TaskStatus {
  ACTIVE    // 激活状态，需要被调度
  INACTIVE  // 非激活状态，忽略
}
```

**操作**:

1. 更新 `schema.prisma` 文件。
2. 执行 `pnpm prisma migrate dev --name update-task-for-scheduling` 来应用数据库变更。

## 4. 实现步骤

### 步骤 1: 安装并配置 `@nestjs/schedule`

1.  **安装依赖**:

    ```bash
    pnpm --filter nestjs add @nestjs/schedule
    ```

2.  **导入模块**: 在 `apps/nestjs/src/app.module.ts` 中导入 `ScheduleModule`。

    ```typescript
    // apps/nestjs/src/app.module.ts
    import { Module } from '@nestjs/common'
    import { ScheduleModule } from '@nestjs/schedule'

    // ... other imports

    @Module({
      imports: [
        ScheduleModule.forRoot(),
        // ... other modules
      ],
      // ...
    })
    export class AppModule {}
    ```

### 步骤 2: 实现 `TaskService` 的动态注册逻辑

`TaskService` 将在模块初始化时（`onModuleInit`）从数据库加载并注册任务。

```typescript
// apps/nestjs/src/task/task.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { ScheduleType, Task, TaskStatus } from '@prisma/client'
import { CronJob } from 'cron'

import { PrismaService } from '../prisma/prisma.service' // 假设 PrismaService 的路径

@Injectable()
export class TaskService implements OnModuleInit {
  private readonly logger = new Logger(TaskService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * NestJS 模块初始化时调用的生命周期钩子。
   * 我们在这里启动任务注册流程。
   */
  async onModuleInit() {
    this.logger.log('Initializing task scheduling...')
    await this.registerTasksFromDb()
  }

  /**
   * 从数据库加载并注册所有激活的任务。
   */
  async registerTasksFromDb() {
    this.logger.log('Fetching active tasks from the database.')
    const tasks = await this.prisma.task.findMany({
      where: { status: TaskStatus.ACTIVE },
    })

    this.logger.log(`Found ${tasks.length} active tasks to register.`)
    for (const task of tasks) {
      this.registerTask(task)
    }
  }

  /**
   * 注册单个任务到调度器。
   * 这是功能的核心，处理不同的调度类型。
   * @param task - The task object from the database.
   */
  registerTask(task: Task) {
    const { id, name, scheduleType, scheduleExpression } = task
    const taskName = `${scheduleType.toLowerCase()}:${name}:${id}`

    // 确保同一个任务不被重复注册
    this.removeTask(taskName)

    switch (scheduleType) {
      case ScheduleType.CRON:
        this.registerCronTask(taskName, scheduleExpression, task)
        break

      case ScheduleType.INTERVAL:
        this.registerIntervalTask(taskName, scheduleExpression, task)
        break

      default:
        this.logger.warn(
          `Unsupported schedule type: ${scheduleType} for task ${name}`,
        )
    }
  }

  private registerCronTask(
    taskName: string,
    cronExpression: string,
    task: Task,
  ) {
    try {
      const job = new CronJob(cronExpression, () => {
        this.executeTask(task)
      })

      this.schedulerRegistry.addCronJob(taskName, job)
      job.start()

      this.logger.log(
        `Task [${task.name}] registered with CRON expression: ${cronExpression}`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to register CRON task [${task.name}]. Invalid CRON expression: ${cronExpression}`,
        error.stack,
      )
    }
  }

  private registerIntervalTask(
    taskName: string,
    intervalExpression: string,
    task: Task,
  ) {
    const interval = parseInt(intervalExpression, 10)
    if (isNaN(interval) || interval <= 0) {
      this.logger.error(
        `Failed to register INTERVAL task [${task.name}]. Invalid interval: ${intervalExpression}`,
      )
      return
    }

    const intervalId = setInterval(() => {
      this.executeTask(task)
    }, interval)

    this.schedulerRegistry.addInterval(taskName, intervalId)
    this.logger.log(
      `Task [${task.name}] registered with INTERVAL: ${interval}ms`,
    )
  }

  /**
   * 模拟任务执行
   * @param task - The task to execute.
   */
  private executeTask(task: Task) {
    this.logger.log(`Executing task: "${task.name}" (ID: ${task.id})`)
    // TODO: 在这里实现具体的任务执行逻辑
    // 例如: 调用 Reddit API, 进行数据分析等
  }

  /**
   * 从调度器中移除任务（用于更新或删除）
   * @param taskName - The unique name of the task in the registry.
   */
  removeTask(taskName: string) {
    // 统一处理，无需关心是 cron 还是 interval
    try {
      if (this.schedulerRegistry.doesExist('cron', taskName)) {
        this.schedulerRegistry.deleteCronJob(taskName)
        this.logger.log(`Removed existing CRON job: ${taskName}`)
      }
      if (this.schedulerRegistry.doesExist('interval', taskName)) {
        this.schedulerRegistry.deleteInterval(taskName)
        this.logger.log(`Removed existing INTERVAL job: ${taskName}`)
      }
    } catch (e) {
      // 忽略找不到任务的错误
    }
  }
}
```

## 5. 未来扩展

- **任务管理 API**: 创建 `TaskController` 提供 RESTful API 用于动态地添加、更新、删除和触发任务。更新任务时，只需调用 `registerTask` 即可实现先移除旧调度再注册新调度的原子操作。
- **错误处理与重试**: 为任务执行逻辑增加健壮的错误处理和自动重试机制。
- **分布式锁**: 在多实例部署场景下，需要引入分布式锁（如基于 Redis）来确保任务不会被重复执行。
