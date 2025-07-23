import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { ScheduleType, Task, TaskStatus } from '@prisma/client'
import { CronJob } from 'cron'
import z from 'zod'

import { PrismaService } from '../prisma/prisma.service'

export const createTaskSchema = z.object({
  name: z.string().describe('简短任务名称'),
  prompt: z.string().describe('用户原封不动的输入'),
  keywords: z.array(z.string()).describe('关键词列表'),
  subreddits: z.array(z.string()).describe('Reddit 子版块列表'),
  scheduleType: z.enum(ScheduleType).describe('定时类型'),
  scheduleExpression: z.string().describe('Cron表达式或间隔时间'),
  status: z.enum([TaskStatus.active, TaskStatus.paused]).describe('任务状态'),
  enableFiltering: z
    .boolean()
    .describe('是否启用过滤，3天内处理过的帖子不再处理'),
})

@Injectable()
export class TaskScheduleService implements OnModuleInit {
  private readonly logger = new Logger(TaskScheduleService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
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
  private registerTask(task: Task) {
    const { id, name, scheduleType, scheduleExpression } = task
    const taskName = `${scheduleType.toLowerCase()}:${name}:${id}`

    // 确保同一个任务不被重复注册
    this.removeTask(taskName)

    switch (scheduleType) {
      case ScheduleType.cron:
        this.registerCronTask(taskName, scheduleExpression, task)
        break

      case ScheduleType.interval:
        this.registerIntervalTask(taskName, scheduleExpression, task)
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
  private removeTask(taskName: string) {
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

  async listAll() {
    const tasks = await this.prismaService.task.findMany()
    return tasks
  }

  async createTask(task: z.infer<typeof createTaskSchema>) {
    const createdTask = await this.prismaService.task.create({
      data: task,
    })
    this.registerTask(createdTask)
    return createdTask
  }

  async updateTask(
    task: Partial<z.infer<typeof createTaskSchema>> & Pick<Task, 'id'>,
  ) {
    const updatedTask = await this.prismaService.task.update({
      where: { id: task.id },
      data: task,
    })
    this.removeTask(`${task.scheduleType}:${task.name}:${task.id}`)
    if (task.status !== TaskStatus.paused) {
      this.registerTask(updatedTask)
    }
    return updatedTask
  }
}
