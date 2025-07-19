// 任务配置字段
export interface TaskConfig {
  /** 任务唯一标识符 */
  id: string
  /** 任务名称 */
  name: string
  /** 定时任务的 cron 表达式 */
  cron: string
  /** 用户的任务提示词 */
  prompt: string
  /** 关键词列表，用于 Reddit 搜索 */
  keywords: string[]
  /** 相关的 Reddit 子版块列表 */
  subreddits: string[]
  /** 任务状态（如：active, paused） */
  status: 'active' | 'paused' | 'running'
  /** 是否启用过滤机制，通过缓存（ttl=36）过滤之前已经抓取过的内容 */
  enableFiltering: boolean
  /** 自定义分析模型 */
  llmModel?: string | null
  /** 最后执行时间 */
  lastExecutedAt?: Date | null
  /** 上次执行失败的时间 */
  lastFailureAt?: Date | null
  /** 上次执行失败的错误信息 */
  lastErrorMessage?: string | null
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
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

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

// =================================================================
// 数据大小监控相关类型定义
// =================================================================

/** 数据大小信息接口 */
export interface DataSizeInfo {
  /** 对象数量 */
  count: number
  /** 内存大小（字节） */
  memorySize: number
  /** 序列化大小（字节） */
  serializedSize?: number
  /** 格式化的大小字符串 */
  formattedSize: string
  /** 平均单个对象大小 */
  averageItemSize: number
}

/** 数据大小统计接口 */
export interface DataSizeStats extends DataSizeInfo {
  /** 数据类型描述 */
  dataType: string
  /** 计算时间戳 */
  timestamp: number
  /** 是否为采样计算 */
  isSampled: boolean
}

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
  data: {
    id: string
    createdAt: Date
    executionDuration: number | null
    taskId: string
  }
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
    /** 数据大小信息 */
    dataSizeInfo?: DataSizeStats
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
    /** 数据大小对比信息 */
    dataSizeInfo?: {
      /** 过滤前的数据大小 */
      beforeFilter: DataSizeStats
      /** 过滤后的数据大小 */
      afterFilter: DataSizeStats
    }
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
    /** 筛选后的数据大小信息 */
    dataSizeInfo?: DataSizeStats
  }
}

// 5. 获取完整内容阶段
export interface FetchContentStartProgress extends BaseProgress {
  status: typeof TaskStatus.FETCH_CONTENT_START
}

export interface FetchContentCompleteProgress extends BaseProgress {
  status: typeof TaskStatus.FETCH_CONTENT_COMPLETE
  data?: {
    /** 完整内容数据大小信息 */
    dataSizeInfo: DataSizeStats
  }
}

// 6. AI 分析阶段
export interface AnalyzeStartProgress extends BaseProgress {
  status: typeof TaskStatus.ANALYZE_START
  data: {
    /** 待分析的链接数 */
    count: number
  }
}

export interface AnalyzeCompleteProgress extends BaseProgress {
  status: typeof TaskStatus.ANALYZE_COMPLETE
  data?: {
    /** 分析结果数据大小信息 */
    dataSizeInfo: DataSizeStats
  }
}

// 7. 通用信息
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
  | FetchContentStartProgress
  | FetchContentCompleteProgress
  | AnalyzeStartProgress
  | AnalyzeCompleteProgress
  | InfoProgress
