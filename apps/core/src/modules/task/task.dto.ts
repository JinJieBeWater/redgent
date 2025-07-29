import z from 'zod'

import { TaskStatus } from '@redgent/db'

export const PaginateSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().nullish(),
  status: z.enum(TaskStatus).optional(),
})

export const DetailSchema = z.object({
  id: z.string(),
})
