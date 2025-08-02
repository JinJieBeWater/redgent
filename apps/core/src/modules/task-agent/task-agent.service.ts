import { TrpcRouter } from '@core/processors/trpc/trpc.router'
import { Injectable, Logger } from '@nestjs/common'
import { tool } from 'ai'
import z from 'zod'

import { TaskStatus } from '@redgent/db'
import {
  createTaskSchema,
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
  readonly tools = () => ({
    GetAllTasks: tool({
      description: `
      服务端工具 获取所有任务的粗略信息
      - 当需要获得所有任务的粗略信息来进行操作时，调用该工具
      `,
      inputSchema: z.object({
        status: z
          .enum({
            ...TaskStatus,
          })
          .optional()
          .describe('任务状态'),
      }),
      execute: async ({ status }) => {
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
      },
    }),

    GetTaskDetail: tool({
      description: `
      服务端工具 获取一个任务的详细信息
      - 当需要获得所有任务的粗略信息来进行操作时，调用该工具
      `,
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
      }),
      execute: async input => {
        this.logger.debug('getTaskDetail 工具被调用')
        const task = await this.prismaService.task.findUnique({
          where: { id: input.taskId },
        })
        return {
          data: task,
          message: '任务详情获取成功',
        }
      },
    }),

    GetLatestReport: tool({
      description: `
      服务端工具 获取最新的10个任务报告的粗略信息
      - 当需要获取最新的任务报告时，调用该工具
      `,
      inputSchema: z.object({}),
      execute: async () => {
        this.logger.debug('getLatestReport 工具被调用')
        const reports = await this.prismaService.taskReport.findMany({
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            title: true,
            createdAt: true,
            taskId: true,
            task: {
              select: {
                name: true,
              },
            },
          },
        })
        return {
          data: reports,
          message: '任务报告获取成功',
        }
      },
    }),

    GetReportByTaskId: tool({
      description: `
      服务端工具 获取一个任务的所有报告的粗略信息
      - 当需要获取一个任务的所有报告时，调用该工具
      `,
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
      }),
      execute: async input => {
        this.logger.debug('getReportByTaskId 工具被调用')
        const reports = await this.prismaService.taskReport.findMany({
          where: {
            taskId: input.taskId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            title: true,
            createdAt: true,
            taskId: true,
            task: {
              select: {
                name: true,
              },
            },
          },
        })
        return {
          data: reports,
          message: '任务报告获取成功',
        }
      },
    }),

    CreateTask: tool({
      description: `
      服务端工具 创建一个定时任务
      - 当用户要求创建一个定时任务时，调用该工具
      - 关键词生成逻辑
        - 当用户输入非英文时, 需要生成两份关键词, 一份为用户使用的语言, 一份为英文
      - subreddit 生成逻辑
        - 确保 subreddit 为真实的 subreddit
      `,
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
      description: `
      服务端工具 修改一个定时任务的配置
      - 当用户要求修改一个定时任务的配置时，调用该工具
      - 可供修改项有 name, payload, scheduleType, scheduleExpression, enableCache, status
      `,
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
      description: `
      服务端工具 删除一个定时任务
      - 当用户要求删除一个定时任务时，调用该工具
      `,
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
      description: `
      服务端与客户端工具, 立即执行一次任务
      - 当相同任务执行频率过高时, 会导致任务取消(表现在前端是失败)
      - 工具的输出会随着任务执行的进度而变化
      - 当用户要求立即执行一次任务时，调用该工具
      - 执行完成后可以点击 ImmediatelyExecuteTask 的 UI 组件右侧的按钮查看生成的报告
      `,
      inputSchema: z.object({
        taskId: z.uuid().describe('任务id'),
      }),
      outputSchema: z.object({
        reportId: z.string().describe('报告id'),
        status: z.enum(['running', 'success', 'failure']).describe('执行状态'),
        message: z.string().describe('执行消息'),
        taskName: z.string().describe('任务名称'),
      }),
      execute: async input => {
        const task = await this.prismaService.task.findUnique({
          where: { id: input.taskId },
        })
        if (!task) {
          throw new Error('任务不存在')
        }
        const res = await this.taskExecutionService.execute(task)
        if (res.status === 'cancel') {
          throw new Error('当前任务已经在执行中')
        }
        return {
          taskName: task.name,
          message: 'running',
          status: 'running',
          reportId: res.reportId,
          progress: [],
        }
      },
    }),

    ShowLatestReportUI: tool({
      description: `
      客户端工具 在前端展示最新的任务报告列表 同时工具的输出可以拿到最新的报告列表
      - 当用户要求展示最新任务报告时，调用该工具
      `,
      inputSchema: z.object({}),
      execute: async () => {
        return await this.trpcRouter.caller.report.paginate({})
      },
    }),

    ShowAllTaskUI: tool({
      description: `
        客户端工具 在前端展示所有任务列表 同时工具的输出可以拿到所有任务列表
        - 当用户要求展示所有任务时，调用该工具`,
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
      description: `
        客户端工具 在前端展示任务详情 同时工具的输出可以拿到任务详情和该任务的报告列表
        - 当用户要求展示任务详情时，调用该工具
        `,
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
      description: `
      展示一个任务报告
      - 当用户要求展示一个任务报告时，调用该工具
      `,
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
      description: `
      请求用户同意或拒绝某个操作
      - 当进行敏感操作时，需要用户同意或拒绝操作时，调用该工具
      - 根据用户的反馈, 进行后续的操作
      `,
      inputSchema: z.object({
        message: z.string().describe('操作描述'),
      }),
      outputSchema: z.object({
        consent: z.enum(['accept', 'reject']).describe('用户同意或拒绝'),
      }),
    }),
  })
}
