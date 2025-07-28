import z from 'zod'

export const PaginateSchema = z.object({
  take: z.number(),
  skip: z.number(),
})

export const PaginateByTaskIdSchema = z.object({
  taskId: z.string(),
  take: z.number(),
  skip: z.number(),
})
