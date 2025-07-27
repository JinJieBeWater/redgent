import type { ChatMessage } from '@core/shared'

import { MarkdownRenderer } from './markdown'
import {
  MessageCreateTask,
  MessageShowAllTasks,
  MessageUpdateTask,
} from './message-tool'

export const MessageAssistant = ({ message }: { message: ChatMessage }) => {
  if (message.role !== 'assistant') {
    return null
  }

  const { parts } = message
  return (
    <>
      {parts.map((part, index) => {
        const { type } = part
        switch (type) {
          case 'step-start':
            return null
          case 'text':
            return <MarkdownRenderer key={index} content={part.text} />
          case 'file':
            return <MarkdownRenderer key={index} content="暂不支持文件" />
          case 'reasoning':
            return <MarkdownRenderer key={index} content="暂不支持 reasoning" />
          case 'source-document':
            return (
              <MarkdownRenderer
                key={index}
                content="暂不支持 source-document"
              />
            )
          case 'source-url':
            return (
              <MarkdownRenderer key={index} content="暂不支持 source-url" />
            )
          case 'tool-ShowAllTaskUI':
            return <MessageShowAllTasks key={index} part={part} />
          case 'tool-CreateTask':
            return <MessageCreateTask key={index} part={part} />
          case 'tool-UpdateTask':
            return <MessageUpdateTask key={index} part={part} />
          default:
            return (
              <MarkdownRenderer
                key={index}
                content={'未知的消息类型: ' + part.type}
              />
            )
        }
      })}
    </>
  )
}
