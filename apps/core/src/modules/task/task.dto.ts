import z from 'zod'

import { TaskStatus } from '@redgent/db'

export const PaginateSchema = z.object({
  take: z.number(),
  skip: z.number(),
  status: z.enum(TaskStatus).optional(),
})

export const DetailSchema = z.object({
  id: z.string(),
})
