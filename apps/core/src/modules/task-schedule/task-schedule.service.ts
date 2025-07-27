import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'

import { ScheduleType, Task, TaskStatus } from '@redgent/db'

import { PrismaService } from '../../processors/prisma/prisma.service'
import { TaskExecutionService } from '../task-execution/task-execution.service'

@Injectable()
export class TaskScheduleService implements OnModuleInit {
  private readonly logger = new Logger(TaskScheduleService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly taskExecutionService: TaskExecutionService,
  ) {}

  /**
   * NestJS 模块初始化时调用的生命周期钩子。
   * 我们在这里启动任务注册流程。
   */
  async onModuleInit() {
    await this.registerTasksFromDb()

    const registeredTasks = this.schedulerRegistry.getCronJobs()
    this.logger.log(`当前注册的 Cron 任务数量: ${registeredTasks.size}`)

    const registeredIntervals = this.schedulerRegistry.getIntervals()
    this.logger.log(
      `当前注册的 Interval 任务数量: ${registeredIntervals.length}`,
    )
  }

  /**
   * 从数据库加载并注册所有激活的任务。
   */
  private async registerTasksFromDb() {
    const tasks = await this.prismaService.task.findMany({
      where: { status: TaskStatus.active },
    })

    const cron = tasks.filter(task => task.scheduleType === ScheduleType.cron)
    const interval = tasks.filter(
      task => task.scheduleType === ScheduleType.interval,
    )
    this.logger.log(
      `从数据库加载 ${tasks.length} 个任务，其中 Cron 任务: ${cron.length}, Interval 任务: ${interval.length}`,
    )

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

    // 确保同一个任务不被重复注册
    this.removeTask(id)

    switch (scheduleType) {
      case ScheduleType.cron:
        this.registerCronTask(id, scheduleExpression, task)
        break

      case ScheduleType.interval:
        this.registerIntervalTask(id, scheduleExpression, task)
        break

      default:
        this.logger.warn(`任务 ${name} 持有不支持的调度类型`)
    }
  }

  /**
   * 注册 CRON 任务
   * @param taskName - 任务名称
   * @param cronExpression - CRON 表达式
   * @param task - 任务对象
   */
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
    } catch (error) {
      this.logger.error(
        `注册 CRON 任务 [${task.name}] 失败，检查 CRON 表达式: ${cronExpression}`,
        error,
      )
    }
  }

  /**
   * 注册 INTERVAL 任务
   * @param taskName - 任务名称
   * @param intervalExpression - INTERVAL 表达式 例如 "5000" 表示每 5 秒执行一次
   * @param task - 任务对象
   */
  private registerIntervalTask(
    taskName: string,
    intervalExpression: string,
    task: Task,
  ) {
    const interval = parseInt(intervalExpression, 10)
    if (isNaN(interval) || interval <= 0) {
      this.logger.error(
        `注册 INTERVAL 任务 [${task.name}] 失败，检查 INTERVAL 表达式: ${intervalExpression}`,
      )
      return
    }

    const intervalId = setInterval(() => {
      this.executeTask(task)
    }, interval)

    this.schedulerRegistry.addInterval(taskName, intervalId)
  }

  /**
   * 任务执行
   * @param task - The task to execute.
   */
  private executeTask(task: Task) {
    this.logger.log(`Executing task: "${task.name}" (ID: ${task.id})`)
    this.taskExecutionService.execute(task).subscribe({
      next: progress => {
        this.logger.log(
          `Task "${task.name}" (ID: ${task.id}) execution progress:`,
          JSON.stringify(progress, null, 2),
        )
      },
      error: error => {
        this.logger.error(
          `Task "${task.name}" (ID: ${task.id}) execution failed:`,
          error,
        )
      },
      complete: () => {
        this.logger.log(
          `Task "${task.name}" (ID: ${task.id}) execution completed`,
        )
      },
    })
  }

  /**
   * 从调度器中移除任务（用于更新或删除）
   * @param taskName - The unique name of the task in the registry.
   */
  removeTask(taskName: string) {
    try {
      if (this.schedulerRegistry.doesExist('cron', taskName)) {
        this.schedulerRegistry.deleteCronJob(taskName)
      }
      if (this.schedulerRegistry.doesExist('interval', taskName)) {
        this.schedulerRegistry.deleteInterval(taskName)
      }
    } catch (e) {
      this.logger.warn(`无法移除任务 ${taskName}，可能不存在或已被删除`, e)
    }
  }
}
