import { z } from 'zod'

import { ScheduleType, TaskStatus } from '@redgent/db'

export const createTaskSchema = z.object({
  name: z.string().describe('简短任务名称'),
  prompt: z.string().describe('用户原封不动的输入'),
  keywords: z.array(z.string()).describe('关键词列表'),
  subreddits: z.array(z.string()).describe('Reddit 子版块列表'),
  scheduleType: z.enum(ScheduleType).describe('定时类型'),
  scheduleExpression: z.string().describe('Cron表达式或间隔时间'),
  status: z.enum([TaskStatus.active, TaskStatus.paused]).describe('任务状态'),
  enableFiltering: z
    .boolean()
    .describe('是否启用过滤，3天内处理过的帖子不再处理'),
})

export const updateTaskSchema = createTaskSchema.partial()
