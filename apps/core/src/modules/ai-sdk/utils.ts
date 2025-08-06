/**
 * @fileoverview AI SDK 测试工具集
 * 提供可扩展的 Mock 响应系统，支持动态注册和管理测试响应处理器
 */

import type { ModelMessage } from 'ai'
import {
  LanguageModelV2Content,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider'
import { generateId } from 'ai'

import { TaskReport } from '@redgent/db'

import { TEST_PROMPTS } from './basic'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 响应处理器接口
 * 支持直接响应数据或响应生成函数两种形式
 */
interface ResponseHandler {
  /** 匹配函数，判断是否应该使用此处理器 */
  matcher: (prompt: ModelMessage[]) => boolean
  /** 响应数据或生成响应数据的函数 */
  response: string | (() => string)
}

// ============================================================================
// 预定义响应数据
// ============================================================================

/**
 * 预定义的 Mock 响应数据
 * 包含各种测试场景下需要的标准响应
 */
export const MOCK_RESPONSES = {
  /** 标准分析结果，符合 ReportContent 类型 */
  analysisResult: {
    title: '测试分析结果',
    content: {
      findings: [
        {
          elaboration: '详细分析了第一个重要趋势的影响和意义',
          supportingLinkIds: ['link-1', 'link-2'],
        },
        {
          elaboration: '基于Reddit讨论内容得出的市场观察结论',
          supportingLinkIds: ['link-2', 'link-3'],
        },
      ],
    },
  } satisfies Pick<TaskReport, 'title' | 'content'>,

  /** 默认任务创建确认消息 */
  defaultMessage:
    '好的，已为您创建定时任务，是否需要立即执行？' satisfies string,
} as const

// ============================================================================
// 响应处理器管理
// ============================================================================

/** 响应处理器注册表 */
const responseHandlers: ResponseHandler[] = []

/**
 * 注册响应处理器到全局注册表
 * @param handler 响应处理器配置
 */
function registerResponseHandler(handler: ResponseHandler): void {
  responseHandlers.push(handler)
}

/**
 * 查找匹配的响应处理器
 * @param prompt 提示消息数组
 * @returns 匹配的处理器或 undefined
 */
function findMatchingHandler(
  prompt: ModelMessage[],
): ResponseHandler | undefined {
  return responseHandlers.find(handler => handler.matcher(prompt))
}

/**
 * 便于测试文件扩展的响应处理器添加函数
 * @param matcher 匹配函数
 * @param response 响应数据或生成函数
 */
export function addCustomResponseHandler(
  matcher: (prompt: ModelMessage[]) => boolean,
  response: string | (() => string),
): void {
  registerResponseHandler({ matcher, response })
}

/**
 * 清除所有自定义处理器，保留默认处理器
 * 用于测试清理，确保测试间的隔离性
 */
export function clearCustomHandlers(): void {
  // 保留前3个默认处理器，移除后续添加的
  responseHandlers.splice(3)
}

// ============================================================================
// 消息处理工具函数
// ============================================================================

/**
 * 比较两个消息是否相等
 * 深度比较消息的角色和内容数组
 * @param firstMessage 第一个消息
 * @param secondMessage 第二个消息
 * @returns 是否相等
 */
export function compareMessages(
  firstMessage: ModelMessage,
  secondMessage: ModelMessage,
): boolean {
  if (firstMessage.role !== secondMessage.role) return false

  if (
    !Array.isArray(firstMessage.content) ||
    !Array.isArray(secondMessage.content)
  ) {
    return false
  }

  if (firstMessage.content.length !== secondMessage.content.length) {
    return false
  }

  for (let i = 0; i < firstMessage.content.length; i++) {
    const item1 = firstMessage.content[i]
    const item2 = secondMessage.content[i]

    if (item1.type !== item2.type) return false

    if (item1.type === 'file' && item2.type === 'file') {
      // 文件比较预留（如需要可实现具体逻辑）
    } else if (item1.type === 'text' && item2.type === 'text') {
      if (item1.text !== item2.text) return false
    } else if (item1.type === 'tool-result' && item2.type === 'tool-result') {
      if (item1.toolCallId !== item2.toolCallId) return false
    } else {
      return false
    }
  }

  return true
}

// ============================================================================
// 默认响应处理器注册
// ============================================================================

// 注册精确匹配的响应处理器
registerResponseHandler({
  matcher: prompt =>
    compareMessages(prompt.at(-1)!, TEST_PROMPTS.USER_NEW_TASK),
  response: MOCK_RESPONSES.defaultMessage,
})

registerResponseHandler({
  matcher: prompt =>
    compareMessages(prompt.at(-1)!, TEST_PROMPTS.ANALYZE_CONTENT),
  response: () => JSON.stringify(MOCK_RESPONSES.analysisResult),
})

// 注册分析内容的响应处理器（用于 generateObject）
registerResponseHandler({
  matcher: prompt => {
    const lastMessage = prompt.at(-1)
    if (!lastMessage || !Array.isArray(lastMessage.content)) return false

    const textContent =
      lastMessage.content.find(c => c.type === 'text')?.text || ''
    return textContent.includes('# Reddit 内容分析指令')
  },
  response: () => JSON.stringify(MOCK_RESPONSES.analysisResult),
})

// ============================================================================
// 主要导出函数
// ============================================================================

/**
 * 根据提示生成响应内容
 * 使用注册的处理器系统查找匹配的响应
 * @param prompt 提示消息数组
 * @returns 语言模型响应内容数组
 * @throws {Error} 当提示为空时抛出错误
 */
export const getResponseByPrompt = (
  prompt: ModelMessage[],
): LanguageModelV2Content[] => {
  if (!prompt.length) {
    throw new Error('No messages in prompt!')
  }

  // 查找匹配的响应处理器
  const handler = findMatchingHandler(prompt)

  if (handler) {
    const response =
      typeof handler.response === 'function'
        ? handler.response()
        : handler.response

    return [{ type: 'text', text: String(response) }]
  }

  // 默认兜底响应
  return [{ type: 'text', text: 'Unknown test prompt!' }]
}

/**
 * 根据提示生成流式响应块
 * 用于模拟流式AI响应，使用与 getResponseByPrompt 相同的处理器系统
 * @param prompt 提示消息数组
 * @returns 流式响应部分数组
 * @throws {Error} 当提示为空时抛出错误
 */
export const getResponseChunksByPrompt = (
  prompt: ModelMessage[],
): LanguageModelV2StreamPart[] => {
  if (!prompt.length) {
    throw new Error('No messages in prompt!')
  }

  // 使用相同的处理器系统查找匹配的响应
  const handler = findMatchingHandler(prompt)

  if (handler) {
    const response =
      typeof handler.response === 'function'
        ? handler.response()
        : handler.response

    // 将响应转换为流式格式
    const responseText = String(response)
    return [
      ...textToDeltas(responseText),
      {
        type: 'finish',
        finishReason: 'stop',
        usage: {
          inputTokens: Math.floor(responseText.length / 4),
          outputTokens: Math.floor(responseText.length / 3),
          totalTokens: Math.floor(responseText.length / 2.5),
        },
      },
    ]
  }

  // 默认兜底响应
  return [
    ...textToDeltas('Unknown test prompt!'),
    {
      type: 'finish',
      finishReason: 'stop',
      usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 },
    },
  ]
}

// ============================================================================
// 内部工具函数
// ============================================================================

/**
 * 将文本转换为流式响应增量
 * @param text 要转换的文本
 * @returns 流式响应部分数组
 */
const textToDeltas = (text: string): LanguageModelV2StreamPart[] => {
  const id = generateId()

  const deltas = text.split(' ').map(char => ({
    id,
    type: 'text-delta' as const,
    delta: `${char} `,
  }))

  return [{ id, type: 'text-start' }, ...deltas, { id, type: 'text-end' }]
}
