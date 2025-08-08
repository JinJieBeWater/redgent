/**
 * @fileoverview 测试数据工厂
 * 提供创建各种测试数据的工厂函数，避免在多个测试文件中重复定义
 */

import { randomUUID } from 'crypto'

import type {
  CommentNode,
  RedditCommentInfoUntrusted,
  RedditCommentWrapper,
  RedditLinkInfoUntrusted,
  RedditLinkWrapper,
  RedditListingResponse,
} from '@redgent/shared'
import { Task, TaskReport } from '@redgent/db/client'

// ============================================================================
// Reddit 数据工厂
// ============================================================================

/**
 * 创建模拟的 Reddit 链接数据
 * @param id 链接ID
 * @param subreddit 子版块名称
 * @param overrides 可选的覆盖属性
 * @returns Reddit链接对象
 */
export function createMockLink(
  id: string,
  subreddit: string,
  overrides?: Partial<RedditLinkInfoUntrusted>,
): RedditLinkInfoUntrusted {
  return {
    id,
    title: `Title for ${id}`,
    selftext: `Content for ${id}`,
    author: 'test-author',
    author_fullname: 't2_test-author',
    created_utc: Date.now() / 1000,
    subreddit,
    subreddit_name_prefixed: `r/${subreddit}`,
    subreddit_subscribers: 1000,
    url: `https://www.reddit.com/r/${subreddit}/comments/${id}/`,
    is_video: false,
    over_18: false,
    permalink: `/r/${subreddit}/comments/${id}/`,
    score: 100,
    num_comments: 50,
    upvote_ratio: 0.9,
    num_crossposts: 1,
    thumbnail: 'self',
    archived: false,
    locked: false,
    ups: 100,
    ...overrides,
  }
}

/**
 * 批量创建多个模拟链接
 * @param count 创建数量
 * @param subreddit 子版块名称
 * @param prefix ID前缀，默认为 'link'
 * @returns 链接数组
 */
export function createMockLinks(
  count: number,
  subreddit: string = 'test',
  prefix: string = 'link',
): RedditLinkInfoUntrusted[] {
  return Array.from({ length: count }, (_, i) =>
    createMockLink(randomUUID(), subreddit, {
      title: `${prefix} ${i + 1}`,
      selftext: `Content of ${prefix} ${i + 1}`,
    }),
  )
}

/**
 * 创建用于测试链接筛选的大量链接数据
 * @param count 链接数量，默认为15（触发筛选的最小数量）
 * @returns 链接数组
 */
export function createTooManyLinks(
  count: number = 15,
): RedditLinkInfoUntrusted[] {
  return createMockLinks(count, 'test')
}

/**
 * 创建模拟的 Reddit API 响应
 * @param links 链接数据数组
 * @returns Reddit API 格式的响应对象
 */
export function createMockResponse(
  links: RedditLinkInfoUntrusted[],
): RedditListingResponse<RedditLinkWrapper> {
  return {
    kind: 'Listing',
    data: {
      after: 't3_xyz',
      before: null,
      dist: links.length,
      modhash: 'mock_modhash',
      geo_filter: null,
      children: links.map(link => ({ kind: 't3', data: link })),
    },
  }
}

// ============================================================================
// 评论数据工厂
// ============================================================================

/**
 * 创建模拟的 Reddit 评论数据（RedditCommentInfoUntrusted）
 * @param author 作者名
 * @param body 评论内容
 * @param overrides 可选的覆盖属性
 * @returns Reddit评论对象
 */
export function createMockRedditComment(
  author: string,
  body: string,
  overrides?: Partial<RedditCommentInfoUntrusted>,
): RedditCommentInfoUntrusted {
  return {
    subreddit_id: 't5_test',
    approved_at_utc: null,
    author_is_blocked: false,
    comment_type: null,
    awarders: [],
    mod_reason_by: null,
    banned_by: null,
    author_flair_type: 'text',
    total_awards_received: 0,
    subreddit: 'test',
    author_flair_template_id: null,
    likes: null,
    replies: '',
    user_reports: [],
    saved: false,
    id: randomUUID(),
    banned_at_utc: null,
    mod_reason_title: null,
    gilded: 0,
    archived: false,
    collapsed_reason_code: null,
    no_follow: true,
    author,
    can_mod_post: false,
    created_utc: Date.now() / 1000,
    send_replies: true,
    parent_id: 't3_test',
    score: 1,
    author_fullname: `t2_${author}`,
    approved_by: null,
    mod_note: null,
    all_awardings: [],
    body,
    edited: false,
    top_awarded_type: null,
    author_flair_css_class: null,
    name: `t1_${randomUUID()}`,
    is_submitter: false,
    downs: 0,
    author_flair_richtext: [],
    author_patreon_flair: false,
    body_html: `&lt;div class="md"&gt;&lt;p&gt;${body}&lt;/p&gt;&lt;/div&gt;`,
    removal_reason: null,
    collapsed: false,
    link_id: 't3_test',
    stickied: false,
    author_premium: false,
    can_gild: false,
    gildings: {},
    unrepliable_reason: null,
    author_flair_text_color: null,
    score_hidden: false,
    permalink: `/r/test/comments/test/_/${randomUUID()}/`,
    subreddit_type: 'public',
    locked: false,
    report_reasons: null,
    created: Date.now() / 1000,
    author_flair_text: null,
    treatment_tags: [],
    collapsed_because_crowd_control: null,
    subreddit_name_prefixed: 'r/test',
    controversiality: 0,
    depth: 0,
    author_flair_background_color: null,
    collapsed_reason: null,
    associated_award: null,
    ups: 1,
    distinguished: null,
    mod_reports: [],
    num_reports: null,
    ...overrides,
  }
}

/**
 * 创建带有嵌套回复的评论数据
 * @param author 主评论作者
 * @param body 主评论内容
 * @param nestedComments 嵌套的子评论数组
 * @returns 带有回复的评论对象
 */
export function createMockRedditCommentWithReplies(
  author: string,
  body: string,
  nestedComments: RedditCommentInfoUntrusted[] = [],
): RedditCommentInfoUntrusted {
  const comment = createMockRedditComment(author, body)

  if (nestedComments.length > 0) {
    comment.replies = {
      kind: 'Listing',
      data: {
        after: null,
        before: null,
        dist: nestedComments.length,
        modhash: 'mock_modhash',
        geo_filter: null,
        children: nestedComments.map(nested => ({
          kind: 't1',
          data: nested,
        })) as RedditCommentWrapper[],
      },
    }
  }

  return comment
}

/**
 * 批量创建简单评论数组
 * @param count 评论数量
 * @param prefix 作者名前缀，默认为 'user'
 * @returns 评论数组
 */
export function createMockRedditComments(
  count: number,
  prefix: string = 'user',
): RedditCommentInfoUntrusted[] {
  return Array.from({ length: count }, (_, i) =>
    createMockRedditComment(`${prefix}${i + 1}`, `This is comment ${i + 1}`),
  )
}

/**
 * 创建模拟的评论节点
 * @param author 作者名
 * @param body 评论内容
 * @param replies 子评论数组
 * @returns 评论节点
 */
export function createMockComment(
  author: string,
  body: string,
  replies: CommentNode[] = [],
): CommentNode {
  return {
    author,
    body,
    replies,
    ups: 0,
  }
}

/**
 * 创建复杂的评论树结构
 * @param linkId 关联的链接ID
 * @returns 完整的链接内容对象（包含评论）
 */
export function createMockLinkWithComments(linkId?: string) {
  const id = linkId || randomUUID()
  return {
    content: createMockLink(id, 'test'),
    comment: [
      createMockComment('user1', 'This is comment 1', [
        createMockComment('user1_1', 'Child comment 1.1', [
          createMockComment('user1_1_1', 'Grandchild comment 1.1.1'),
        ]),
        createMockComment('user1_2', 'Child comment 1.2'),
      ]),
    ],
  }
}

// ============================================================================
// 任务配置工厂
// ============================================================================

/**
 * 创建模拟的任务配置
 * @param overrides 可选的覆盖属性
 * @returns 任务配置对象
 */
export function createMockTaskConfig(overrides?: Partial<Task>): Task {
  return {
    id: randomUUID(),
    name: 'React 生态',
    scheduleType: 'cron',
    scheduleExpression: '0 0 * * *',
    prompt: '每天早上6点抓取reactjs生态圈的最新动态',
    payload: {
      keywords: ['react', 'reactjs'],
      dataSource: {
        reddit: {
          subreddits: ['react', 'reactjs'],
        },
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    enableCache: true,
    ...overrides,
  }
}

/**
 * 创建模拟的任务报告数据
 * @param overrides 可选的覆盖属性
 * @returns 任务报告数据
 */
export function createMockTaskReport(
  overrides?: Partial<TaskReport>,
): TaskReport {
  return {
    id: randomUUID(),
    title: 'Test Report',
    content: {
      findings: [
        {
          elaboration: 'Test elaboration',
          supportingLinkIds: ['t3_test', 't3_test2'],
        },
      ],
    },
    executionDuration: 1000,
    taskId: randomUUID(),
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================================================
// 预设数据组合
// ============================================================================

/**
 * 预设的测试数据组合
 * 包含常用的测试场景数据
 */
export const TEST_DATA_PRESETS = {
  /** 标准的少量链接（不触发筛选） */
  fewLinks: createMockLinks(2, 'test'),

  /** 大量链接（触发筛选） */
  manyLinks: createTooManyLinks(15),

  /** 标准任务配置 */
  standardTask: createMockTaskConfig(),

  /** 禁用过滤的任务配置 */
  taskWithoutFiltering: createMockTaskConfig({ enableCache: false }),

  /** 简单的 Reddit 评论数据 */
  simpleRedditComments: createMockRedditComments(2),

  /** 复杂的嵌套 Reddit 评论数据 */
  nestedRedditComments: [
    createMockRedditCommentWithReplies('user1', 'Parent comment 1', [
      createMockRedditComment('user1_1', 'Child comment 1.1'),
      createMockRedditCommentWithReplies('user1_2', 'Child comment 1.2', [
        createMockRedditComment('user1_2_1', 'Grandchild comment 1.2.1'),
      ]),
    ]),
    createMockRedditComment('user2', 'Parent comment 2'),
  ],
} as const
