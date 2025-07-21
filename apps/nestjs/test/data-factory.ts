/**
 * @fileoverview 测试数据工厂
 * 提供创建各种测试数据的工厂函数，避免在多个测试文件中重复定义
 */

import type { TaskConfig } from '@redgent/types/analysis-task'
import type {
  RedditLinkInfoUntrusted,
  RedditLinkWrapper,
  RedditListingResponse,
} from '@redgent/types/reddit'

import type { CommentNode } from '../src/reddit/reddit.service'

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
    createMockLink(`${prefix}-${i + 1}`, subreddit, {
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
      children: links.map((link) => ({ kind: 't3', data: link })),
    },
  }
}

// ============================================================================
// 评论数据工厂
// ============================================================================

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
  }
}

/**
 * 创建复杂的评论树结构
 * @param linkId 关联的链接ID
 * @returns 完整的链接内容对象（包含评论）
 */
export function createMockLinkWithComments(linkId: string) {
  return {
    content: createMockLink(linkId, 'test'),
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
export function createMockTaskConfig(
  overrides?: Partial<TaskConfig>,
): TaskConfig {
  return {
    id: 'task-1',
    name: 'Test Task',
    cron: '0 0 * * *',
    prompt: 'Test prompt for redgent',
    keywords: ['test'],
    subreddits: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    enableFiltering: true,
    llmModel: 'test-model',
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

  /** 完整的链接内容数据（包含评论） */
  completeLinkData: [
    createMockLinkWithComments('link-1'),
    createMockLinkWithComments('link-2'),
    createMockLinkWithComments('link-3'),
  ],

  /** 标准任务配置 */
  standardTask: createMockTaskConfig(),

  /** 禁用过滤的任务配置 */
  taskWithoutFiltering: createMockTaskConfig({ enableFiltering: false }),
} as const
