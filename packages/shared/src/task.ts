import z from 'zod'

import { ScheduleType, TaskModel, TaskStatus } from '@redgent/db'

import { TaskReportSchema } from './task-report'

export const TaskPayloadSchema = z
  .object({
    keywords: z
      .array(
        z
          .string()
          .describe(
            '关键词 AI自动生成 注意：当用户输入非英文时, 需要生成两份关键词, 一份为用户使用的语言, 一份为英文',
          ),
      )
      .describe(
        '关键词列表 AI自动生成 注意：当用户输入非英文时, 需要生成两份关键词, 一份为用户使用的语言, 一份为英文',
      ),
    dataSource: z.object({
      reddit: z.object({
        subreddits: z.array(z.string()).describe('Reddit 子版块列表'),
      }),
    }),
  })
  .describe('任务具体配置参数')

export const CreateTaskSchema = z.object({
  name: z.string().describe('简短任务名称 AI自动生成 应该尽可能的简短'),
  prompt: z.string().describe('用户原封不动的输入'),
  payload: TaskPayloadSchema,
  scheduleType: z.enum(ScheduleType).describe('定时类型'),
  scheduleExpression: z.string().describe(`
    当 scheduleType 为 cron 时，表达式为 cron 表达式
    当 scheduleType 为 interval 时，表达式为间隔时间，单位为毫秒ms
    `),
  status: z
    .enum([TaskStatus.active, TaskStatus.paused])
    .default(TaskStatus.active)
    .describe('任务状态激活或暂停, 用户不说明时默认为激活'),
  enableCache: z.boolean().default(true).describe('3天缓存'),
})

export const TaskSchema = CreateTaskSchema.extend({
  id: z.uuid(),
  lastExecutedAt: z.date().nullable(),
  lastErrorMessage: z.string().nullable(),
  lastFailureAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<TaskModel>

/**
 * 定义所有可能的任务进度状态
 */
export const TaskProgressStatus = {
  /** 任务已开始 */
  TASK_START: 'TASK_START',
  /** 任务已成功完成 */
  TASK_COMPLETE: 'TASK_COMPLETE',
  /** 任务被取消（例如，没有新内容） */
  TASK_CANCEL: 'TASK_CANCEL',
  /** 任务执行出错 */
  TASK_ERROR: 'TASK_ERROR',

  /** 开始从 Reddit 抓取帖子 */
  FETCH_START: 'FETCH_START',
  /** 完成从 Reddit 抓取帖子 */
  FETCH_COMPLETE: 'FETCH_COMPLETE',

  /** 开始过滤重复帖子 */
  FILTER_START: 'FILTER_START',
  /** 完成过滤重复帖子 */
  FILTER_COMPLETE: 'FILTER_COMPLETE',

  /** 帖子过多，开始筛选流程 */
  SELECT_START: 'SELECT_START',
  /** 完成筛选流程 */
  SELECT_COMPLETE: 'SELECT_COMPLETE',

  /** 开始获取完整内容 */
  FETCH_CONTENT_START: 'FETCH_CONTENT_START',
  /** 完成获取完整内容 */
  FETCH_CONTENT_COMPLETE: 'FETCH_CONTENT_COMPLETE',

  /** 开始调用 AI 服务进行分析 */
  ANALYZE_START: 'ANALYZE_START',
  /** 完成 AI 分析 */
  ANALYZE_COMPLETE: 'ANALYZE_COMPLETE',

  /** 通用信息，不改变主要状态，但提供额外上下文 */
  INFO: 'INFO',
} as const

export type TaskProgressStatus =
  (typeof TaskProgressStatus)[keyof typeof TaskProgressStatus]

// =================================================================
// 进度更新的类型定义
// =================================================================

export const BaseTaskProgressSchema = z.object({
  status: z.enum(TaskProgressStatus),
  message: z.string(),
})

// 错误对象的联合类型（支持 Error 实例或普通错误对象）
export const ErrorSchema = z.union([
  z.instanceof(Error),
  z.object({
    message: z.string(),
    stack: z.string().optional(),
    name: z.string().optional(),
  }),
])

// 1. 任务生命周期状态
export const TaskStartProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.TASK_START),
  data: z.object({
    reportId: z.string().describe('任务报告 id，该阶段正在生成数据库中还没有'),
  }),
})

export const TaskCompleteProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.TASK_COMPLETE),
  data: TaskReportSchema,
})

export const TaskCancelProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.TASK_CANCEL),
})

export const TaskErrorProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.TASK_ERROR),
  data: z.object({
    error: ErrorSchema,
  }),
})

// 2. 数据抓取阶段
export const FetchStartProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.FETCH_START),
})

export const FetchCompleteProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.FETCH_COMPLETE),
})

// 3. 数据过滤阶段
export const FilterStartProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.FILTER_START),
})

export const FilterCompleteProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.FILTER_COMPLETE),
})

// 4. 筛选阶段
export const SelectStartProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.SELECT_START),
})

export const SelectCompleteProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.SELECT_COMPLETE),
})

// 5. 获取完整内容阶段
export const FetchContentStartProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.FETCH_CONTENT_START),
})

export const FetchContentCompleteProgressSchema = BaseTaskProgressSchema.extend(
  {
    status: z.literal(TaskProgressStatus.FETCH_CONTENT_COMPLETE),
  },
)

// 6. AI 分析阶段
export const AnalyzeStartProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.ANALYZE_START),
})

export const AnalyzeCompleteProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.ANALYZE_COMPLETE),
})

// 7. 通用信息
export const InfoProgressSchema = BaseTaskProgressSchema.extend({
  status: z.literal(TaskProgressStatus.INFO),
})

/**
 * 任务进度的区分联合类型
 */
export const TaskProgressSchema = z.discriminatedUnion('status', [
  TaskStartProgressSchema,
  TaskCompleteProgressSchema,
  TaskCancelProgressSchema,
  TaskErrorProgressSchema,
  FetchStartProgressSchema,
  FetchCompleteProgressSchema,
  FilterStartProgressSchema,
  FilterCompleteProgressSchema,
  SelectStartProgressSchema,
  SelectCompleteProgressSchema,
  FetchContentStartProgressSchema,
  FetchContentCompleteProgressSchema,
  AnalyzeStartProgressSchema,
  AnalyzeCompleteProgressSchema,
  InfoProgressSchema,
])

export type TaskProgress = z.infer<typeof TaskProgressSchema>

export const ExecuteSubscribeOutputSchema = z.object({
  taskId: z.uuid().describe('任务id'),
  reportId: z.string().describe('报告id'),
  name: z.string().describe('任务名称'),
  progress: TaskProgressSchema,
})
