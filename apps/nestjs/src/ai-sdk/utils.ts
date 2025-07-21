import type {
  LanguageModelV2Content,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider'
import type { ModelMessage } from 'ai'
import { generateId } from 'ai'

import { TEST_PROMPTS } from './basic'

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
      // if (item1.image.toString() !== item2.image.toString()) return false;
      // if (item1.mimeType !== item2.mimeType) return false;
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

export const getResponseByPrompt = (
  prompt: ModelMessage[],
): LanguageModelV2Content[] => {
  const recentMessage = prompt.at(-1)

  if (!recentMessage) {
    throw new Error('No recent message found!')
  }

  if (compareMessages(recentMessage, TEST_PROMPTS.USER_NEW_TASK)) {
    return [
      {
        type: 'text',
        text: '好的，已为您创建定时任务，是否需要立即执行？',
      },
    ]
  } else if (compareMessages(recentMessage, TEST_PROMPTS.TOO_MANY_LINK)) {
    // 模拟对象生成 返回id数组
    const ids = Array.from({ length: 10 }, (_, i) => `"link-${i}"`)
    return [
      {
        type: 'text',
        text: `[${ids.join(',')}]`,
      },
    ]
  }
  return [{ type: 'text', text: 'Unknown test prompt!' }]
}

const textToDeltas = (text: string): LanguageModelV2StreamPart[] => {
  const id = generateId()

  const deltas = text.split(' ').map((char) => ({
    id,
    type: 'text-delta' as const,
    delta: `${char} `,
  }))

  return [{ id, type: 'text-start' }, ...deltas, { id, type: 'text-end' }]
}

export const getResponseChunksByPrompt = (
  prompt: ModelMessage[],
): LanguageModelV2StreamPart[] => {
  const recentMessage = prompt.at(-1)

  if (!recentMessage) {
    throw new Error('No recent message found!')
  }

  if (compareMessages(recentMessage, TEST_PROMPTS.USER_THANKS)) {
    return [
      ...textToDeltas('好的，已为您创建定时任务，是否需要立即执行？'),
      {
        type: 'finish',
        finishReason: 'stop',
        usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
      },
    ]
  }

  return [{ id: '6', type: 'text-delta', delta: 'Unknown test prompt!' }]
}
