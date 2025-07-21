import type { ModelMessage } from 'ai'

import { selectMostRelevantLinksPrompt } from './prompts'

export const TEST_PROMPTS: Record<string, ModelMessage> = {
  USER_NEW_TASK: {
    role: 'user',
    content: [{ type: 'text', text: '每天早上6点抓取reactjs生态圈的最新动态' }],
  },
  TOO_MANY_LINK: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: selectMostRelevantLinksPrompt(
          'Test prompt for redgent',
          Array.from({ length: 15 }, (_, i) => ({
            id: `link-${i}`,
            title: `link ${i}`,
            selftext: `Content of link ${i}`,
          })),
          10,
        ),
      },
    ],
  },
}
