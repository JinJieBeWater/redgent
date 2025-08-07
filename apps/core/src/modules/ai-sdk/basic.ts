import type { ModelMessage } from 'ai'

export const TEST_PROMPTS: Record<string, ModelMessage> = {
  USER_NEW_TASK: {
    role: 'user',
    content: [{ type: 'text', text: '每天早上6点抓取reactjs生态圈的最新动态' }],
  },
  ANALYZE_CONTENT: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: '请分析以下Reddit内容并生成报告：\n\n测试内容数据',
      },
    ],
  },
  USER_THANKS: {
    role: 'user',
    content: [{ type: 'text', text: '谢谢' }],
  },
}
