import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'

import { ScheduleType, Task, TaskStatus } from '@redgent/db/client'
import { formatIntervalTime } from '@redgent/shared'

import { PrismaService } from '../../processors/prisma/prisma.service'
import { TaskExecutionService } from '../task-execution/task-execution.service'

/**
 * Interval任务状态接口
 * 用于跟踪每个interval任务的执行状态和时间计算
 */
interface IntervalTaskState {
  /** 正常执行间隔（毫秒） */
  normalInterval: number
  /** 下次预期执行时间 */
  nextExecutionTime?: Date
  /** 是否为初始校准阶段 */
  isCalibrating: boolean
}

@Injectable()
export class TaskScheduleService implements OnModuleInit {
  private readonly logger = new Logger(TaskScheduleService.name)

  /**
   * Interval任务状态管理Map
   * Key: 任务ID, Value: 任务状态信息
   */
  private readonly intervalTaskStates = new Map<string, IntervalTaskState>()

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
    // 查询cron 和 interval 任务的概览
    const cronTasks = this.schedulerRegistry.getCronJobs()
    const intervalTasks = this.schedulerRegistry.getIntervals()
    this.logger.log(`CRON 任务概览: ${cronTasks.size} 个`)
    this.logger.log(`INTERVAL 任务概览: ${intervalTasks.length} 个`)
    // 打印 IntervalTaskState
    this.intervalTaskStates.forEach((value, key) => {
      this.logger.log(`INTERVAL 任务: ${key}`)
      this.logger.log(`执行频率: ${formatIntervalTime(value.normalInterval)}`)
      this.logger.log(`是否正在校准: ${value.isCalibrating}`)
      this.logger.log(
        `下次执行时间: ${value.nextExecutionTime?.toLocaleString()}`,
      )
    })
  }

  /**
   * 从数据库加载并注册所有激活的任务。
   */
  private async registerTasksFromDb() {
    const tasks = await this.prismaService.task.findMany({
      where: { status: TaskStatus.active },
    })

    await Promise.all(tasks.map(task => this.registerTask(task)))
  }

  /**
   * 注册单个任务到调度器。
   * 这是功能的核心，处理不同的调度类型。
   * @param task - The task object from the database.
   */
  async registerTask(task: Task) {
    const { id, name, scheduleType, scheduleExpression } = task

    // 确保同一个任务不被重复注册
    this.removeTask(id)

    switch (scheduleType) {
      case ScheduleType.cron:
        this.registerCronTask(id, scheduleExpression, task)
        break

      case ScheduleType.interval:
        await this.registerIntervalTask(id, scheduleExpression, task)
        break

      default:
        this.logger.warn(`任务 ${name} 持有不支持的调度类型`)
    }
  }

  /**
   * 注册 CRON 任务
   * @param id - 任务名称
   * @param cronExpression - CRON 表达式
   * @param task - 任务对象
   */
  private registerCronTask(id: string, cronExpression: string, task: Task) {
    try {
      const job = new CronJob(cronExpression, () => {
        this.executeTask(task)
      })

      this.schedulerRegistry.addCronJob(id, job)
      job.start()
    } catch (error) {
      this.logger.error(
        `注册 CRON 任务 [${task.name}] 失败，检查 CRON 表达式: ${cronExpression}`,
        error,
      )
    }
  }

  /**
   * 注册 INTERVAL 任务（带校准功能）
   * 检查最新报告时间，计算是否过期，决定立即执行还是延迟执行
   * @param id - 任务名称
   * @param intervalExpression - INTERVAL 表达式 例如 "5000" 表示每 5 秒执行一次
   * @param task - 任务对象
   */
  private async registerIntervalTask(
    id: string,
    intervalExpression: string,
    task: Task,
  ) {
    const intervalMs = parseInt(intervalExpression, 10)
    if (isNaN(intervalMs) || intervalMs <= 0) {
      this.logger.error(
        `注册 INTERVAL 任务 [${task.name}] 失败，检查 INTERVAL 表达式: ${intervalExpression}`,
      )
      return
    }

    // 查询最新报告时间
    const latestReport = await this.prismaService.taskReport.findFirst({
      where: { taskId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    const now = new Date()
    let shouldExecuteImmediately = false
    let initialDelayMs = intervalMs
    let isCalibrating = false

    if (latestReport) {
      const timeSinceLastReport =
        now.getTime() - latestReport.createdAt.getTime()

      if (timeSinceLastReport >= intervalMs) {
        // 已过期，立即执行
        shouldExecuteImmediately = true
      } else {
        // 未过期，计算剩余时间
        initialDelayMs = intervalMs - timeSinceLastReport
        isCalibrating = true
      }
    } else {
      // 没有历史报告，立即执行
      shouldExecuteImmediately = true
    }

    // 初始化任务状态
    const taskState: IntervalTaskState = {
      normalInterval: intervalMs,
      isCalibrating,
    }
    this.intervalTaskStates.set(id, taskState)

    if (shouldExecuteImmediately) {
      this.executeTask(task)
    }

    // 根据任务状态进行校准
    this.calibrateIntervalTask(id, initialDelayMs, task)
  }

  /**
   * 创建间隔任务并附加校准
   * @param id 任务ID
   * @param intervalMs 间隔毫秒数
   * @param task 任务对象
   * @param isCalibrating 是否为校准阶段
   */
  private calibrateIntervalTask(id: string, intervalMs: number, task: Task) {
    const taskState = this.intervalTaskStates.get(id)
    if (!taskState) {
      this.logger.error(`任务状态不存在: ${id}`)
      return
    }

    // 创建间隔任务
    const intervalId = setInterval(() => {
      this.executeTask(task)

      // 如果是校准阶段，执行后切换到正常间隔
      if (taskState.isCalibrating) {
        taskState.isCalibrating = false

        // 清除当前间隔，重新设置正常间隔
        this.schedulerRegistry.deleteInterval(id)
        this.calibrateIntervalTask(id, taskState.normalInterval, task)
      }

      // 更新下次执行时间
      taskState.nextExecutionTime = new Date(
        Date.now() + taskState.normalInterval,
      )
    }, intervalMs)

    // 注册到 SchedulerRegistry
    this.schedulerRegistry.addInterval(id, intervalId)

    // 更新任务状态
    taskState.nextExecutionTime = new Date(Date.now() + intervalMs)
  }

  /**
   * 任务执行
   * @param task - The task to execute.
   */
  private executeTask(task: Task) {
    this.logger.log(`Executing task: "${task.name}" (ID: ${task.id})`)
    this.taskExecutionService.executeObservable(task).subscribe({
      error: error => {
        this.logger.error(
          `Task execution failed: "${task.name}" (ID: ${task.id})`,
          error,
        )
      },
    })
  }
  /**
   * 从调度器中移除任务（用于更新或删除）
   * @param id - The unique name of the task in the registry.
   */
  removeTask(id: string) {
    try {
      if (this.schedulerRegistry.doesExist('cron', id)) {
        this.schedulerRegistry.deleteCronJob(id)
      }
      if (this.schedulerRegistry.doesExist('interval', id)) {
        this.schedulerRegistry.deleteInterval(id)
        // 清理interval任务状态
        if (this.intervalTaskStates.has(id)) {
          this.intervalTaskStates.delete(id)
        }
      }
    } catch (e) {
      this.logger.warn(`无法移除任务 ${id}`, e)
    }
  }

  /**
   * 根据任务ID获取任务下次执行时间
   * @param id - 任务ID
   * @returns 任务下次执行时间
   */
  getNextExecutionTime(id: string) {
    if (this.schedulerRegistry.doesExist('cron', id)) {
      const job = this.schedulerRegistry.getCronJob(id)
      return job?.nextDate().toJSDate()
    } else if (this.schedulerRegistry.doesExist('interval', id)) {
      const taskState = this.intervalTaskStates.get(id)
      if (taskState) {
        return taskState.nextExecutionTime
      }
    }

    return
  }
}
