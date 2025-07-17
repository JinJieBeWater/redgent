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
