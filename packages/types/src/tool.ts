import { Tool, UIDataTypes } from 'ai'
import { z } from 'zod'

import { Task, TaskReport, TaskStatus } from '@redgent/db'
import { createTaskSchema, updateTaskSchema } from '@redgent/validators'

export type ToolOutPut<T = unknown> = {
  message: string
  data?: T
}

export const NullInputSchema = z.object({})

/** 列出所有任务 */
export const ListAllTasksInputSchema = z.object({
  status: z
    .enum({
      ...TaskStatus,
      all: 'all',
    })
    .default(TaskStatus.active)
    .describe('任务状态'),
})
export type ListAllTasksInput = z.infer<typeof ListAllTasksInputSchema>
export type ListAllTasksOutput = ToolOutPut<
  Pick<Task, 'id' | 'name' | 'status'>[]
>

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

/** 查看任务详情 */
export const ViewTaskDetailInputSchema = z.object({
  taskId: z.uuid().describe('任务id'),
})
export type ViewTaskDetailInput = z.infer<typeof ViewTaskDetailInputSchema>
export type ViewTaskDetailOutput = ToolOutPut<Task | null>

/** 获取最新的分析报告 */
export const GetLatestReportInputSchema = z.object({
  count: z.number().min(1).max(20).default(10).describe('获取报告数量'),
})
export type GetLatestReportInput = z.infer<typeof GetLatestReportInputSchema>
export type GetLatestReportOutput = ToolOutPut<TaskReport[]>

export type APPUITools = {
  listAllTasks: {
    input: ListAllTasksInput
    output: ListAllTasksOutput
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
    input: ViewTaskDetailInput
    output: ViewTaskDetailOutput
  }
  getLatestReport: {
    input: GetLatestReportInput
    output: GetLatestReportOutput
  }
}

export type APPUIToolType = keyof APPUITools

export type APPTools = {
  listAllTasks: Tool<ListAllTasksInput, ListAllTasksOutput>
  createTask: Tool<CreateTaskInput, CreateTaskOutput>
  updateTask: Tool<UpdateTaskInput, UpdateTaskOutput>
  deleteTask: Tool<DeleteTaskInput, DeleteTaskOutput>
  viewTaskDetail: Tool<ViewTaskDetailInput, ViewTaskDetailOutput>
  immediatelyExecuteTask: Tool<
    ImmediatelyExecuteTaskInput,
    ImmediatelyExecuteTaskOutput
  >
  getLatestReport: Tool<GetLatestReportInput, GetLatestReportOutput>
}

export type APPUIDataTypes = UIDataTypes & {}
