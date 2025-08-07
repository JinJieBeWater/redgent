/**
 * 代表一个具体的分析发现或要点。
 */
export interface ReportContentFinding {
  /**
   * 对该要点的详细阐述和分析。
   * @example "根据多个热门帖子的讨论，投资者普遍认为，随着各大科技公司加码AI领域，上游的芯片制造商将持续受益..."
   */
  elaboration: string
  /**
   * 支持该发现的源帖子的 ID 列表。
   * @example ["12345", "67890"]
   */
  supportingLinkIds: string[]
}

// 官方社区常用写法
type Jsonifiable =
  | null
  | boolean
  | number
  | string
  | Jsonifiable[]
  | { [key: string]: Jsonifiable }

declare global {
  namespace PrismaJson {
    /** 任务配置 */
    type TaskPayload = Jsonifiable & {
      /** 通用关键词 */
      keywords: string[]

      /** 数据源配置 */
      dataSource: {
        /** reddit 相关 */
        reddit?: {
          subreddits?: string[]
        }
      }
    }

    type ReportContent = Jsonifiable & {
      /**
       * 具体的、分点的分析发现列表。
       */
      findings: ReportContentFinding[]
    }
  }
}

export {}
