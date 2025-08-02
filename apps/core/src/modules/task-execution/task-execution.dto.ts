import z from 'zod'

export const TaskExecutionInputSchema = z.object({
  taskId: z.uuid(),
})

export const TaskReportStatusInputSchema = z.object({
  taskId: z.uuid(),
  reportId: z.uuid(),
})
