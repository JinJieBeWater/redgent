import { zAsyncIterable } from '@core/common/dto/z-async-iterable.dto'
import z from 'zod'

import { TaskStatus } from '@redgent/db'
import { ExecuteSubscribeOutputSchema } from '@redgent/shared'

export const PaginateSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().nullish(),
  status: z.enum(TaskStatus).optional(),
})

export const DetailSchema = z.object({
  id: z.string(),
})

export const ExecuteSubscribeInputSchema = z.object({
  lastEventId: z.coerce.number().min(0).optional(),
})

export const ExecuteSubscribeOutputSchemaWithYield = zAsyncIterable({
  yield: ExecuteSubscribeOutputSchema,
  tracked: true,
})
