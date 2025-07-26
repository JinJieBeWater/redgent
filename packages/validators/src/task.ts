import { z } from 'zod'

import { ScheduleType, TaskStatus } from '@redgent/db'

export const createTaskSchema = z.object({
  name: z.string().describe('简短任务名称'),
  prompt: z.string().describe('用户原封不动的输入'),
  keywords: z.array(z.string()).describe('关键词列表'),
  subreddits: z.array(z.string()).describe('Reddit 子版块列表'),
  scheduleType: z.enum(ScheduleType).describe('定时类型'),
  scheduleExpression: z.string().describe(`
    当 scheduleType 为 cron 时，表达式为 cron 表达式
    当 scheduleType 为 interval 时，表达式为间隔时间，单位为毫秒ms
    `),
  status: z
    .enum([TaskStatus.active, TaskStatus.paused])
    .describe('任务状态 激活 或 暂停'),
  enableFiltering: z.boolean().describe('3天缓存'),
})

export const updateTaskSchema = createTaskSchema.partial()
