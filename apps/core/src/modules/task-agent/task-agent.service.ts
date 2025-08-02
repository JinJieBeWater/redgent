import { TrpcRouter } from '@core/processors/trpc/trpc.router'
import { Injectable, Logger } from '@nestjs/common'
import { tool, UIDataTypes, UIMessage, UIMessageStreamWriter } from 'ai'
import { lastValueFrom, pipe, tap, toArray } from 'rxjs'
import z from 'zod'

import { TaskStatus } from '@redgent/db'
import {
  createTaskSchema,
  TaskProgressSchema,
  TaskProgressStatus,
  TaskReportMiniSchema,
  TaskReportSchema,
  TaskSchema,
} from '@redgent/shared'

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
    private readonly trpcRouter: TrpcRouter,
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
          })
          .optional()
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
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
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
      outputSchema: z.object({
        status: z
          .enum(['running', 'success', 'cancel', 'failure'])
          .describe('执行状态'),
        message: z.string().describe('执行消息'),
        taskId: z.uuid().describe('任务id'),
        reportId: z.string().describe('报告id'),
        progress: z.array(TaskProgressSchema).describe('任务进度历史'),
      }),
      execute: async input => {
        this.logger.debug('immediatelyExecuteTask 工具被调用')
        const task = await this.prismaService.task.findUnique({
          where: { id: input.taskId },
        })
        if (!task) {
          throw new Error('任务不存在')
        }
        const { reportId, taskId } = this.taskExecutionService.execute(task)
        return {
          message: '任务正在执行中',
          status: 'running',
          taskId,
          reportId,
          progress: [],
        }
      },
    }),

    ShowLatestReportUI: tool({
      description: '当用户要求展示最新任务报告时，调用该工具',
      inputSchema: z.object({}),
      execute: async () => {
        return await this.trpcRouter.caller.report.paginate({})
      },
    }),

    ShowAllTaskUI: tool({
      description: '当用户要求展示所有任务时，调用该工具',
      inputSchema: z.object({
        status: z
          .enum(TaskStatus)
          .optional()
          .describe('任务状态，默认不输入，即状态为所有状态'),
      }),
      execute: async ({ status }) => {
        return await this.trpcRouter.caller.task.paginate({
          status,
        })
      },
    }),

    ShowTaskDetailUI: tool({
      description:
        '当用户要求展示任务详情时，调用该工具，展示完整的任务内容和该任务的所属报告',
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
      }),
      outputSchema: z.object({
        task: TaskSchema,
        page: z.object({
          reports: z.array(TaskReportMiniSchema),
          total: z.number(),
          nextCursor: z.string(),
        }),
      }),
      execute: async ({ taskId }) => {
        const [task, page] = await Promise.all([
          this.trpcRouter.caller.task.detail({
            id: taskId,
          }),
          this.trpcRouter.caller.report.paginateByTaskId({
            taskId,
          }),
        ])
        return {
          task,
          page,
        }
      },
    }),

    ShowReportUI: tool({
      description: '展示任务报告',
      inputSchema: z.object({
        id: z.uuid().describe('报告id'),
      }),
      outputSchema: z.object({
        report: TaskReportSchema.and(
          z.object({
            task: z.object({
              name: z.string(),
            }),
          }),
        ).nullable(),
      }),
      execute: async ({ id }) => {
        const report = await this.trpcRouter.caller.report.byId({
          id,
        })
        return {
          report,
        }
      },
    }),

    RequestUserConsent: tool({
      description: '请求用户同意或拒绝某个操作',
      inputSchema: z.object({
        message: z.string().describe('操作描述'),
      }),
      outputSchema: z.object({
        consent: z.enum(['accept', 'reject']).describe('用户同意或拒绝'),
      }),
    }),
  })
}
