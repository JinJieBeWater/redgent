import { Injectable, Logger } from '@nestjs/common'
import {
  tool,
  UIDataTypes,
  UIMessage,
  UIMessageStreamWriter,
  UITools,
} from 'ai'
import { lastValueFrom, pipe, tap, toArray } from 'rxjs'
import z from 'zod'

import {
  APPTools,
  APPUITools,
  CreateTaskInput,
  CreateTaskOutput,
  createTaskSchema,
  DeleteTaskInput,
  DeleteTaskInputSchema,
  DeleteTaskOutput,
  GetLatestReportInput,
  GetLatestReportInputSchema,
  GetLatestReportOutput,
  ImmediatelyExecuteTaskInput,
  ImmediatelyExecuteTaskInputSchema,
  ImmediatelyExecuteTaskOutput,
  ListAllTasksInput,
  ListAllTasksInputSchema,
  ListAllTasksOutput,
  TaskProgressStatus,
  UpdateTaskInput,
  UpdateTaskOutput,
  ViewTaskDetailInput,
  ViewTaskDetailInputSchema,
  ViewTaskDetailOutput,
} from '@redgent/shared'

import { PrismaService } from '../../prisma/prisma.service'
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
    writer: UIMessageStreamWriter<UIMessage<unknown, UIDataTypes, APPUITools>>,
  ) =>
    ({
      listAllTasks: tool<ListAllTasksInput, ListAllTasksOutput>({
        description: '列出所有Reddit抓取任务',
        inputSchema: ListAllTasksInputSchema,
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

      createTask: tool<CreateTaskInput, CreateTaskOutput>({
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

      updateTask: tool<UpdateTaskInput, UpdateTaskOutput>({
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

      deleteTask: tool<DeleteTaskInput, DeleteTaskOutput>({
        description: '删除任务',
        inputSchema: DeleteTaskInputSchema,
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

      viewTaskDetail: tool<ViewTaskDetailInput, ViewTaskDetailOutput>({
        description: '查看任务详情',
        inputSchema: ViewTaskDetailInputSchema,
        execute: async input => {
          try {
            this.logger.debug('viewTaskDetail 工具被调用')
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

      getLatestReport: tool<GetLatestReportInput, GetLatestReportOutput>({
        description: '获取最新的分析报告',
        inputSchema: GetLatestReportInputSchema,
        execute: async ({ count }) => {
          try {
            this.logger.debug('getLatestReport 工具被调用')
            const reports = await this.prismaService.taskReport.findMany({
              orderBy: {
                createdAt: 'desc',
              },
              take: count,
            })
            return {
              data: reports,
              message: '分析报告获取成功',
            }
          } catch (error) {
            this.logger.error(error)
            throw error
          }
        },
      }),

      immediatelyExecuteTask: tool<
        ImmediatelyExecuteTaskInput,
        ImmediatelyExecuteTaskOutput
      >({
        description: '立即执行一次任务',
        inputSchema: ImmediatelyExecuteTaskInputSchema,
        execute: async (input, { toolCallId }) => {
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
            writer.write({
              type: 'data-tool-status',
              id: toolCallId,
              data: {
                name: 'myTool',
                status: 'in-progress',
              },
            })
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
    }) satisfies APPTools
}
