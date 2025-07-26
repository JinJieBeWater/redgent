/**
 * @file 定义 Reddit 子版块信息的核心类型。
 */

/**
 * 包含用于筛选和评估 Reddit 子版块的核心信息。
 * 该接口包含了反映子版块身份、主题、活跃度和安全性的字段。
 */
export interface SubredditInfo {
  /**
   * 子版块的唯一 ID (例如: "2fwo")。
   */
  id: string

  /**
   * 子版块的完整 API 名称 (例如: "t5_2fwo")。
   */
  name: string

  /**
   * 用于显示的名称，不含 "r/" 前缀 (例如: "programming")。
   */
  display_name: string

  /**
   * 带有 "r/" 前缀的完整显示名称 (例如: "r/programming")。
   */
  display_name_prefixed: string

  /**
   * 子版块的标题。
   */
  title: string

  /**
   * 指向该子版块的相对 URL (例如: "/r/programming/")。
   */
  url: string

  /**
   * 社区的订阅者总数，是衡量社区规模的关键指标。
   */
  subscribers: number

  /**
   * 简短的、面向公众的纯文本描述。
   */
  public_description: string

  /**
   * 侧边栏中的完整描述，为 Markdown 格式。
   */
  description: string

  /**
   * 指向社区图标的 URL。
   */
  community_icon: string

  /**
   * 指向���区头部图片的 URL。
   */
  header_img: string

  /**
   * 是否为 NSFW (Not Safe For Work) 内容。
   */
  over18: boolean

  /**
   * 是否被隔离。被隔离的社区通常包含有争议的内容。
   */
  quarantine: boolean

  /**
   * 社区的主要语言 (例如: "en")。
   */
  lang: string

  /**
   * 社区创建时间的 UTC 时间戳。
   */
  created_utc: number

  /**
   * 广告商分类，可以作为判断主题的参考。
   */
  advertiser_category?: string
}

export interface SubredditWrapper {
  kind: 't5'
  data: SubredditInfo
}
