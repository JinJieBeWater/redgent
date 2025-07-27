import z from 'zod'

import { TaskStatus } from '@redgent/db'

export const paginateSchema = z.object({
  take: z.number(),
  skip: z.number(),
  status: z.enum(TaskStatus).optional(),
})

export const detailSchema = z.object({
  id: z.string(),
})
