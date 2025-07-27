import { Injectable, Logger } from '@nestjs/common'
import { tool, UIDataTypes, UIMessage, UIMessageStreamWriter } from 'ai'
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
  GetAllTasksInput,
  GetAllTasksInputSchema,
  GetAllTasksOutput,
  GetTaskDetailInput,
  GetTaskDetailInputSchema,
  GetTaskDetailOutput,
  ImmediatelyExecuteTaskInput,
  ImmediatelyExecuteTaskInputSchema,
  ImmediatelyExecuteTaskOutput,
  ShowAllTaskInputSchema,
  ShowAllTaskUIInput,
  ShowFeedbackInputSchema,
  ShowFeedbackUIInput,
  ShowTaskDetailInputSchema,
  ShowTaskDetailUIInput,
  TaskProgressStatus,
  UpdateTaskInput,
  UpdateTaskOutput,
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
  ) {}
  readonly tools = (
    writer: UIMessageStreamWriter<UIMessage<unknown, UIDataTypes, APPUITools>>,
  ) =>
    ({
      GetAllTasks: tool<GetAllTasksInput, GetAllTasksOutput>({
        description: '列出所有Reddit抓取任务',
        inputSchema: GetAllTasksInputSchema,
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

      GetTaskDetail: tool<GetTaskDetailInput, GetTaskDetailOutput>({
        description: '获取一个任务的详细信息',
        inputSchema: GetTaskDetailInputSchema,
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

      CreateTask: tool<CreateTaskInput, CreateTaskOutput>({
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

      UpdateTask: tool<UpdateTaskInput, UpdateTaskOutput>({
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

      DeleteTask: tool<DeleteTaskInput, DeleteTaskOutput>({
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

      ImmediatelyExecuteTask: tool<
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

      ShowAllTaskUI: tool<ShowAllTaskUIInput>({
        description: '在前端显示所有任务列表',
        inputSchema: ShowAllTaskInputSchema,
      }),

      ShowTaskDetailUI: tool<ShowTaskDetailUIInput>({
        description:
          '在前端显示任务详情，可用于展示完整的任务内容和该任务的所有报告',
        inputSchema: ShowTaskDetailInputSchema,
      }),

      ShowFeedbackUI: tool<ShowFeedbackUIInput>({
        description: '当进行创建/更新/删除任务后，显示操作反馈',
        inputSchema: ShowFeedbackInputSchema,
      }),
    }) satisfies APPTools
}
