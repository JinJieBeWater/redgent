import z from 'zod'

export const TaskExecutionInputSchema = z.object({
  taskId: z.uuid(),
})
