// 任务配置字段
export interface TaskConfig {
  /** 任务唯一标识符 */
  id: string
  /** 任务名称 */
  name: string
  /** 任务所属用户的唯一标识符 */
  ownerId: string
  /** 定时任务的 cron 表达式 */
  cron: string
  /** 用户的任务提示词 */
  prompt: string
  /** 关键词列表，用于 Reddit 搜索 */
  keywords: string[]
  /** 相关的 Reddit 子版块列表 */
  subreddits: string[]
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
  /** 任务状态（如：active, paused） */
  status: 'active' | 'paused'
  /** 最后执行时间 */
  lastExecutedAt?: Date
  /** 是否启用过滤机制，通过缓存（ttl=36）过滤之前已经抓取过的内容 */
  enableFiltering: boolean
  /** 上次执行失败的时间 */
  lastFailureAt?: Date
  /** 上次执行失败的错误信息 */
  lastErrorMessage?: string
  /** 自定义分析模型 */
  llmModel?: string
}

/**
 * 定义所有可能的任务进度状态
 */
export const TaskStatus = {
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

  /** 开始调用 AI 服务进行分析 */
  ANALYZE_START: 'ANALYZE_START',
  /** 完成 AI 分析 */
  ANALYZE_COMPLETE: 'ANALYZE_COMPLETE',

  /** 通用信息，不改变主要状态，但提供额外上下文 */
  INFO: 'INFO',
} as const

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

// =================================================================
// 进度更新的类型定义
// =================================================================

/** 基础进度接口 */
interface BaseProgress {
  status: TaskStatus
  message: string
}

// 1. 任务生命周期状态
export interface TaskStartProgress extends BaseProgress {
  status: typeof TaskStatus.TASK_START
}

export interface TaskCompleteProgress extends BaseProgress {
  status: typeof TaskStatus.TASK_COMPLETE
}

export interface TaskCancelProgress extends BaseProgress {
  status: typeof TaskStatus.TASK_CANCEL
}

export interface TaskErrorProgress extends BaseProgress {
  status: typeof TaskStatus.TASK_ERROR
  data: {
    error: Error
  }
}

// 2. 数据抓取阶段
export interface FetchStartProgress extends BaseProgress {
  status: typeof TaskStatus.FETCH_START
}

export interface FetchCompleteProgress extends BaseProgress {
  status: typeof TaskStatus.FETCH_COMPLETE
  data: {
    /** 本次抓取到的链接总数 */
    count: number
  }
}

// 3. 数据过滤阶段
export interface FilterStartProgress extends BaseProgress {
  status: typeof TaskStatus.FILTER_START
}

export interface FilterCompleteProgress extends BaseProgress {
  status: typeof TaskStatus.FILTER_COMPLETE
  data: {
    /** 过滤前的链接数 */
    originalCount: number
    /** 过滤后的新链接数 */
    uniqueCount: number
  }
}

// 4. 筛选阶段
export interface SelectStartProgress extends BaseProgress {
  status: typeof TaskStatus.SELECT_START
}

export interface SelectCompleteProgress extends BaseProgress {
  status: typeof TaskStatus.SELECT_COMPLETE
  data: {
    /** 过滤前的链接数 */
    originalCount: number
    /** 过滤后的新链接数 */
    uniqueCount: number
  }
}

// 5. AI 分析阶段
export interface AnalyzeStartProgress extends BaseProgress {
  status: typeof TaskStatus.ANALYZE_START
  data: {
    /** 待分析的链接数 */
    count: number
  }
}

export interface AnalyzeCompleteProgress extends BaseProgress {
  status: typeof TaskStatus.ANALYZE_COMPLETE
}

// 6. 通用信息
export interface InfoProgress extends BaseProgress {
  status: typeof TaskStatus.INFO
}

/**
 * 任务进度的联合类型
 *
 * 通过检查 `status` 字段来确定具体的进度类型。
 */
export type TaskProgress =
  | TaskStartProgress
  | TaskCompleteProgress
  | TaskCancelProgress
  | TaskErrorProgress
  | FetchStartProgress
  | FetchCompleteProgress
  | FilterStartProgress
  | FilterCompleteProgress
  | SelectStartProgress
  | SelectCompleteProgress
  | AnalyzeStartProgress
  | AnalyzeCompleteProgress
  | InfoProgress
