import { Injectable, Logger } from '@nestjs/common'
import { tool, UIDataTypes, UIMessage, UIMessageStreamWriter } from 'ai'
import { lastValueFrom, pipe, tap, toArray } from 'rxjs'
import z from 'zod'

import { TaskStatus } from '@redgent/db'
import { createTaskSchema, TaskProgressStatus } from '@redgent/shared'

import { PrismaService } from '../../processors/prisma/prisma.service'
import { TaskExecutionService } from '../task-execution/task-execution.service'
import { TaskScheduleService } from '../task-schedule/task-schedule.service'

@Injectable()
export class TaskAgentService {
  private readonly logger = new Logger(TaskAgentService.name)
  constructor(
    private readonly taskScheduleService: TaskScheduleService,
    private readonly prismaService: PrismaService,
    private readonly taskExecutionService: TaskExecutionService,
  ) {}
  readonly tools = (
    writer: UIMessageStreamWriter<UIMessage<unknown, UIDataTypes>>,
  ) => ({
    GetAllTasks: tool({
      description: '列出所有Reddit抓取任务',
      inputSchema: z.object({
        status: z
          .enum({
            ...TaskStatus,
            all: 'all',
          })
          .default(TaskStatus.active)
          .describe('任务状态'),
      }),
      execute: async ({ status }) => {
        try {
          this.logger.debug('listAllTasks 工具被调用')
          const tasks = await this.prismaService.task.findMany({
            select: {
              id: true,
              name: true,
              status: true,
            },
            where: status === 'all' ? undefined : { status },
          })
          return {
            data: tasks,
            message: '任务列表获取成功',
          }
        } catch (error) {
          this.logger.error(error)
          throw error
        }
      },
    }),

    GetTaskDetail: tool({
      description: '获取一个任务的详细信息',
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
      }),
      execute: async input => {
        try {
          this.logger.debug('getTaskDetail 工具被调用')
          const task = await this.prismaService.task.findUnique({
            where: { id: input.taskId },
          })
          return {
            data: task,
            message: '任务详情获取成功',
          }
        } catch (error) {
          this.logger.error(error)
          throw error
        }
      },
    }),

    CreateTask: tool({
      description: '创建一个Reddit抓取任务',
      inputSchema: createTaskSchema,
      execute: async input => {
        try {
          this.logger.debug('createTask 工具被调用')
          const task = await this.prismaService.task.create({
            data: input,
          })
          this.taskScheduleService.registerTask(task)
          return {
            data: task,
            message: '任务创建成功',
          }
        } catch (error) {
          this.logger.error(error instanceof Error ? error.message : error)
          throw error
        }
      },
    }),

    UpdateTask: tool({
      description: '修改 Reddit 抓取任务配置',
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
        data: createTaskSchema.partial().describe('输入需要修改的配置'),
      }),
      execute: async input => {
        try {
          this.logger.debug('updateTask 工具被调用')
          const task = await this.prismaService.task.update({
            where: { id: input.taskId },
            data: input.data,
          })
          this.taskScheduleService.registerTask(task)
          return {
            data: task,
            message: '任务更新成功',
          }
        } catch (error) {
          this.logger.error(error)
          throw error
        }
      },
    }),

    DeleteTask: tool({
      description: '删除任务',
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
      }),
      execute: async input => {
        try {
          this.logger.debug('deleteTask 工具被调用')
          await this.prismaService.task.delete({
            where: { id: input.taskId },
          })
          return {
            message: '任务删除成功',
          }
        } catch (error) {
          this.logger.error(error)
          throw error
        }
      },
    }),

    ImmediatelyExecuteTask: tool({
      description: '立即执行一次任务',
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
      }),
      execute: async input => {
        try {
          this.logger.debug('immediatelyExecuteTask 工具被调用')
          const task = await this.prismaService.task.findUnique({
            where: { id: input.taskId },
          })
          if (!task) {
            throw new Error('任务不存在')
          }
          const TaskProgresss = await lastValueFrom(
            this.taskExecutionService.execute(task).pipe(
              toArray(),
              pipe(
                tap(progress => {
                  this.logger.log(
                    `Task "${task.name}" (ID: ${task.id}) execution progress:`,
                    JSON.stringify(progress, null, 2),
                  )
                }),
              ),
            ),
          )
          const lastProgress = TaskProgresss[TaskProgresss.length - 1]
          if (lastProgress.status !== TaskProgressStatus.TASK_COMPLETE) {
            throw new Error('任务未完成')
          }
          const report = lastProgress.data

          return {
            data: report,
            message: '任务执行成功',
          }
        } catch (error) {
          this.logger.error(error)
          throw error
        }
      },
    }),

    ShowAllTaskUI: tool({
      description: '当用户要求展示所有任务时，调用该工具',
      inputSchema: z.object({
        status: z
          .enum({
            ...TaskStatus,
            all: 'all',
          })
          .default(TaskStatus.active)
          .describe('任务状态'),
      }),
    }),

    ShowTaskDetailUI: tool({
      description:
        '当用户要求展示任务详情时，调用该工具，展示完整的任务内容和该任务的所属报告',
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
      }),
    }),

    ShowFeedbackUI: tool({
      description: '当进行创建/更新/删除任务完成后，调用该工具，显示操作反馈',
      inputSchema: z.object({
        status: z
          .enum({
            success: 'success',
            error: 'error',
          })
          .describe('操作结果'),
        message: z.string().describe('操作结果的文本提示'),
      }),
    }),
  })
}
