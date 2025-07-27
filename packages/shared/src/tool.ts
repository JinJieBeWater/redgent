import { Tool, UIDataTypes } from 'ai'
import { z } from 'zod'

import { Task, TaskReport, TaskStatus } from '@redgent/db'

import { createTaskSchema, updateTaskSchema } from './task'

export type ToolOutPut<T = unknown> = {
  message: string
  data?: T
}

export const NullInputSchema = z.object({})

/** !! 服务端工具 !! */
/** 列出所有任务 */
export const GetAllTasksInputSchema = z.object({
  status: z
    .enum({
      ...TaskStatus,
      all: 'all',
    })
    .default(TaskStatus.active)
    .describe('任务状态'),
})
export type GetAllTasksInput = z.infer<typeof GetAllTasksInputSchema>
export type GetAllTasksOutput = ToolOutPut<
  Pick<Task, 'id' | 'name' | 'status'>[]
>

/** 查看任务详情 */
export const GetTaskDetailInputSchema = z.object({
  taskId: z.uuid().describe('任务id'),
})
export type GetTaskDetailInput = z.infer<typeof GetTaskDetailInputSchema>
export type GetTaskDetailOutput = ToolOutPut<Task | null>

/** 创建任务 */
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type CreateTaskOutput = ToolOutPut<Task>

/** 更新任务 */
export const UpdateTaskInputSchema = z.object({
  taskId: z.uuid().describe('任务id'),
  data: updateTaskSchema,
})
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>
export type UpdateTaskOutput = ToolOutPut<Task>

/** 删除任务 */
export const DeleteTaskInputSchema = z.object({
  taskId: z.uuid().describe('任务id'),
})
export type DeleteTaskInput = z.infer<typeof DeleteTaskInputSchema>
export type DeleteTaskOutput = ToolOutPut

/** 立即执行一次任务 */
export const ImmediatelyExecuteTaskInputSchema = z.object({
  taskId: z.uuid().describe('任务id'),
})
export type ImmediatelyExecuteTaskInput = z.infer<
  typeof ImmediatelyExecuteTaskInputSchema
>
export type ImmediatelyExecuteTaskOutput = ToolOutPut<TaskReport>

/** !! 客户端工具 !! */
/** 展示所有任务 */
export const ShowAllTaskInputSchema = z.object({
  status: z
    .enum({
      ...TaskStatus,
      all: 'all',
    })
    .default(TaskStatus.active)
    .describe('任务状态'),
})
export type ShowAllTaskUIInput = z.infer<typeof ShowAllTaskInputSchema>

/** 展示单个任务详情 */
export const ShowTaskDetailInputSchema = z.object({
  taskId: z.uuid().describe('任务id'),
})
export type ShowTaskDetailUIInput = z.infer<typeof ShowTaskDetailInputSchema>

/** 展示操作反馈  */
export const ShowFeedbackInputSchema = z.object({
  status: z
    .enum({
      success: 'success',
      error: 'error',
    })
    .describe('操作结果'),
  message: z.string().describe('操作结果的文本提示'),
})
export type ShowFeedbackUIInput = z.infer<typeof ShowFeedbackInputSchema>

export type APPUITools = {
  listAllTasks: {
    input: GetAllTasksInput
    output: GetAllTasksOutput
  }
  createTask: {
    input: CreateTaskInput
    output: CreateTaskOutput
  }
  updateTask: {
    input: UpdateTaskInput
    output: UpdateTaskOutput
  }
  deleteTask: {
    input: DeleteTaskInput
    output: DeleteTaskOutput
  }
  immediatelyExecuteTask: {
    input: ImmediatelyExecuteTaskInput
    output: ImmediatelyExecuteTaskOutput
  }
  viewTaskDetail: {
    input: GetTaskDetailInput
    output: GetTaskDetailOutput
  }
}

export type APPUIToolType = keyof APPUITools

export type APPTools = {
  GetAllTasks: Tool<GetAllTasksInput, GetAllTasksOutput>
  GetTaskDetail: Tool<GetTaskDetailInput, GetTaskDetailOutput>
  CreateTask: Tool<CreateTaskInput, CreateTaskOutput>
  UpdateTask: Tool<UpdateTaskInput, UpdateTaskOutput>
  DeleteTask: Tool<DeleteTaskInput, DeleteTaskOutput>
  ImmediatelyExecuteTask: Tool<
    ImmediatelyExecuteTaskInput,
    ImmediatelyExecuteTaskOutput
  >

  ShowAllTaskUI: Tool<ShowAllTaskUIInput>
  ShowTaskDetailUI: Tool<ShowTaskDetailUIInput>
  ShowFeedbackUI: Tool<ShowFeedbackUIInput>
}

export type APPUIDataTypes = UIDataTypes & {}
