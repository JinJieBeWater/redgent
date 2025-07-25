import { Tool } from 'ai'
import { z } from 'zod'

import { Task } from '@redgent/db'
import { createTaskSchema, updateTaskSchema } from '@redgent/validators'

export type ToolOutPut<T = unknown> = {
  message: string
  data?: T
}

export const NullInputSchema = z.object({})

export type ValidateTaskConfigInput = z.infer<typeof createTaskSchema>
export type ValidateTaskConfigOutput = ToolOutPut

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type CreateTaskOutput = ToolOutPut<Task>

export type UpdateTaskInput = {
  taskId: string
  data: z.infer<typeof updateTaskSchema>
}
export type UpdateTaskOutput = ToolOutPut<Task>

export type ListAllTasksInput = z.infer<typeof NullInputSchema>
export type ListAllTasksOutput = ToolOutPut<Task[]>

export type APPUITools = {
  validateTaskConfig: {
    input: ValidateTaskConfigInput
    output: ValidateTaskConfigOutput
  }
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
}

export type APPUIToolType = keyof APPUITools

export type APPTools = {
  validateTaskConfig: Tool<ValidateTaskConfigInput, ValidateTaskConfigOutput>
  listAllTasks: Tool<ListAllTasksInput, ListAllTasksOutput>
  createTask: Tool<CreateTaskInput, CreateTaskOutput>
  updateTask: Tool<UpdateTaskInput, UpdateTaskOutput>
}
