import z from 'zod'

import { TaskReport } from '@redgent/db'

export const TaskReportContentSchema = z.object({
  findings: z
    .array(
      z.object({
        elaboration: z
          .string()
          .describe(
            "直接陈述发现的具体内容，保持原始信息完整性，例：'多名用户反映开启夜间模式2小时后出现眼睛干涩症状'",
          ),

        supportingLinkIds: z
          .array(z.string())
          .min(1)
          .describe('关联原始数据的id列表'),
      }),
    )
    .min(1),
})

export const TaskReportMiniSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  createdAt: z.date(),
  taskId: z.uuid(),
  errorMessage: z.string().nullable(),
})

export const TaskReportSchema: z.ZodType<TaskReport> =
  TaskReportMiniSchema.extend({
    content: TaskReportContentSchema,
    executionDuration: z.number(),
  })
