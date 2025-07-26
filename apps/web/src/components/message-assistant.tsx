import type { UIDataTypes, UIMessage } from 'ai'

import type { APPUITools } from '@redgent/shared'

import { MarkdownRenderer } from './markdown'
import {
  MessageCreateTask,
  MessageListAllTasks,
  MessageUpdateTask,
} from './message-tool'

export const MessageAssistant = ({
  message,
}: {
  message: UIMessage<unknown, UIDataTypes, APPUITools>
}) => {
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
          case 'tool-listAllTasks':
            return <MessageListAllTasks key={index} part={part} />
          case 'tool-createTask':
            return <MessageCreateTask key={index} part={part} />
          case 'tool-updateTask':
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
