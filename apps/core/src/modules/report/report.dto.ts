import z from 'zod'

export const ByIdSchema = z.object({
  id: z.string(),
})

export const PaginateSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().nullish(),
})

export const PaginateByTaskIdSchema = z.object({
  taskId: z.string(),
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().nullish(),
})
