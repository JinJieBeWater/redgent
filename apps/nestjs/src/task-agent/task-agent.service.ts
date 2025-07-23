import { Injectable } from '@nestjs/common'
import { tool } from 'ai'
import z from 'zod'

import {
  createTaskSchema,
  TaskScheduleService,
} from '../task-schedule/task-schedule.service'

@Injectable()
export class TaskAgentService {
  constructor(private readonly taskScheduleService: TaskScheduleService) {}
  readonly tools = {
    validateTaskConfig: tool({
      description: '验证创建的Reddit抓取任务配置是否正确',
      inputSchema: createTaskSchema,
      execute: () => true,
    }),

    listAllTasks: tool({
      description: '列出所有Reddit抓取任务',
      inputSchema: z.void(),
      execute: async () => {
        try {
          this.taskScheduleService.listAll()
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : '未知错误',
            message: '任务列表获取失败',
          }
        }
      },
    }),

    createTask: tool({
      description: '创建一个Reddit抓取任务',
      inputSchema: createTaskSchema,
      execute: async input => {
        try {
          const task = await this.taskScheduleService.createTask(input)
          return {
            task: task,
            message: '任务创建成功',
          }
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : '未知错误',
            message: '任务创建失败',
          }
        }
      },
    }),

    updateTask: tool({
      description: '修改 Reddit 抓取任务配置',
      inputSchema: z.object({
        id: z.uuid().describe('任务id'),
        data: createTaskSchema.partial(),
      }),
      execute: async input => {
        try {
          const task = await this.taskScheduleService.updateTask({
            id: input.id,
            ...input.data,
          })
          return {
            task: task,
            message: '任务更新成功',
          }
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : '未知错误',
            message: '任务更新失败',
          }
        }
      },
    }),
  }
}
