/* eslint-disable @typescript-eslint/no-explicit-any */
export const RedditTypeEnum = {
  /** Comment */
  t1: 't1',
  /** Account */
  t2: 't2',
  /** Link */
  t3: 't3',
  /** Message */
  t4: 't4',
  /** Subreddit */
  t5: 't5',
  /** Award */
  t6: 't6',
} as const

export type RedditType = (typeof RedditTypeEnum)[keyof typeof RedditTypeEnum]

/**
 * Reddit视频媒体资源
 * 由 AI 生成
 */
export interface RedditVideoUntrusted {
  /** 视频比特率（千比特/秒） */
  bitrate_kbps?: number
  /** 视频回退URL（MP4格式，最可靠的资源） */
  fallback_url: string
  /** DASH格式视频流URL（自适应流媒体） */
  dash_url: string
  /** HLS格式视频流URL（苹果流媒体协议） */
  hls_url: string
  /** 视频时长（秒） */
  duration: number
  /** 视频高度（像素） */
  height: number
  /** 视频宽度（像素） */
  width: number
  /** 是否为GIF格式 */
  is_gif: boolean
  /** 转码状态（"completed"表示已完成） */
  transcoding_status: string
}

/**
 * Reddit帖子数据模型
 *
 * 注意：所有时间戳均为Unix时间（UTC秒数）
 * 由 AI 生成
 */
export interface RedditLinkInfoUntrusted {
  /**
   * 核心标识符
   */
  id: string
  /** 帖子标题（用户可见的主要内容） */
  title: string
  /** 发帖作者用户名 */
  author: string
  /** 作者完整ID（格式：t2_xxxxxxxx） */
  author_fullname: string
  /** 创建时间戳（UTC秒数） */
  created_utc: number

  /**
   * 版块信息
   */
  /** 所属版块名称（小写，无前缀） */
  subreddit: string
  /** 带前缀的版块名称格式：r/law） */
  subreddit_name_prefixed: string
  /** 版块订阅人数（用于热度分析） */
  subreddit_subscribers: number

  /**
   * 内容元数据
   */
  /** 完整URL（指向内容源） */
  url: string
  /** 是否为视频帖子 */
  is_video: boolean
  /** 是否包含NSFW内容 */
  over_18: boolean
  /** 帖子永久链接路径（需拼接域名） */
  permalink: string
  /** 帖子正文文本（文本帖子才有值） */
  selftext: string

  /**
   * 互动指标
   */
  /** 帖子得分（赞数 - 踩数） */
  score: number
  /** 评论总数 */
  num_comments: number
  /** 赞数 */
  ups: number
  /** 赞踩比（0.0 - 1.0） */
  upvote_ratio: number
  /** 跨帖子分享次数 */
  num_crossposts: number

  /**
   * 分类标签
   */
  /** 链接标签文本（用户设置的分类） */
  link_flair_text?: string
  /** 链接标签背景色（十六进制代码） */
  link_flair_background_color?: string

  /**
   * 媒体资源
   */
  /** 缩略图URL（可能为"self"或"default"） */
  thumbnail: string
  /** 预览图信息 */
  preview?: {
    images: Array<{
      source: {
        url: string
        width: number
        height: number
      }
    }>
  }
  /** 媒体资源对象 */
  media?: {
    reddit_video?: RedditVideoUntrusted
  }

  /**
   * 系统状态
   */
  /** 是否已存档（存档后无法投票/评论） */
  archived: boolean
  /** 是否被锁定（禁止新评论） */
  locked: boolean
  /** 是否被删除 */
  removed?: boolean
}

export interface RedditLinkWrapper {
  /** 帖子类型标识 */
  kind: typeof RedditTypeEnum.t3
  /** 帖子数据 */
  data: RedditLinkInfoUntrusted
}

/**
 * Reddit列表响应数据
 */
export interface RedditCommonList<T> {
  after: string | null
  before: string | null
  dist: number | null
  modhash: string
  geo_filter: string | null
  children: T[]
}

/**
 * 完整API响应类型（用于解析Reddit API返回）
 */
export interface RedditListingResponse<T> {
  kind: 'Listing'
  data: RedditCommonList<T>
}

/**
 * Reddit访问令牌响应类型
 */
export interface RedditAccessTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export const RedditSort = {
  Best: 'best',
  Hot: 'hot',
  New: 'new',
  Top: 'top',
  Rising: 'rising',
} as const

export type RedditSort = (typeof RedditSort)[keyof typeof RedditSort]

/**
 * 由 AI 生成 Reddit 帖子评论数据结构 不可信
 */
export interface RedditCommentInfoUntrusted {
  subreddit_id: string
  approved_at_utc: number | null
  author_is_blocked: boolean
  comment_type: string | null
  awarders: any[]
  mod_reason_by: string | null
  banned_by: string | null
  author_flair_type: string
  total_awards_received: number
  subreddit: string
  author_flair_template_id: string | null
  likes: boolean | null
  replies: '' | RedditListingResponse<RedditCommentWrapper>
  user_reports: any[]
  saved: boolean
  id: string
  banned_at_utc: number | null
  mod_reason_title: string | null
  gilded: number
  archived: boolean
  collapsed_reason_code: string | null
  no_follow: boolean
  author: string
  can_mod_post: boolean
  created_utc: number
  send_replies: boolean
  parent_id: string
  score: number
  author_fullname: string
  removal_reason: string | null
  approved_by: string | null
  mod_note: string | null
  all_awardings: any[]
  body: string
  edited: boolean | number
  top_awarded_type: string | null
  author_flair_css_class: string | null
  name: string
  is_submitter: boolean
  downs: number
  author_flair_richtext: any[]
  author_patreon_flair: boolean
  body_html: string
  gildings: Record<string, any>
  collapsed_reason: string | null
  distinguished: string | null
  associated_award: string | null
  stickied: boolean
  author_premium: boolean
  can_gild: boolean
  link_id: string
  unrepliable_reason: string | null
  author_flair_text_color: string | null
  score_hidden: boolean
  permalink: string
  subreddit_type: string
  locked: boolean
  report_reasons: string | null
  created: number
  author_flair_text: string | null
  treatment_tags: any[]
  collapsed: boolean
  subreddit_name_prefixed: string
  controversiality: number
  depth: number
  author_flair_background_color: string | null
  collapsed_because_crowd_control: string | null
  mod_reports: any[]
  num_reports: number | null
  ups: number
}

export interface RedditCommentWrapper {
  kind: typeof RedditTypeEnum.t1
  data: RedditCommentInfoUntrusted
}

export type RedditCommentResponse = [
  RedditListingResponse<RedditLinkWrapper>,
  RedditListingResponse<RedditCommentWrapper>,
]
