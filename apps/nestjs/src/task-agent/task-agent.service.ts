import { Injectable, Logger } from '@nestjs/common'
import { Tool, tool } from 'ai'
import z from 'zod'

import {
  APPTools,
  CreateTaskInput,
  CreateTaskOutput,
  ListAllTasksInput,
  ListAllTasksOutput,
  NullInputSchema,
  UpdateTaskInput,
  UpdateTaskOutput,
  ValidateTaskConfigInput,
  ValidateTaskConfigOutput,
} from '@redgent/types'
import { createTaskSchema } from '@redgent/validators'

import { TaskScheduleService } from '../task-schedule/task-schedule.service'

@Injectable()
export class TaskAgentService {
  private readonly logger = new Logger(TaskAgentService.name)
  constructor(private readonly taskScheduleService: TaskScheduleService) {}
  readonly tools = {
    validateTaskConfig: tool<ValidateTaskConfigInput, ValidateTaskConfigOutput>(
      {
        description: '验证创建的Reddit抓取任务配置是否正确',
        inputSchema: createTaskSchema,
        execute: () => ({
          message: '验证成功',
        }),
      },
    ),

    listAllTasks: tool<ListAllTasksInput, ListAllTasksOutput>({
      description: '列出所有Reddit抓取任务',
      inputSchema: NullInputSchema,
      execute: async () => {
        try {
          this.logger.debug('listAllTasks 工具被调用')
          const tasks = await this.taskScheduleService.listAll()
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
          const task = await this.taskScheduleService.createTask(input)
          return {
            data: task,
            message: '任务创建成功',
          }
        } catch (error) {
          this.logger.error(error)
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
          const task = await this.taskScheduleService.updateTask({
            id: input.taskId,
            ...input.data,
          })
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
  } satisfies APPTools
}
