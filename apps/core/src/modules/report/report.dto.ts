import z from 'zod'

export const paginateSchema = z.object({
  take: z.number(),
  skip: z.number(),
})

export const paginateByTaskIdSchema = z.object({
  taskId: z.string(),
  take: z.number(),
  skip: z.number(),
})
