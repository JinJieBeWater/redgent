import z from 'zod'

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

export const TaskReportSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: TaskReportContentSchema,
  executionDuration: z.number(),
  createdAt: z.date(),
  taskId: z.uuid(),
})
