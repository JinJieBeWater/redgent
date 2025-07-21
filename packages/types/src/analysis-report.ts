/**
 * @file 定义 AI 分析报告的数据结构
 */

/**
 * 代表一个具体的分析发现或要点。
 */
export interface ReportContentFinding {
  /**
   * 发现的要点总结，类似小标题。
   * @example "市场对AI芯片的需求持续增长"
   */
  point: string
  /**
   * 对该要点的详细阐述和分析。
   * @example "根据多个热门帖子的讨论，投资者普遍认为，随着各大科技公司加码AI领域，上游的芯片制造商将持续受益..."
   */
  elaboration: string
  /**
   * 支持该发现的源帖子的 ID 列表。
   * @example ["12345", "67890"]
   */
  supportingPostIds: string[]
}

// 官方社区常用写法
type Jsonifiable =
  | null
  | boolean
  | number
  | string
  | Jsonifiable[]
  | { [key: string]: Jsonifiable }

/**
 * 代表整个 AI 生成的分析报告。
 * 这是 AI SDK `generateObject` 功能最终应该生成的对象结构。
 */
export type ReportContent = Jsonifiable & {
  /**
   * 报告的整体标题。
   */
  title: string
  /**
   * 对所有分析体现的总体情况。
   */
  overallSummary: string
  /**
   * 具体的、分点的分析发现列表。
   */
  findings: ReportContentFinding[]
}

/**
 * 分析结果在数据库中的存储模型。
 */
export interface ReportModel {
  /** 结果的唯一标识符 */
  id: string
  /** 关联的任务ID */
  taskId: string
  /** 创建时间 */
  createdAt: Date
  /** AI 生成的原始报告数据 */
  content: ReportContent
}
