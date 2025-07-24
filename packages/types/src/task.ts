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

/** 基础进度接口 */
interface BaseProgress {
  status: TaskProgressStatus
  message: string
}

// 1. 任务生命周期状态
export interface TaskStartProgress extends BaseProgress {
  status: typeof TaskProgressStatus.TASK_START
}

export interface TaskCompleteProgress extends BaseProgress {
  status: typeof TaskProgressStatus.TASK_COMPLETE
  data: {
    id: string
    createdAt: Date
    executionDuration: number | null
    taskId: string
  }
}

export interface TaskCancelProgress extends BaseProgress {
  status: typeof TaskProgressStatus.TASK_CANCEL
}

export interface TaskErrorProgress extends BaseProgress {
  status: typeof TaskProgressStatus.TASK_ERROR
  data: {
    error: Error
  }
}

// 2. 数据抓取阶段
export interface FetchStartProgress extends BaseProgress {
  status: typeof TaskProgressStatus.FETCH_START
}

export interface FetchCompleteProgress extends BaseProgress {
  status: typeof TaskProgressStatus.FETCH_COMPLETE
  data: {
    /** 本次抓取到的链接总数 */
    count: number
  }
}

// 3. 数据过滤阶段
export interface FilterStartProgress extends BaseProgress {
  status: typeof TaskProgressStatus.FILTER_START
}

export interface FilterCompleteProgress extends BaseProgress {
  status: typeof TaskProgressStatus.FILTER_COMPLETE
  data: {
    /** 过滤前的链接数 */
    originalCount: number
    /** 过滤后的新链接数 */
    uniqueCount: number
  }
}

// 4. 筛选阶段
export interface SelectStartProgress extends BaseProgress {
  status: typeof TaskProgressStatus.SELECT_START
}

export interface SelectCompleteProgress extends BaseProgress {
  status: typeof TaskProgressStatus.SELECT_COMPLETE
  data: {
    /** 过滤前的链接数 */
    originalCount: number
    /** 过滤后的新链接数 */
    uniqueCount: number
    /** 筛选后的链接数组 */
    links: { id: string; title: string; selftext: string | undefined }[]
  }
}

// 5. 获取完整内容阶段
export interface FetchContentStartProgress extends BaseProgress {
  status: typeof TaskProgressStatus.FETCH_CONTENT_START
}

export interface FetchContentCompleteProgress extends BaseProgress {
  status: typeof TaskProgressStatus.FETCH_CONTENT_COMPLETE
}

// 6. AI 分析阶段
export interface AnalyzeStartProgress extends BaseProgress {
  status: typeof TaskProgressStatus.ANALYZE_START
  data: {
    /** 待分析的链接数 */
    count: number
  }
}

export interface AnalyzeCompleteProgress extends BaseProgress {
  status: typeof TaskProgressStatus.ANALYZE_COMPLETE
}

// 7. 通用信息
export interface InfoProgress extends BaseProgress {
  status: typeof TaskProgressStatus.INFO
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
